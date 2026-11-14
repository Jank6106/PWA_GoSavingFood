import type { FoodCategory } from '../shared/types/customer.types';
import type {
  FinderConstraints,
  FinderInput,
  FinderResponse,
  FinderResult,
} from '../shared/types/finder.types';

/**
 * Loại bỏ dấu tiếng Việt để so khớp chuỗi không phân biệt dấu
 */
export function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuyển đổi Date sang giờ và ngày tại Việt Nam (UTC+7) một cách deterministic
 */
export function getVietnamTime(date: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  totalMinutes: number; // 0..1439
} {
  // UTC+7 offset = 7 * 60 * 60 * 1000 = 25,200,000 ms
  const vnEpoch = date.getTime() + 7 * 60 * 60 * 1000;
  const d = new Date(vnEpoch);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hours = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const totalMinutes = hours * 60 + minutes;

  return { year, month, day, hours, minutes, dateStr, timeStr, totalMinutes };
}

/**
 * Phân tích chuỗi thời gian HH:mm thành số phút tính từ đầu ngày
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  if (parts[0] < 0 || parts[0] > 23 || parts[1] < 0 || parts[1] > 59) return null;
  return parts[0] * 60 + parts[1];
}

/**
 * Tính khoảng cách (km) giữa 2 tọa độ theo công thức Haversine
 * coord: [longitude, latitude]
 */
export function calculateDistanceKm(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Lấy nhãn tiếng Việt tương ứng cho danh mục món ăn
 */
export function getCategoryLabel(category: FoodCategory): string {
  switch (category) {
    case 'bakery':
      return 'Bánh ngọt & Bánh mì';
    case 'meat':
      return 'Món mặn & Cơm nóng';
    case 'vegetarian':
      return 'Món chay & Thực dưỡng';
    case 'beverage':
      return 'Đồ uống & Trà cà phê';
    case 'seafood':
      return 'Hải sản';
    case 'raw_food':
      return 'Rau củ & Nông sản';
    case 'other':
      return 'Khác';
    default:
      return 'Tất cả';
  }
}

/**
 * Phân tích chuỗi số tiền Việt Nam (35k, 100k, 50.000đ, 100 nghìn, 1,5 triệu...) thành số nguyên VND
 */
export function parseVnCurrency(rawNum: string, unit?: string): number | null {
  const u = removeDiacritics((unit || '').toLowerCase().trim());
  let baseNum: number;

  // Nếu đơn vị là triệu/trieu/tr hoặc k/nghin và có số thập phân như 1,5 hoặc 1.5
  if ((u.includes('trieu') || u === 'tr' || u === 'k') && /^\d+[.,]\d{1,3}$/.test(rawNum)) {
    baseNum = parseFloat(rawNum.replace(',', '.'));
  } else {
    baseNum = parseFloat(rawNum.replace(/[.,]/g, ''));
  }

  if (isNaN(baseNum) || !Number.isFinite(baseNum) || baseNum <= 0) return null;

  if (u === 'k') return Math.round(baseNum * 1000);
  if (u.includes('nghin') || u.includes('ngan') || u.includes('ngin')) return Math.round(baseNum * 1000);
  if (u.includes('trieu') || u === 'tr') return Math.round(baseNum * 1000000);

  if (baseNum >= 1000) return Math.round(baseNum);
  return Math.round(baseNum);
}

/**
 * Trích xuất các tiêu chí tìm kiếm từ câu truy vấn tiếng Việt
 * Giới hạn tối đa 400 ký tự đầu vào, cảnh báo rõ ràng khi constraint vượt ngưỡng hoặc không hiểu
 */
export function parseFinderQuery(query: string): {
  constraints: FinderConstraints;
  warnings: string[];
} {
  const boundedQuery = query.length > 400 ? query.slice(0, 400) : query;
  const trimmed = boundedQuery.trim();
  const warnings: string[] = [];
  const preferences: string[] = [];

  if (query.length > 400) {
    warnings.push('Câu truy vấn vượt quá 400 ký tự và đã được cắt ngắn.');
  }

  if (!trimmed) {
    warnings.push(
      "Vui lòng nhập yêu cầu tìm kiếm (ví dụ: 'món mặn dưới 35k', '2 người 100k', 'bánh dưới 50.000đ')."
    );
    return {
      constraints: {
        maxBudget: null,
        people: 1,
        category: null,
        area: null,
        pickupBefore: null,
        preferences: [],
      },
      warnings,
    };
  }

  const norm = removeDiacritics(trimmed.toLowerCase());

  // 1. Phân tích số người (1..20)
  let people = 1;
  const peopleMatch = norm.match(/(?:cho\s+)?(\d+)\s*(?:nguoi|pax|khach|suat|phan)\b/);
  if (peopleMatch) {
    const rawVal = parseInt(peopleMatch[1], 10);
    if (rawVal === 0) {
      people = 0;
      warnings.push('Số người không hợp lệ (hệ thống chỉ hỗ trợ từ 1 đến 20 người).');
    } else if (rawVal > 20) {
      people = 20;
      warnings.push('Số người không hợp lệ (hệ thống chỉ hỗ trợ tối đa 20 người).');
    } else {
      people = rawVal;
    }
  }

  // 2. Phân tích khung giờ nhận trước (pickupBefore: HH:mm)
  let pickupBefore: string | null = null;
  const timeMatch = norm.match(
    /(?:nhan\s+|lay\s+)?truoc\s*(\d{1,2})(?:[h:p](\d{2})?|\s*h(?:g|io)?|\b)/
  );
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      pickupBefore = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    } else {
      warnings.push('Khung giờ nhận yêu cầu không hợp lệ (phải từ 00:00 đến 23:59).');
    }
  }

  // 3. Phân tích ngân sách tối đa (maxBudget)
  let maxBudget: number | null = null;
  const queryWithoutPeople = norm.replace(/(?:cho\s+)?\d+\s*(?:nguoi|pax|khach|suat|phan)\b/g, '');

  const budgetPrefixMatch = queryWithoutPeople.match(
    /(?:duoi|<(?!=)|<=|tam|khoang|toi da)\s*([\d.,]+)\s*(k|nghin|ngan|ngin|trieu|tr|d|vnd)?\b/
  );
  const budgetUnitMatch = queryWithoutPeople.match(
    /(\d+(?:[.,]\d{3})*|\d+(?:[.,]\d{1,3})?)\s*(k|nghin|ngan|ngin|trieu|tr|d|vnd)\b/
  );
  const budgetRawMatch = queryWithoutPeople.match(/\b(\d{4,8})\b/);

  const budgetCandidate = budgetPrefixMatch || budgetUnitMatch;
  if (budgetCandidate) {
    const parsed = parseVnCurrency(budgetCandidate[1], budgetCandidate[2]);
    if (parsed !== null) {
      if (parsed > 50_000_000) {
        maxBudget = 50_000_000;
        warnings.push('Ngân sách tìm kiếm vượt quá hạn mức tối đa cho phép (50.000.000đ).');
      } else if (parsed <= 0) {
        maxBudget = 0;
        warnings.push('Ngân sách tìm kiếm không hợp lệ.');
      } else {
        maxBudget = parsed;
      }
    }
  } else if (budgetRawMatch) {
    const parsed = parseVnCurrency(budgetRawMatch[1]);
    if (parsed !== null && parsed >= 1000 && parsed <= 50_000_000) {
      maxBudget = parsed;
    }
  }

  // 4. Phân tích danh mục (category) chuẩn theo repo:
  // Khớp theo token/phrase boundaries \b để không dính ngàn->gà, combo->bò, dotcom->cơm
  let category: Exclude<FoodCategory, 'all'> | null = null;
  if (/\b(?:chay|thuc duong|vegetarian)\b/.test(norm)) {
    category = 'vegetarian';
  } else if (/\b(?:do uong|thuc uong|nuoc uong|ca phe|cafe|coffee|tra sua|tra|sinh to|smoothie|beverage|juice|nuoc ep)\b/.test(norm)) {
    category = 'beverage';
  } else if (/\b(?:banh|bread|cake|croissant|bakery|su kem|pate)\b/.test(norm)) {
    category = 'bakery';
  } else if (/\b(?:hai san|seafood|mon ca|thit ca|ca bien|ca hoi|ca thu|tom|muc|cua|ghe)\b/.test(norm)) {
    category = 'seafood';
  } else if (/\b(?:rau cu|trai cay|hoa qua|nong san|raw food)\b/.test(norm)) {
    category = 'raw_food';
  } else if (/\b(?:mon man|do man|an man|man|thit|com|bun|pho|mon nong|ga|bo|heo)\b/.test(norm)) {
    category = 'meat';
  }

  // 5. Phân tích khu vực (area)
  // Loại bỏ generic prefix khu/khu vực sau quanh/gần, không cắt actual địa danh
  let area: string | null = null;
  const areaMatch = trimmed.match(
    /(?:quanh|khu vực|khu|gần|ở|tại)\s+([A-Za-zÀ-ỹ0-9\s]+?)(?:\s+(?:nhận|truoc|trước|dưới|duoi|không|khong|\d+|gia|giá|cho|tối|an no|ăn no|được|duoc)|$)/i
  );
  if (areaMatch) {
    let rawArea = areaMatch[1].replace(/[,.;?!]+$/, '').trim();
    rawArea = rawArea.replace(
      /^(?:khu\s+vực|khu)\s+(?![đd]ô\s+thị|[đd]o\s+thi|[cch]ế\s+xuất|[cc]ông\s+nghiệp)/i,
      ''
    ).trim();
    if (rawArea.length >= 2) {
      area = rawArea.slice(0, 100);
    }
  }

  // 6. Phân tích sở thích, chế độ ăn, dị ứng & tạo cảnh báo an toàn
  const isSpicyFree = /\b(?:khong cay|khong an cay|ko cay|it cay)\b/.test(norm);
  const isAllergicOrDiet = /\b(?:di ung|kieng|an kieng)\b/.test(norm);
  const isHungry = /\b(?:an no|no bung|no)\b/.test(norm);

  if (isSpicyFree) {
    preferences.push('không cay');
  }
  if (isAllergicOrDiet) {
    preferences.push('dị ứng/kiêng');
  }
  if (isHungry) {
    preferences.push('ăn no');
  }

  if (isSpicyFree || isAllergicOrDiet) {
    warnings.push(
      'Lưu ý: GoSavingFood là túi bất ngờ, thành phần cụ thể và độ cay/dị ứng phụ thuộc vào từng cửa hàng và chưa được hệ thống xác minh độc lập. Vui lòng xác nhận trực tiếp với cửa hàng khi nhận.'
    );
  }

  if (isHungry) {
    warnings.push(
      'Lưu ý: Mỗi túi bất ngờ có định lượng ngẫu nhiên do cửa hàng chuẩn bị, số túi đề xuất theo số người không đảm bảo khẩu phần đủ no cho từng cá nhân.'
    );
  }

  // 7. Kiểm tra từ khóa cụ thể không được hỗ trợ (ngoài danh mục chuẩn)
  let residual = norm;
  if (category) {
    residual = residual.replace(
      /\b(?:chay|thuc duong|vegetarian|do uong|thuc uong|nuoc uong|ca phe|cafe|coffee|tra sua|tra|sinh to|smoothie|beverage|juice|nuoc ep|banh|bread|cake|croissant|bakery|su kem|pate|hai san|seafood|mon ca|thit ca|ca bien|ca hoi|ca thu|tom|muc|cua|ghe|rau cu|trai cay|hoa qua|nong san|raw food|mon man|do man|an man|man|thit|com|bun|pho|mon nong|ga|bo|heo)\b/g,
      ''
    );
  }
  if (area) {
    residual = residual.replace(new RegExp(removeDiacritics(area.toLowerCase()), 'g'), '');
  }
  residual = residual
    .replace(/\b(?:quanh|khu vuc|khu|gan|o|tai)\b/g, '')
    .replace(/(?:cho\s+)?\d+\s*(?:nguoi|pax|khach|suat|phan)\b/g, '')
    .replace(/(?:nhan\s+|lay\s+)?truoc\s*\d{1,2}(?:[h:p]\d{2}?|\s*h(?:g|io)?|\b)/g, '')
    .replace(/(?:duoi|<(?!=)|<=|tam|khoang|toi da)\s*[\d.,]+\s*(?:k|nghin|ngan|ngin|trieu|tr|d|vnd)?\b/g, '')
    .replace(/\d+(?:[.,]\d{3})*\s*(?:k|nghin|ngan|ngin|trieu|tr|d|vnd)\b/g, '')
    .replace(/\b(?:khong cay|khong an cay|ko cay|it cay|di ung|kieng|an kieng|an no|no bung|no)\b/g, '')
    .replace(/\b(?:toi|muon|tim|co|nao|va|cho|voi|hom|nay|gi|giup|can|du|don|an|ngon|gia|re|phu|hop|tu|den|hang|tui|bat|ngo|duoc|khong|ngan sach)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

  if (residual.length >= 3) {
    warnings.push(
      `Yêu cầu chứa từ khóa món cụ thể ("${residual}") ngoài các danh mục định sẵn. GoSavingFood chỉ phân phối túi bất ngờ theo danh mục và không đảm bảo có đúng món này.`
    );
  }

  return {
    constraints: {
      maxBudget,
      people,
      category,
      area,
      pickupBefore,
      preferences,
    },
    warnings,
  };
}

/**
 * Lọc danh mục túi theo bộ ràng buộc FinderConstraints đã chuẩn hoá
 */
export function filterCatalogWithConstraints(
  constraints: FinderConstraints,
  input: FinderInput,
  mode: 'local' | 'ai',
  extraWarnings: string[] = []
): FinderResponse {
  const boundedQuery = input.query.length > 400 ? input.query.slice(0, 400) : input.query;
  const warnings: string[] = [...extraWarnings];

  if (
    constraints.preferences.some((p) => p.includes('cay') || p.includes('dị ứng') || p.includes('kiêng')) &&
    !warnings.some((w) => w.includes('chưa được hệ thống xác minh độc lập'))
  ) {
    warnings.push(
      'Lưu ý: GoSavingFood là túi bất ngờ, thành phần cụ thể và độ cay/dị ứng phụ thuộc vào từng cửa hàng và chưa được hệ thống xác minh độc lập. Vui lòng xác nhận trực tiếp với cửa hàng khi nhận.'
    );
  }

  if (
    constraints.preferences.some((p) => p.includes('no')) &&
    !warnings.some((w) => w.includes('khẩu phần đủ no'))
  ) {
    warnings.push(
      'Lưu ý: Mỗi túi bất ngờ có định lượng ngẫu nhiên do cửa hàng chuẩn bị, số túi đề xuất theo số người không đảm bảo khẩu phần đủ no cho từng cá nhân.'
    );
  }

  if (constraints.people <= 0 || constraints.people > 20) {
    return {
      mode,
      constraints,
      results: [],
      warnings: warnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0),
    };
  }

  // Nếu câu truy vấn chỉ chứa từ khóa món cụ thể không khớp danh mục nào (ví dụ "pizza pepperoni")
  const normQuery = removeDiacritics(boundedQuery.toLowerCase());
  const isSpecificDishOnly =
    !constraints.category &&
    !constraints.area &&
    constraints.maxBudget === null &&
    !constraints.pickupBefore &&
    normQuery.trim().length >= 3 &&
    !normQuery.includes('tat ca') &&
    !normQuery.includes('ngan sach');

  if (isSpecificDishOnly) {
    if (!warnings.some((w) => w.includes('ngoại các danh mục định sẵn') || w.includes('từ khóa món cụ thể'))) {
      warnings.push(
        `Yêu cầu chứa từ khóa món cụ thể ("${boundedQuery.trim()}") ngoài các danh mục định sẵn. GoSavingFood chỉ phân phối túi bất ngờ theo danh mục và không đảm bảo có đúng món này.`
      );
    }
    return {
      mode,
      constraints,
      results: [],
      warnings: warnings.filter((w): w is string => typeof w === 'string' && w.trim().length > 0),
    };
  }

  const people = constraints.people;
  const vnTime = getVietnamTime(input.now);
  const matchedResults: FinderResult[] = [];

  for (const bag of input.bags) {
    const merchant = input.merchants.find((m) => m.id === bag.merchantId);

    // 1. Quán phải xác minh được là đang mở cửa và active trong catalogue hiện tại
    if (!merchant || merchant.status !== 'active' || !merchant.isOpen) {
      continue;
    }

    // 2. Túi không khả dụng, đã archive, inactive hoặc expired
    if (!bag.isAvailable || bag.status === 'archived' || bag.status === 'inactive' || bag.status === 'expired') {
      continue;
    }

    // 3. Kiểm tra tính hợp lệ của giá và tồn kho
    if (
      typeof bag.discountPrice !== 'number' ||
      !Number.isFinite(bag.discountPrice) ||
      isNaN(bag.discountPrice) ||
      bag.discountPrice <= 0
    ) {
      continue;
    }
    if (
      typeof bag.originalPrice !== 'number' ||
      !Number.isFinite(bag.originalPrice) ||
      isNaN(bag.originalPrice) ||
      bag.originalPrice < 0
    ) {
      continue;
    }
    if (
      typeof bag.quantity !== 'number' ||
      !Number.isFinite(bag.quantity) ||
      isNaN(bag.quantity) ||
      bag.quantity < people ||
      bag.quantity <= 0
    ) {
      continue;
    }

    // 4. Kiểm tra HSD (expiryDate / expiresAt)
    if (bag.expiryDate) {
      if (bag.expiryDate < vnTime.dateStr) {
        continue;
      }
    }
    if (bag.expiresAt) {
      const expMs = new Date(bag.expiresAt).getTime();
      const nowMs = (input.now ?? new Date()).getTime();
      if (!isNaN(expMs) && expMs < nowMs) {
        continue;
      }
    }

    // 5. Hết giờ nhận hôm nay (đặc biệt shelf-life có HSD tương lai nhưng pickup hôm nay đã qua)
    const pickupEndMinutes = parseTimeToMinutes(bag.pickupEnd);
    if (pickupEndMinutes !== null && vnTime.totalMinutes > pickupEndMinutes) {
      continue;
    }

    // 6. Kiểm tra giới hạn nhận trước (pickupBefore):
    if (constraints.pickupBefore) {
      const targetMinutes = parseTimeToMinutes(constraints.pickupBefore);
      if (targetMinutes !== null) {
        if (vnTime.totalMinutes > targetMinutes) {
          continue; // Mốc giờ nhận yêu cầu đã qua hôm nay
        }
        const pickupStartMinutes = parseTimeToMinutes(bag.pickupStart);
        if (pickupStartMinutes !== null && pickupStartMinutes > targetMinutes) {
          continue; // Khung giờ nhận bắt đầu sau mốc khách yêu cầu
        }
      }
    }

    // 7. Kiểm tra ngân sách cho cả nhóm (unit price * quantity)
    const unitPrice = bag.discountPrice;
    const totalPrice = unitPrice * people;
    if (constraints.maxBudget !== null && totalPrice > constraints.maxBudget) {
      continue;
    }

    // 8. So khớp danh mục chuẩn repo
    if (constraints.category !== null) {
      if (bag.category !== constraints.category) {
        continue;
      }
    }

    // 9. So khớp khu vực qua địa chỉ hoặc tên quán/túi thực tế
    if (constraints.area !== null) {
      const normArea = removeDiacritics(constraints.area.toLowerCase());
      const merchantAddr = merchant.address ? removeDiacritics(merchant.address.toLowerCase()) : '';
      const merchantName = merchant.name ? removeDiacritics(merchant.name.toLowerCase()) : '';
      const bagMerchantName = bag.merchantName ? removeDiacritics(bag.merchantName.toLowerCase()) : '';
      const bagName = removeDiacritics(bag.name.toLowerCase());
      const bagDesc = bag.description ? removeDiacritics(bag.description.toLowerCase()) : '';

      const matchesArea =
        merchantAddr.includes(normArea) ||
        merchantName.includes(normArea) ||
        bagMerchantName.includes(normArea) ||
        bagName.includes(normArea) ||
        bagDesc.includes(normArea);

      if (!matchesArea) {
        continue;
      }
    }

    // 10. Khoảng cách thật: chỉ tính khi có toạ độ hữu hạn hợp lệ (-90..90, -180..180)
    let distanceKm: number | null = null;
    if (
      input.coords &&
      typeof input.coords.lat === 'number' &&
      typeof input.coords.lng === 'number' &&
      Number.isFinite(input.coords.lat) &&
      Number.isFinite(input.coords.lng) &&
      input.coords.lat >= -90 &&
      input.coords.lat <= 90 &&
      input.coords.lng >= -180 &&
      input.coords.lng <= 180 &&
      typeof merchant.latitude === 'number' &&
      typeof merchant.longitude === 'number' &&
      Number.isFinite(merchant.latitude) &&
      Number.isFinite(merchant.longitude) &&
      merchant.latitude >= -90 &&
      merchant.latitude <= 90 &&
      merchant.longitude >= -180 &&
      merchant.longitude <= 180
    ) {
      const dist = calculateDistanceKm(
        [input.coords.lng, input.coords.lat],
        [merchant.longitude, merchant.latitude]
      );
      // Preserve metre precision; rounding km here turned a store 34 m away into 0 m.
      distanceKm = dist;
    }

    // 11. Xây dựng lý do dựa trên bằng chứng thực tế
    const reasons: string[] = [];
    const totalSavings = (bag.originalPrice - bag.discountPrice) * people;
    reasons.push(
      `${people} túi: ${totalPrice.toLocaleString('vi-VN')}đ (tiết kiệm ${totalSavings.toLocaleString('vi-VN')}đ)`
    );
    reasons.push(`Khung giờ nhận: ${bag.pickupStart}–${bag.pickupEnd}`);
    reasons.push(`Còn ${bag.quantity} túi khả dụng`);
    if (constraints.category) {
      reasons.push(`Danh mục: ${getCategoryLabel(bag.category)}`);
    }
    if (constraints.area && merchant.address) {
      reasons.push(`Địa chỉ: ${merchant.address}`);
    }
    if (distanceKm !== null) {
      const distanceLabel = distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1)} km`;
      reasons.push(`Cách vị trí của bạn ~${distanceLabel}`);
    }

    matchedResults.push({
      bag,
      merchant,
      quantity: people,
      totalPrice,
      distanceKm,
      reasons,
    });
  }

  // Sắp xếp kết quả dựa trên bằng chứng (khoảng cách thực -> mức tiết kiệm -> giá)
  matchedResults.sort((a, b) => {
    if (a.distanceKm !== null && b.distanceKm !== null) {
      if (Math.abs(a.distanceKm - b.distanceKm) > 0.05) {
        return a.distanceKm - b.distanceKm;
      }
    } else if (a.distanceKm !== null && b.distanceKm === null) {
      return -1;
    } else if (a.distanceKm === null && b.distanceKm !== null) {
      return 1;
    }

    const savingsA = (a.bag.originalPrice - a.bag.discountPrice) * a.quantity;
    const savingsB = (b.bag.originalPrice - b.bag.discountPrice) * b.quantity;
    if (savingsA !== savingsB) {
      return savingsB - savingsA;
    }

    return a.totalPrice - b.totalPrice;
  });

  if (matchedResults.length === 0 && boundedQuery.trim().length > 0) {
    warnings.push(
      'Không tìm thấy túi bất ngờ phù hợp với các tiêu chí tìm kiếm hiện tại (ngân sách, số lượng khả dụng, khung giờ nhận hoặc trạng thái mở cửa). Bạn hãy thử điều chỉnh ngân sách hoặc tìm khu vực khác.'
    );
  }

  const cleanWarnings = warnings.filter(
    (w): w is string => typeof w === 'string' && w.trim().length > 0
  );

  return {
    mode,
    constraints,
    results: matchedResults,
    warnings: cleanWarnings,
  };
}

/**
 * Lọc cục bộ pure function phục vụ unit test và chế độ không mạng
 */
export function filterCustomerCatalog(input: FinderInput): FinderResponse {
  const { constraints, warnings } = parseFinderQuery(input.query);
  return filterCatalogWithConstraints(constraints, input, 'local', warnings);
}

/**
 * Kiểm tra biến môi trường kích hoạt AI API an toàn không gây lỗi process trong trình duyệt
 */
export function isCustomerFinderApiEnabled(): boolean {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.VITE_CUSTOMER_FINDER_API_ENABLED === 'true';
    }
  } catch {
    // Không trong môi trường Vite
  }

  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  if (typeof g.process !== 'undefined' && g.process?.env) {
    return g.process.env.VITE_CUSTOMER_FINDER_API_ENABLED === 'true';
  }

  return false;
}

/**
 * Kiểm tra tính hợp lệ và cấu trúc constraints do server trả về
 * Bắt buộc đủ shape envelope, từ chối dữ liệu thiếu, category không xác định, budget không hợp lệ, giờ ngoài 00:00..23:59
 */
export function validateServerConstraints(data: unknown): FinderConstraints {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('Dữ liệu phản hồi từ AI không hợp lệ: mong đợi đối tượng JSON envelope');
  }

  const envelope = data as Record<string, unknown>;
  if (
    !('constraints' in envelope) ||
    typeof envelope.constraints !== 'object' ||
    envelope.constraints === null ||
    Array.isArray(envelope.constraints)
  ) {
    throw new Error('Thiếu trường constraints hợp lệ trong phản hồi AI');
  }

  const raw = envelope.constraints as Record<string, unknown>;

  // Bắt buộc đầy đủ shape envelope
  const requiredKeys = ['maxBudget', 'people', 'category', 'area', 'pickupBefore', 'preferences'];
  for (const k of requiredKeys) {
    if (!(k in raw)) {
      throw new Error(`Trường constraints.${k} là bắt buộc trong envelope`);
    }
  }

  // 1. maxBudget
  let maxBudget: number | null = null;
  if (raw.maxBudget !== null) {
    if (
      typeof raw.maxBudget !== 'number' ||
      !Number.isFinite(raw.maxBudget) ||
      isNaN(raw.maxBudget) ||
      raw.maxBudget <= 0 ||
      raw.maxBudget > 100_000_000
    ) {
      throw new Error('Giá trị maxBudget từ AI không hợp lệ hoặc vượt ngưỡng');
    }
    maxBudget = Math.round(raw.maxBudget);
  }

  // 2. people (1..20)
  if (
    typeof raw.people !== 'number' ||
    !Number.isInteger(raw.people) ||
    raw.people < 1 ||
    raw.people > 20
  ) {
    throw new Error('Số người từ AI phải là số nguyên trong khoảng 1..20');
  }
  const people = raw.people;

  // 3. category
  const validCategories: FoodCategory[] = [
    'vegetarian',
    'meat',
    'bakery',
    'seafood',
    'beverage',
    'raw_food',
    'other',
  ];
  let category: Exclude<FoodCategory, 'all'> | null = null;
  if (raw.category !== null) {
    if (typeof raw.category !== 'string' || !validCategories.includes(raw.category as FoodCategory)) {
      throw new Error(`Danh mục từ AI không xác định trong hệ thống: "${String(raw.category)}"`);
    }
    category = raw.category as Exclude<FoodCategory, 'all'>;
  }

  // 4. area
  let area: string | null = null;
  if (raw.area !== null) {
    if (typeof raw.area !== 'string') {
      throw new Error('Khu vực từ AI phải là chuỗi ký tự');
    }
    area = raw.area.trim().slice(0, 100) || null;
  }

  // 5. pickupBefore (HH:mm strictly 00:00 to 23:59)
  let pickupBefore: string | null = null;
  if (raw.pickupBefore !== null) {
    if (
      typeof raw.pickupBefore !== 'string' ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(raw.pickupBefore)
    ) {
      throw new Error('pickupBefore từ AI phải theo định dạng HH:mm với giờ 00..23 và phút 00..59');
    }
    pickupBefore = raw.pickupBefore;
  }

  // 6. preferences (mảng chuỗi)
  if (!Array.isArray(raw.preferences)) {
    throw new Error('preferences từ AI phải là mảng chuỗi');
  }
  const preferences: string[] = raw.preferences
    .filter((p): p is string => typeof p === 'string')
    .map((p) => p.trim().slice(0, 100))
    .filter((p) => p.length > 0);

  return {
    maxBudget,
    people,
    category,
    area,
    pickupBefore,
    preferences,
  };
}

/**
 * Tìm kiếm danh mục: mặc định local; chỉ khi bật VITE_CUSTOMER_FINDER_API_ENABLED=true
 * mới gửi yêu cầu đến POST /api/ai/customer-search để lấy normalized constraints.
 * Bọc toàn bộ auth/import/fetch/body workflow bằng reject-on-abort race (35 giây),
 * đảm bảo reject ngay cả khi auth session lookup bị treo vô tận.
 */
export const FINDER_AI_TIMEOUT_MS = 35_000;

export async function searchCustomerCatalog(
  input: FinderInput,
  options?: { signal?: AbortSignal }
): Promise<FinderResponse> {
  const isApiEnabled = isCustomerFinderApiEnabled();

  // Mặc định chạy local filter, không qua network
  if (!isApiEnabled) {
    return filterCustomerCatalog(input);
  }

  const controller = new AbortController();
  let abortListener: (() => void) | undefined;

  const abortHandler = () => {
    controller.abort(options?.signal?.reason);
  };

  if (options?.signal) {
    if (options.signal.aborted) {
      throw options.signal.reason || new Error('Yêu cầu đã bị huỷ');
    }
    options.signal.addEventListener('abort', abortHandler);
  }

  // Promise reject ngay lập tức khi controller.signal bị abort (do timeout hoặc caller signal)
  const abortPromise = new Promise<never>((_, reject) => {
    if (controller.signal.aborted) {
      reject(controller.signal.reason || new Error('Yêu cầu đã bị huỷ'));
      return;
    }
    abortListener = () => {
      reject(controller.signal.reason || new Error('Yêu cầu đã bị huỷ'));
    };
    controller.signal.addEventListener('abort', abortListener);
  });

  const timeoutId = setTimeout(() => {
    controller.abort(new Error('AI phản hồi quá lâu. Vui lòng thử lại hoặc dùng bộ lọc cục bộ.'));
  }, FINDER_AI_TIMEOUT_MS);

  // Workflow chính
  const executeWorkflow = async (): Promise<FinderResponse> => {
    let accessToken: string | null = null;
    try {
      const { supabase } = await import('./supabase');
      const sessionRes = await supabase.auth.getSession();
      accessToken = sessionRes.data.session?.access_token ?? null;
    } catch {
      if (controller.signal.aborted) {
        throw controller.signal.reason || new Error('Yêu cầu đã bị huỷ');
      }
      // Bỏ qua lỗi auth khác để gọi anonymous
    }

    if (controller.signal.aborted) {
      throw controller.signal.reason || new Error('Yêu cầu đã bị huỷ');
    }

    if (!accessToken) {
      throw new Error('Đăng nhập để dùng tìm kiếm AI, hoặc chọn bộ lọc cục bộ.');
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch('/api/ai/customer-search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: input.query }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const messages: Record<number, string> = {
        401: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để dùng AI.',
        429: 'Bạn tìm kiếm hơi nhanh. Vui lòng chờ một phút rồi thử lại.',
        503: 'Máy chủ AI chưa sẵn sàng. Vui lòng kiểm tra cấu hình hoặc thử lại sau.',
        504: 'AI phản hồi quá lâu. Vui lòng thử lại hoặc dùng bộ lọc cục bộ.',
      };
      throw new Error(
        messages[res.status] ?? `Dịch vụ AI phản hồi lỗi HTTP ${res.status}. Vui lòng thử lại hoặc sử dụng Bộ lọc cục bộ.`
      );
    }

    const data: unknown = await res.json();
    const serverConstraints = validateServerConstraints(data);

    let serverWarnings: string[] = [];
    if (typeof data === 'object' && data !== null && 'warnings' in data) {
      const rawWarnings = (data as { warnings: unknown }).warnings;
      if (Array.isArray(rawWarnings)) {
        serverWarnings = rawWarnings.filter(
          (w): w is string => typeof w === 'string' && w.trim().length > 0
        );
      }
    }

    const model = typeof data === 'object' && data !== null && 'model' in data &&
      typeof data.model === 'string' && /^gpt-[a-zA-Z0-9._-]{1,80}$/.test(data.model) ? data.model : undefined;
    return { ...filterCatalogWithConstraints(serverConstraints, input, 'ai', serverWarnings), model };
  };

  try {
    // Race giữa toàn bộ workflow và abortPromise
    return await Promise.race([executeWorkflow(), abortPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (options?.signal) {
      options.signal.removeEventListener('abort', abortHandler);
    }
    if (abortListener) {
      controller.signal.removeEventListener('abort', abortListener);
    }
  }
}
