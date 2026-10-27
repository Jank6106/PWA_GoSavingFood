import { supabase } from './supabase';
import { calculateDistanceKm, formatDistance, mapboxService } from './mapbox.service';
import { isBagVisibleOnMarket } from '../shared/utils/bagTiming';
import {
  parseIdentifier,
  isValidEmail,
  mapSupabaseAuthError,
} from '../shared/utils/validation';
import type {
  Banner,
  Brand,
  Category,
  FoodCategory,
  LocationSuggestion,
  Merchant,
  NotificationItem,
  Order,
  SurpriseBag,
  User,
  Voucher,
  CustomerReview,
} from '../shared/types/customer.types';

// Nội dung UI tĩnh (banner & danh mục không có bảng riêng trong DB)
export const HOME_BANNERS: Banner[] = [
  {
    id: 'banner-1',
    eyebrow: 'Giải cứu hôm nay',
    title: 'Ngon hơn khi không bị lãng phí',
    description: 'Túi bất ngờ từ các cửa hàng quanh bạn, giảm đến 70%.',
    accent: 'green',
    icon: 'bag',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=720&q=75',
  },
  {
    id: 'banner-2',
    eyebrow: 'Ưu đãi thành viên',
    title: 'Giảm thêm 20.000đ cho đơn đầu tiên',
    description: 'Dùng mã HELLOGSF khi thanh toán đơn từ 50.000đ.',
    accent: 'yellow',
    icon: 'ticket',
    imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=720&q=75',
  },
  {
    id: 'banner-3',
    eyebrow: 'Tác động xanh',
    title: 'Mỗi túi cứu được giảm 2,5kg CO₂',
    description: 'Một lựa chọn nhỏ, thêm một ngày tốt cho hành tinh.',
    accent: 'mint',
    icon: 'globe',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=720&q=75',
  },
];

export const HOME_CATEGORIES: Category[] = [
  { id: 'all', label: 'Tất cả', icon: 'all' },
  { id: 'bakery', label: 'Bánh ngọt', icon: 'bakery' },
  { id: 'meat', label: 'Món nóng', icon: 'meat' },
  { id: 'vegetarian', label: 'Ăn xanh', icon: 'vegetarian' },
  { id: 'beverage', label: 'Đồ uống', icon: 'beverage' },
  { id: 'other', label: 'Túi bí mật', icon: 'other' },
];

const formatRelativeTime = (iso?: string | null) => {
  if (!iso) return '';
  const milliseconds = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 'Vừa xong';
  const minutes = Math.floor(milliseconds / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

export const optimizeImageUrl = (url?: string | null, width = 480, quality = 75): string => {
  if (!url) return '';
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }
  return url;
};

const getBagImage = (name: string, url?: string | null) => {
  if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
    return optimizeImageUrl(url, 480, 75);
  }
  if (url && url.startsWith('data:') && url.length < 50000) {
    return url;
  }
  const n = (name || '').toLowerCase();
  if (n.includes('salad'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1512621776951-a57141f2eefd', 480, 75);
  if (n.includes('nước ép') || n.includes('thơm') || n.includes('uống'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1613478223719-2ab802602423', 480, 75);
  if (n.includes('trái cây') || n.includes('hoa quả'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1619566636858-adf3ef46400b', 480, 75);
  if (n.includes('bánh'))
    return optimizeImageUrl('https://images.unsplash.com/photo-1509440159596-0249088772ff', 480, 75);
  return optimizeImageUrl('https://images.unsplash.com/photo-1540420773420-3366772f4999', 480, 75);
};

const getStoreLogo = (url?: string | null) => {
  if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
    return optimizeImageUrl(url, 300, 80);
  }
  if (url && url.startsWith('data:') && url.length < 30000) {
    return url;
  }
  return optimizeImageUrl('https://images.unsplash.com/photo-1555396273-367ea4eb4db5', 300, 80);
};

const getStoreBanner = (url?: string | null) => {
  if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
    return optimizeImageUrl(url, 1000, 80);
  }
  if (url && url.startsWith('data:') && url.length < 50000) {
    return url;
  }
  return optimizeImageUrl('https://images.unsplash.com/photo-1504674900247-0877df9cc836', 1000, 80);
};

const mapCreateOrderError = (error: { message?: string; details?: string } | null): string => {
  const raw = `${error?.message ?? ''} ${error?.details ?? ''}`;
  if (raw.includes('UNAUTHORIZED'))
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
  if (raw.includes('BAG_UNAVAILABLE')) {
    try {
      if (error?.details) {
        const parsed = typeof error.details === 'string' ? JSON.parse(error.details) : error.details;
        if (parsed?.reason === 'NOT_YET_OPEN') {
          return `Túi thực phẩm chưa đến giờ mở bán (mở lúc ${parsed.pickupStart || '... Hôm nay'}). Vui lòng quay lại sau.`;
        }
        if (parsed?.reason === 'ORDER_CLOSED') {
          return `Đã hết thời gian nhận đơn cho túi này hôm nay (kết thúc lúc ${parsed.pickupEnd || '...'}). Quán hiện chỉ giao túi cho các đơn đã đặt trước.`;
        }
        if (parsed?.reason === 'EXPIRED') {
          return parsed.expiryDate
            ? `Túi thực phẩm đã hết hạn sử dụng (hạn: ${parsed.expiryDate}). Vui lòng chọn túi khác.`
            : 'Túi thực phẩm đã hết hạn sử dụng. Vui lòng chọn túi khác.';
        }
        if (parsed?.reason === 'INACTIVE') {
          return 'Túi thực phẩm hiện đang tạm dừng mở bán. Vui lòng chọn túi khác.';
        }
        if (typeof parsed?.available === 'number' && typeof parsed?.requested === 'number') {
          if (parsed.available <= 0) {
            return 'Túi thực phẩm đã hết hàng. Vui lòng chọn túi khác.';
          }
          if (parsed.available < parsed.requested) {
            return `Túi thực phẩm chỉ còn ${parsed.available} phần (bạn đang đặt ${parsed.requested} phần). Vui lòng điều chỉnh lại số lượng.`;
          }
        }
      }
    } catch {}
    return 'Túi thực phẩm đã hết hoặc không còn mở bán. Vui lòng chọn túi khác.';
  }
  if (raw.includes('BAG_NOT_FOUND')) return 'Không tìm thấy túi thực phẩm trong hệ thống.';
  if (raw.includes('STORE_MISMATCH')) return 'Túi thực phẩm không thuộc cửa hàng đã chọn.';
  if (raw.includes('VOUCHER_NOT_FOUND')) return 'Mã giảm giá không tồn tại.';
  if (raw.includes('VOUCHER_ALREADY_USED')) return 'Bạn đã dùng mã giảm giá này cho đơn khác.';
  if (raw.includes('VOUCHER_EXPIRED')) return 'Mã giảm giá đã hết hạn sử dụng.';
  if (raw.includes('VOUCHER_USAGE_LIMIT')) return 'Mã giảm giá đã hết lượt sử dụng.';
  if (raw.includes('VOUCHER_INACTIVE')) return 'Mã giảm giá không còn hiệu lực.';
  if (raw.includes('orders_customer_id_fkey'))
    return 'Thông tin tài khoản chưa được đồng bộ. Vui lòng tải lại trang và thử lại.';
  if (raw.includes('users_phone_key') || raw.includes('23505'))
    return 'Số điện thoại này đã được liên kết với một tài khoản khác. Vui lòng kiểm tra lại.';
  return 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại rồi thử lại.';
};

const normalizeCategory = (cat?: string | null): Exclude<FoodCategory, 'all'> => {
  if (!cat) return 'vegetarian';
  const c = cat.toLowerCase().trim();
  if (c === 'bakery' || c.includes('bánh')) return 'bakery';
  if (c === 'meat' || c.includes('mặn') || c.includes('thịt')) return 'meat';
  if (c === 'beverage' || c.includes('uống') || c.includes('nước') || c.includes('cà phê')) return 'beverage';
  if (c === 'vegetarian' || c === 'raw_food' || c.includes('chay') || c.includes('rau') || c.includes('quả') || c.includes('salad')) return 'vegetarian';
  return 'other';
};

let inFlightHomePromise: Promise<any> | null = null;
let lastHomeCoordsKey = '';

export const HANOI_STORES: Merchant[] = [
  {
    "id": "fcc75682-534e-495c-91a7-982622d02cf7",
    "brandId": "fcc75682-534e-495c-91a7-982622d02cf7",
    "name": "Tous Les Jours - Hoàng Quốc Việt",
    "description": "Thương hiệu bánh ngọt và bánh mì tươi phong cách Pháp - Hàn Quốc cao cấp.",
    "phone": "024 3755 8899",
    "address": "234 Hoàng Quốc Việt, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 5,
    "totalRatings": 18,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:30 - 22:00",
    "latitude": 21.0465,
    "longitude": 105.7892
  },
  {
    "id": "fcc75682-534e-495c-91a7-982622d02cf8",
    "brandId": "fcc75682-534e-495c-91a7-982622d02cf8",
    "name": "Tous Les Jours - Keangnam Landmark 72",
    "description": "Bánh mì nướng tươi, pastry bơ Pháp thượng hạng và cà phê chuẩn vị.",
    "phone": "024 3837 8222",
    "address": "Tầng 1 Keangnam Landmark 72, Phạm Hùng, Mễ Trì, Nam Từ Liêm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 24,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 22:00",
    "latitude": 21.0173,
    "longitude": 105.7838
  },
  {
    "id": "5779597d-222b-4e30-9501-f1c44c383330",
    "brandId": "5779597d-222b-4e30-9501-f1c44c383330",
    "name": "Fresh Garden Bakery - Phạm Văn Đồng",
    "description": "Bánh tươi mỗi ngày, bánh mì gối dinh dưỡng, donut và bánh su kem béo ngậy.",
    "phone": "024 3856 9900",
    "address": "43 Phạm Văn Đồng, Mai Dịch, Cầu Giấy, Hà Nội",
    "logo": "https://theme.hstatic.net/200000411281/1001307649/14/logo.png?v=941",
    "banner": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 15,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 21:30",
    "latitude": 21.041,
    "longitude": 105.7795
  },
  {
    "id": "5779597d-222b-4e30-9501-f1c44c383331",
    "brandId": "5779597d-222b-4e30-9501-f1c44c383331",
    "name": "Fresh Garden Bakery - Nguyễn Thị Thập",
    "description": "Tiệm bánh tươi phong cách hiện đại với các dòng bánh nướng thơm lừng trong ngày.",
    "phone": "024 3556 8866",
    "address": "112 Nguyễn Thị Thập, Trung Hòa Nhân Chính, Cầu Giấy, Hà Nội",
    "logo": "https://theme.hstatic.net/200000411281/1001307649/14/logo.png?v=941",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 12,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 21:30",
    "latitude": 21.0084,
    "longitude": 105.8042
  },
  {
    "id": "4bd5a486-8ee2-49cf-8bd6-6eacf946db56",
    "brandId": "4bd5a486-8ee2-49cf-8bd6-6eacf946db56",
    "name": "Highlands Coffee - IPH Xuân Thủy",
    "description": "Thương hiệu cà phê Việt Nam danh tiếng, đậm đà hương vị cùng bánh ngọt thơm béo.",
    "phone": "024 3768 8999",
    "address": "241 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 32,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 23:00",
    "latitude": 21.0378,
    "longitude": 105.7828
  },
  {
    "id": "4bd5a486-8ee2-49cf-8bd6-6eacf946db57",
    "brandId": "4bd5a486-8ee2-49cf-8bd6-6eacf946db57",
    "name": "Highlands Coffee - Vincom Nguyễn Chí Thanh",
    "description": "Không gian thưởng thức cà phê phin truyền thống và freeze trà xanh đặc trưng.",
    "phone": "024 3724 6688",
    "address": "54A Nguyễn Chí Thanh, Láng Thượng, Đống Đa, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 28,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 22:30",
    "latitude": 21.0232,
    "longitude": 105.8115
  },
  {
    "id": "b1ead7a1-0001-4000-8000-000000000001",
    "brandId": "b1ead7a1-0001-4000-8000-000000000001",
    "name": "BreadTalk - Vincom Bà Triệu",
    "description": "Bánh mì phong cách Singapore sáng tạo nổi tiếng với bánh mì chà bông độc quyền.",
    "phone": "024 3974 4118",
    "address": "Tầng 4 Vincom Center, 191 Bà Triệu, Lê Đại Hành, Hai Bà Trưng, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 40,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:00",
    "latitude": 21.0116,
    "longitude": 105.8496
  },
  {
    "id": "b1ead7a1-0002-4000-8000-000000000002",
    "brandId": "b1ead7a1-0002-4000-8000-000000000002",
    "name": "Paris Baguette - Tràng Tiền Plaza",
    "description": "Chuỗi bakery cao cấp chuẩn Âu với bánh ngọt tinh xảo và croissant thơm bơ.",
    "phone": "024 3936 9966",
    "address": "Tầng 1 Tràng Tiền Plaza, 24 Hai Bà Trưng, Tràng Tiền, Hoàn Kiếm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 52,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 22:00",
    "latitude": 21.0253,
    "longitude": 105.8549
  },
  {
    "id": "b1ead7a1-0003-4000-8000-000000000003",
    "brandId": "b1ead7a1-0003-4000-8000-000000000003",
    "name": "Sapo Bakery - Quang Trung Hà Đông",
    "description": "Tiệm bánh thủ công danh tiếng Hà Nội với bánh su kem béo ngậy và bánh sinh nhật tươi.",
    "phone": "0909 199 599",
    "address": "8 Quang Trung, Quang Trung, Hà Đông, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 19,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:30 - 22:00",
    "latitude": 20.9721,
    "longitude": 105.7768
  },
  {
    "id": "b1ead7a1-0004-4000-8000-000000000004",
    "brandId": "b1ead7a1-0004-4000-8000-000000000004",
    "name": "Anh Hòa Bakery - Cầu Giấy",
    "description": "Thương hiệu bánh ngọt lâu năm với nguyên liệu bơ sữa cao cấp nhập khẩu từ New Zealand.",
    "phone": "024 3833 8686",
    "address": "98 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 31,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:30 - 22:00",
    "latitude": 21.0335,
    "longitude": 105.7955
  },
  {
    "id": "b1ead7a1-0005-4000-8000-000000000005",
    "brandId": "b1ead7a1-0005-4000-8000-000000000005",
    "name": "Phúc Long Coffee & Tea - Lotte Center Liễu Giai",
    "description": "Trà và cà phê truyền thống Bảo Lộc cùng các dòng bánh ngọt nhẹ nhàng thơm hương trà.",
    "phone": "024 3232 1555",
    "address": "Tầng B1 Lotte Center, 54 Liễu Giai, Cống Vị, Ba Đình, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 44,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:00",
    "latitude": 21.0322,
    "longitude": 105.8128
  },
  {
    "id": "b1ead7a1-0006-4000-8000-000000000006",
    "brandId": "b1ead7a1-0006-4000-8000-000000000006",
    "name": "Katinat Saigon Kafe - Lý Thường Kiệt",
    "description": "Chuỗi cà phê phong cách Sài Gòn sang trọng với đồ uống tươi mát và bánh nướng giòn.",
    "phone": "028 7300 1005",
    "address": "60 Lý Thường Kiệt, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 56,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 22:30",
    "latitude": 21.0229,
    "longitude": 105.8505
  },
  {
    "id": "b1ead7a1-0007-4000-8000-000000000007",
    "brandId": "b1ead7a1-0007-4000-8000-000000000007",
    "name": "The Coffee House - Thái Hà",
    "description": "Ngôi nhà cà phê với trà đào cam sả trứ danh và các loại bánh mì ngọt nướng tươi.",
    "phone": "028 7303 9079",
    "address": "159 Thái Hà, Trung Liệt, Đống Đa, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 38,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 22:00",
    "latitude": 21.0118,
    "longitude": 105.8192
  },
  {
    "id": "b1ead7a1-0008-4000-8000-000000000008",
    "brandId": "b1ead7a1-0008-4000-8000-000000000008",
    "name": "Cộng Cà Phê - Nhà Thờ",
    "description": "Cà phê cốt dừa thơm béo và hoài niệm thời bao cấp giữa lòng phố cổ Hà Nội.",
    "phone": "024 3928 8208",
    "address": "27 Nhà Thờ, Hàng Trống, Hoàn Kiếm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 48,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 23:00",
    "latitude": 21.0287,
    "longitude": 105.8491
  },
  {
    "id": "b1ead7a1-0009-4000-8000-000000000009",
    "brandId": "b1ead7a1-0009-4000-8000-000000000009",
    "name": "Starbucks Coffee - Nhà Thờ Lớn",
    "description": "Thương hiệu cà phê biểu tượng toàn cầu với hạt Arabica tuyển chọn và bánh nướng hảo hạng.",
    "phone": "024 3938 1234",
    "address": "6 Nhà Thờ, Hàng Trống, Hoàn Kiếm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 65,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:30 - 22:30",
    "latitude": 21.0292,
    "longitude": 105.8498
  },
  {
    "id": "b1ead7a1-0010-4000-8000-000000000010",
    "brandId": "b1ead7a1-0010-4000-8000-000000000010",
    "name": "Phê La - Hàng Cót",
    "description": "Đặc sản trà Ô Long thủ công đậm vị và các thức uống signature từ vùng đất Bảo Lộc.",
    "phone": "1900 3013",
    "address": "24 Hàng Cót, Hàng Mã, Hoàn Kiếm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 50,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 22:30",
    "latitude": 21.0381,
    "longitude": 105.8475
  },
  {
    "id": "b1ead7a1-0011-4000-8000-000000000011",
    "brandId": "b1ead7a1-0011-4000-8000-000000000011",
    "name": "Cheese Coffee - Lê Duẩn",
    "description": "Cà phê và thức uống phô mai béo ngậy cùng không gian thiết kế industrial độc đáo.",
    "phone": "028 3514 6868",
    "address": "50 Lê Duẩn, Khâm Thiên, Đống Đa, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 27,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 22:00",
    "latitude": 21.021,
    "longitude": 105.8415
  },
  {
    "id": "2f207531-63ee-4650-b3ef-71282d3e91c3",
    "brandId": "2f207531-63ee-4650-b3ef-71282d3e91c3",
    "name": "Trà Sữa TocoToco - Hồ Tùng Mậu",
    "description": "Trà sữa trân châu hoàng gia từ nông sản Việt Nam thơm béo và đậm vị trà tự nhiên.",
    "phone": "1900 636936",
    "address": "136 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội",
    "logo": "https://tocotocotea.com/wp-content/themes/tocotocotea/assets/images/logo.png",
    "banner": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.6,
    "totalRatings": 21,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:00",
    "latitude": 21.0395,
    "longitude": 105.7725
  },
  {
    "id": "ac5987b4-c50f-4e33-ae1b-42c7a78c74cc",
    "brandId": "ac5987b4-c50f-4e33-ae1b-42c7a78c74cc",
    "name": "Dairy Queen - Chùa Láng",
    "description": "Kem úp ngược Blizzard trứ danh cùng các loại bánh kem lạnh thượng hạng chuẩn Mỹ.",
    "phone": "024 3724 7799",
    "address": "112 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 20,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:30 - 22:00",
    "latitude": 21.0268,
    "longitude": 105.8032
  },
  {
    "id": "6c2a82a7-0ecd-43f3-bf7d-a74bc7e4a0d5",
    "brandId": "6c2a82a7-0ecd-43f3-bf7d-a74bc7e4a0d5",
    "name": "Baskin-Robbins - Tây Hồ",
    "description": "Thương hiệu 31 vị kem nổi tiếng thế giới với nguyên liệu kem sữa tươi thượng hạng.",
    "phone": "024 3718 6886",
    "address": "18 Đặng Thai Mai, Quảng An, Tây Hồ, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 26,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "09:00 - 22:00",
    "latitude": 21.061,
    "longitude": 105.8285
  },
  {
    "id": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "brandId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "name": "WinMart+ - Green Stars Phạm Văn Đồng",
    "description": "Siêu thị tiện lợi hàng đầu, rau củ quả VietGAP và thực phẩm tươi sạch trong ngày.",
    "phone": "024 7106 6866",
    "address": "Tòa 27A2 Green Stars, 234 Phạm Văn Đồng, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội",
    "logo": "https://upload.wikimedia.org/wikipedia/commons/9/9a/WinMart_logo.png",
    "banner": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 16,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:00 - 22:00",
    "latitude": 21.0535,
    "longitude": 105.782
  },
  {
    "id": "b1ead7a1-0012-4000-8000-000000000012",
    "brandId": "b1ead7a1-0012-4000-8000-000000000012",
    "name": "WinMart+ - Times City Minh Khai",
    "description": "Chuỗi bán lẻ thực phẩm thiết yếu, nông sản sạch chuẩn VietGAP và đồ uống mát lạnh.",
    "phone": "024 7106 8899",
    "address": "Tòa T6 Vinhomes Times City, 458 Minh Khai, Vĩnh Tuy, Hai Bà Trưng, Hà Nội",
    "logo": "https://upload.wikimedia.org/wikipedia/commons/9/9a/WinMart_logo.png",
    "banner": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 22,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:00 - 22:00",
    "latitude": 20.995,
    "longitude": 105.8682
  },
  {
    "id": "b1ead7a1-0013-4000-8000-000000000013",
    "brandId": "b1ead7a1-0013-4000-8000-000000000013",
    "name": "GS25 - Duy Tân",
    "description": "Cửa hàng tiện lợi phong cách Hàn Quốc với cơm nắm Onigiri, sandwich và đồ ăn nhẹ.",
    "phone": "028 7302 2525",
    "address": "36 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 35,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "00:00 - 23:59",
    "latitude": 21.0315,
    "longitude": 105.783
  },
  {
    "id": "b1ead7a1-0014-4000-8000-000000000014",
    "brandId": "b1ead7a1-0014-4000-8000-000000000014",
    "name": "Circle K - Hoàng Đạo Thúy",
    "description": "Cửa hàng tiện lợi 24/7 với bánh mì nướng, xúc xích nóng và thực phẩm đóng gói tiện dụng.",
    "phone": "024 3556 2288",
    "address": "17T4 Hoàng Đạo Thúy, Trung Hòa Nhân Chính, Cầu Giấy, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 29,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "00:00 - 23:59",
    "latitude": 21.0068,
    "longitude": 105.8035
  },
  {
    "id": "b1ead7a1-0015-4000-8000-000000000015",
    "brandId": "b1ead7a1-0015-4000-8000-000000000015",
    "name": "7-Eleven - Landmark 72 Phạm Hùng",
    "description": "Chuỗi tiện ích quốc tế phục vụ bữa ăn nhanh tiện lợi, đồ uống giải khát mát lạnh.",
    "phone": "028 7300 7111",
    "address": "Tầng 1 Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 33,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:00 - 23:00",
    "latitude": 21.0175,
    "longitude": 105.7842
  },
  {
    "id": "b1ead7a1-0016-4000-8000-000000000016",
    "brandId": "b1ead7a1-0016-4000-8000-000000000016",
    "name": "Annam Gourmet Market - Syrena Tây Hồ",
    "description": "Đại siêu thị thực phẩm nhập khẩu cao cấp, phô mai châu Âu, bánh ngọt và trái cây tươi.",
    "phone": "024 3718 6688",
    "address": "Tòa nhà Syrena, 51 Xuân Diệu, Quảng An, Tây Hồ, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 42,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 21:30",
    "latitude": 21.0625,
    "longitude": 105.829
  },
  {
    "id": "bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7",
    "brandId": "bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7",
    "name": "Cơm Niêu Singapore KOMBO - Duy Tân",
    "description": "Cơm niêu cháy giòn 2 mặt thơm nức mũi, sốt bò tiêu đen và gà sốt nấm chuẩn vị Singapore.",
    "phone": "0971 615 775",
    "address": "86 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
    "logo": "https://kombo.vn/wp-content/themes/kombo/assets/img/logo-mobile.png",
    "banner": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 25,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "10:00 - 21:00",
    "latitude": 21.031,
    "longitude": 105.7825
  },
  {
    "id": "db669945-636b-4538-84be-568185e22b13",
    "brandId": "db669945-636b-4538-84be-568185e22b13",
    "name": "Cơm Thố Bách Khoa - Trần Cung",
    "description": "Cơm thố nóng giòn đặc trưng, hạt cơm dẻo quyện cùng thịt xá xíu, bò nướng và canh rong biển.",
    "phone": "0966 883 234",
    "address": "96 Trần Cung, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội",
    "logo": "https://comthobachkhoa.com.vn/wp-content/uploads/2026/03/logo-com-tho-bach-khoa-1024x313.png",
    "banner": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 30,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "09:30 - 21:30",
    "latitude": 21.0505,
    "longitude": 105.7885
  },
  {
    "id": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "brandId": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "name": "Nhà Hàng Chay Vị Lai - Lý Thường Kiệt",
    "description": "Ẩm thực chay cao cấp nghệ thuật, không gian thanh tịnh với món chay tinh tế chuẩn 5 sao.",
    "phone": "024 6253 8999",
    "address": "67 Lý Thường Kiệt, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
    "logo": "https://vilai.vn/mediacenter/media/images/725/logo/logo-1514167401.png",
    "banner": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 45,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "10:00 - 21:30",
    "latitude": 21.0235,
    "longitude": 105.8512
  },
  {
    "id": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "brandId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "name": "Bếp Chay An Lạc - Cổ Nhuế",
    "description": "Cơm chay thanh tịnh, thực phẩm dinh dưỡng từ nấm và rau củ hữu cơ tươi ngon.",
    "phone": "0988 234 112",
    "address": "128 Cổ Nhuế, Cổ Nhuế 2, Bắc Từ Liêm, Hà Nội",
    "logo": "https://vilai.vn/mediacenter/media/images/725/logo/logo-1514167401.png",
    "banner": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 28,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "09:00 - 21:00",
    "latitude": 21.062,
    "longitude": 105.7765
  },
  {
    "id": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "brandId": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "name": "McDonald's - Nguyễn Trãi Q1",
    "description": "Bữa ăn nhanh thịnh soạn chuẩn quốc tế với Burger Big Mac huyền thoại và gà rán giòn cay.",
    "phone": "028 3838 6666",
    "address": "12 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
    "logo": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 55,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 23:00",
    "latitude": 10.7712,
    "longitude": 106.6923
  },
  {
    "id": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "brandId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "name": "KFC Vietnam - Bến Nghé Q1",
    "description": "Gà rán hương vị công thức 11 loại thảo mộc bí truyền, burger zinger giòn cay và bánh trứng nướng.",
    "phone": "1900 6886",
    "address": "45 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/5b051934-45e2-4cbe-92b7-7e78c4b51710/logo_1793102739004.webp",
    "banner": "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 48,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "09:00 - 22:00",
    "latitude": 10.7745,
    "longitude": 106.7011
  },
  {
    "id": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "brandId": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "name": "Lotteria - Nguyễn Huệ Q1",
    "description": "Món gà rán giòn rụm sốt đậu Hàn Quốc, burger phô mai mozzarella kéo sợi và khoai lắc phô mai.",
    "phone": "1900 6778",
    "address": "128 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
    "logo": "https://www.lotteria.vn/media/logo/default/logo.png",
    "banner": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 62,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:00",
    "latitude": 10.7738,
    "longitude": 106.7042
  },
  {
    "id": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "brandId": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "name": "Domino's Pizza - Liễu Giai",
    "description": "Pizza nhào bột tươi bằng tay theo chuẩn Mỹ, phô mai Mozzarella 100% hảo hạng và bánh mì bơ tỏi.",
    "phone": "1900 6099",
    "address": "54 Liễu Giai, Cống Vị, Ba Đình, Hà Nội",
    "logo": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80",
    "banner": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 37,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "10:00 - 22:00",
    "latitude": 21.0325,
    "longitude": 105.813
  }
];

export const HANOI_BAGS: SurpriseBag[] = [
  {
    "id": "82d37623-53ef-4e5e-bcb9-6793cb435aff",
    "merchantId": "fcc75682-534e-495c-91a7-982622d02cf7",
    "merchantName": "Tous Les Jours - Hoàng Quốc Việt",
    "name": "Túi Bánh Mì Nướng Tươi & Pastry Pháp",
    "description": "Thưởng thức bánh baguette nướng thơm lừng, croissant bơ vàng ruộm và các loại pastry tươi hảo hạng được nhào nặn công phu từ bột mì cao cấp trong ngày.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.673Z"
  },
  {
    "id": "c67f81fa-4b47-4483-baef-142c7b4f8be1",
    "merchantId": "fcc75682-534e-495c-91a7-982622d02cf7",
    "merchantName": "Tous Les Jours - Hoàng Quốc Việt",
    "name": "Túi Bánh Ngọt Pháp & Croissant Bơ Thượng Hạng",
    "description": "Bánh croissant ngập tràn bơ Pháp thơm lừng kết hợp cùng bánh kem su mềm mại, đem đến trải nghiệm ẩm thực Pháp tinh tế và ngọt ngào.",
    "originalPrice": 150000,
    "discountPrice": 55000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0001-4000-8000-000000000001",
    "merchantId": "fcc75682-534e-495c-91a7-982622d02cf8",
    "merchantName": "Tous Les Jours - Keangnam Landmark 72",
    "name": "Túi Bánh Mì Gối Mềm & Bánh Su Kem Tous Les Jours",
    "description": "Bánh mì gối sữa tươi dẻo mềm giàu dưỡng chất kèm bánh su kem vani mát lạnh, chuẩn bị tinh tươm cho bữa phụ gia đình đầy năng lượng.",
    "originalPrice": 130000,
    "discountPrice": 48000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "8d61a0da-732e-426c-966f-a45e3f57f607",
    "merchantId": "5779597d-222b-4e30-9501-f1c44c383330",
    "merchantName": "Fresh Garden Bakery - Phạm Văn Đồng",
    "name": "Túi Bánh Mì Gối Sandwich & Donut Phô Mai Tươi",
    "description": "Bánh mì sandwich mềm mịn, donut chocolate phủ cốm và bánh phô mai nướng thơm ngậy, món quà ngọt ngào khởi đầu ngày mới.",
    "originalPrice": 95000,
    "discountPrice": 35000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0020-4000-8000-000000000020",
    "merchantId": "5779597d-222b-4e30-9501-f1c44c383330",
    "merchantName": "Fresh Garden Bakery - Phạm Văn Đồng",
    "name": "Túi Bánh Mousse Trái Cây & Bánh Nướng Dinh Dưỡng",
    "description": "Sự kết hợp tươi mát giữa bánh mousse chanh leo mềm mịn và bánh nướng ngũ cốc dinh dưỡng giàu năng lượng trong ngày.",
    "originalPrice": 110000,
    "discountPrice": 40000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0002-4000-8000-000000000002",
    "merchantId": "5779597d-222b-4e30-9501-f1c44c383331",
    "merchantName": "Fresh Garden Bakery - Nguyễn Thị Thập",
    "name": "Túi Bánh Ngọt Tươi Mềm & Cookies Bơ Pháp",
    "description": "Tuyển tập bánh ngọt tươi trong ngày và bánh quy bơ thơm bùi, hoàn hảo để thưởng thức cùng tách trà chiều nhẹ nhàng.",
    "originalPrice": 100000,
    "discountPrice": 38000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "5f93f54c-f73a-4737-9d61-2de5396029aa",
    "merchantId": "4bd5a486-8ee2-49cf-8bd6-6eacf946db56",
    "merchantName": "Highlands Coffee - IPH Xuân Thủy",
    "name": "Túi Bánh Mousse Trái Cây & Phin Sữa Tươi Highlands",
    "description": "Thưởng thức bánh mousse thanh mát chua ngọt cân bằng bên ly phin sữa đậm đà di sản, mang trọn nguồn cảm hứng hứng khởi.",
    "originalPrice": 85000,
    "discountPrice": 35000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0003-4000-8000-000000000003",
    "merchantId": "4bd5a486-8ee2-49cf-8bd6-6eacf946db57",
    "merchantName": "Highlands Coffee - Vincom Nguyễn Chí Thanh",
    "name": "Túi Bánh Phô Mai Cà Phê & Freeze Trà Xanh Highlands",
    "description": "Bộ đôi hoàn hảo giữa bánh phô mai mềm mịn hòa quyện hương cà phê và thức uống đá xay thanh mát từ trà xanh thượng hạng.",
    "originalPrice": 90000,
    "discountPrice": 38000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0004-4000-8000-000000000004",
    "merchantId": "b1ead7a1-0001-4000-8000-000000000001",
    "merchantName": "BreadTalk - Vincom Bà Triệu",
    "name": "Túi Bánh Mì Chà Bông Phô Mai Cay & Danish Trái Cây",
    "description": "Bánh mì chà bông Flosss huyền thoại số 1 Singapore kết hợp cùng bánh Danish hoa quả ngọt dịu giòn xốp.",
    "originalPrice": 125000,
    "discountPrice": 45000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0005-4000-8000-000000000005",
    "merchantId": "b1ead7a1-0002-4000-8000-000000000002",
    "merchantName": "Paris Baguette - Tràng Tiền Plaza",
    "name": "Túi Bánh Mì Nướng Kiểu Âu & Bánh Ngọt Kem Bơ Paris",
    "description": "Thưởng thức phong vị Paris đích thực với bánh mì vỏ giòn ruột mềm và bánh pastry bơ hảo hạng tan ngay nơi đầu lưỡi.",
    "originalPrice": 160000,
    "discountPrice": 59000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0006-4000-8000-000000000006",
    "merchantId": "b1ead7a1-0003-4000-8000-000000000003",
    "merchantName": "Sapo Bakery - Quang Trung Hà Đông",
    "name": "Túi Bánh Su Kem Vani & Bánh Mì Bơ Tỏi Sapo",
    "description": "Bánh su kem mềm ngập nhân vani béo ngậy kèm bánh mì bơ tỏi nướng thơm lừng, món quà ẩm thực ngọt ngào ấm áp.",
    "originalPrice": 90000,
    "discountPrice": 32000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0007-4000-8000-000000000007",
    "merchantId": "b1ead7a1-0004-4000-8000-000000000004",
    "merchantName": "Anh Hòa Bakery - Cầu Giấy",
    "name": "Túi Bánh Mì Ngũ Cốc Dinh Dưỡng & Mousse Chanh Leo",
    "description": "Bánh mì ngũ cốc nguyên cám tốt cho sức khỏe đi kèm lát bánh mousse hoa quả tươi dịu nhẹ, dinh dưỡng lành mạnh cho mọi lứa tuổi.",
    "originalPrice": 115000,
    "discountPrice": 42000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0008-4000-8000-000000000008",
    "merchantId": "b1ead7a1-0005-4000-8000-000000000005",
    "merchantName": "Phúc Long Coffee & Tea - Lotte Center Liễu Giai",
    "name": "Túi Trà Ô Long Sữa Đặc Sản & Bánh Nướng Phúc Long",
    "description": "Trà Ô Long sữa trứ danh với vị chát nhẹ ngọt hậu đậm đà hòa quyện cùng bánh nướng tươi ngon ấm nóng.",
    "originalPrice": 105000,
    "discountPrice": 42000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:45",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0009-4000-8000-000000000009",
    "merchantId": "b1ead7a1-0006-4000-8000-000000000006",
    "merchantName": "Katinat Saigon Kafe - Lý Thường Kiệt",
    "name": "Túi Trà Oolong Tứ Quý & Bánh Sừng Bò Nướng Katinat",
    "description": "Trà sữa Oolong thơm lừng hương hoa cỏ cao nguyên đi kèm bánh sừng bò nướng bơ xốp giòn chuẩn vị boutique.",
    "originalPrice": 110000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0010-4000-8000-000000000010",
    "merchantId": "b1ead7a1-0007-4000-8000-000000000007",
    "merchantName": "The Coffee House - Thái Hà",
    "name": "Túi Cà Phê Espresso Đậm Vị & Bánh Tươi The Coffee House",
    "description": "Cà phê rang mộc chuẩn gu Việt kèm bánh ngọt nướng thơm béo, trọn vẹn những phút giây thư thái và kết nối ấm cúng.",
    "originalPrice": 95000,
    "discountPrice": 38000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0011-4000-8000-000000000011",
    "merchantId": "b1ead7a1-0008-4000-8000-000000000008",
    "merchantName": "Cộng Cà Phê - Nhà Thờ",
    "name": "Túi Cà Phê Cốt Dừa Thơm Béo & Croissant Nướng Mộc",
    "description": "Cà phê cốt dừa đá xay trứ danh béo ngọt sánh mịn kết hợp bánh croissant nướng mộc mạc thơm lừng góc phố.",
    "originalPrice": 90000,
    "discountPrice": 35000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0012-4000-8000-000000000012",
    "merchantId": "b1ead7a1-0009-4000-8000-000000000009",
    "merchantName": "Starbucks Coffee - Nhà Thờ Lớn",
    "name": "Túi Bánh Nướng Thượng Hạng & Cà Phê Cold Brew Starbucks",
    "description": "Cà phê ủ lạnh thanh mát hương hoa quả kèm bánh nướng bơ muffin hoặc cookie nướng chuẩn chất lượng Starbucks quốc tế.",
    "originalPrice": 165000,
    "discountPrice": 65000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0013-4000-8000-000000000013",
    "merchantId": "b1ead7a1-0010-4000-8000-000000000010",
    "merchantName": "Phê La - Hàng Cót",
    "name": "Túi Trà Ô Long Đặc Sản Đà Lạt & Bánh Mì Mềm Phê La",
    "description": "Trà Ô Long thủ công rang khói đậm hậu ngọt ngào đi cùng bánh mì mềm mịn thơm bơ nướng ấm áp trong ngày.",
    "originalPrice": 110000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0014-4000-8000-000000000014",
    "merchantId": "b1ead7a1-0011-4000-8000-000000000011",
    "merchantName": "Cheese Coffee - Lê Duẩn",
    "name": "Túi Trà Phô Mai Kem Béo & Bánh Pastry Giòn Rụm",
    "description": "Lớp foam phô mai mặn béo ngậy trên nền trà thơm ngát kết hợp cùng bánh nướng bơ giòn rụm cuốn hút bất tận.",
    "originalPrice": 115000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "a51a723e-e333-4374-9245-d0b0dfc7d0eb",
    "merchantId": "2f207531-63ee-4650-b3ef-71282d3e91c3",
    "merchantName": "Trà Sữa TocoToco - Hồ Tùng Mậu",
    "name": "Túi Trà Sữa Trân Châu Hoàng Gia & Trà Trái Cây TocoToco",
    "description": "Trà sữa thơm ngậy cùng trân châu sắn dẻo dai từ nông sản sạch Việt Nam và trà hoa quả nhiệt đới tươi mát thanh lọc.",
    "originalPrice": 80000,
    "discountPrice": 29000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "5ae47709-4ceb-4aa9-b77e-284ef5a7c0e6",
    "merchantId": "ac5987b4-c50f-4e33-ae1b-42c7a78c74cc",
    "merchantName": "Dairy Queen - Chùa Láng",
    "name": "Túi Kem Úp Ngược Blizzard & Bánh Kem Lạnh Dairy Queen",
    "description": "Kem úp ngược Blizzard trứ danh với topping Oreo giòn rụm và bánh kem lạnh béo mịn ngọt lịm khó quên.",
    "originalPrice": 110000,
    "discountPrice": 42000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "59d0f42d-c280-4b54-bd23-0b4a8b669fe8",
    "merchantId": "6c2a82a7-0ecd-43f3-bf7d-a74bc7e4a0d5",
    "merchantName": "Baskin-Robbins - Tây Hồ",
    "name": "Túi Kem Thượng Hạng Baskin-Robbins & Waffle Giòn",
    "description": "Tuyển chọn các vị kem sữa cao cấp trứ danh thế giới kèm bánh quế nướng giòn tan béo thơm, ngọt lành sảng khoái.",
    "originalPrice": 140000,
    "discountPrice": 49000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "15776100-8c1c-410a-8b6a-1b7602670f70",
    "merchantId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "merchantName": "WinMart+ - Green Stars Phạm Văn Đồng",
    "name": "Túi Nông Sản Hữu Cơ & Nấm Tươi VietGAP",
    "description": "Nông sản sạch tuyển chọn gồm rau xanh an toàn, nấm tươi và củ quả tươi ngon đạt tiêu chuẩn chất lượng VietGAP trong ngày.",
    "originalPrice": 100000,
    "discountPrice": 35000,
    "category": "vegetarian",
    "imageUrl": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "9ff75bc9-8339-4cb6-9fe2-1907bc2bd4f3",
    "merchantId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "merchantName": "WinMart+ - Green Stars Phạm Văn Đồng",
    "name": "Túi Bách Hóa Tiêu Chuẩn & Nhu Yếu Phẩm Gia Đình",
    "description": "Thực phẩm tiện lợi, sữa tươi tiệt trùng và các nhu yếu phẩm dinh dưỡng chất lượng cho bữa ăn gia đình tiện lợi.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0015-4000-8000-000000000015",
    "merchantId": "b1ead7a1-0012-4000-8000-000000000012",
    "merchantName": "WinMart+ - Times City Minh Khai",
    "name": "Túi Rau Xanh Hữu Cơ An Toàn & Trái Cây Tươi Mùa Mới",
    "description": "Trái cây ngọt mát và rau xanh tươi non chuẩn VietGAP, bảo đảm nguồn dinh dưỡng xanh và vitamin tinh khiết cho cả nhà.",
    "originalPrice": 110000,
    "discountPrice": 39000,
    "category": "vegetarian",
    "imageUrl": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0016-4000-8000-000000000016",
    "merchantId": "b1ead7a1-0013-4000-8000-000000000013",
    "merchantName": "GS25 - Duy Tân",
    "name": "Túi Cơm Nắm Tam Giác Onigiri & Sandwich Tiện Lợi GS25",
    "description": "Cơm nắm tam giác rong biển nhân cá ngừ sốt mayo, sandwich tươi ngon và xúc xích nướng tiện lợi chuẩn vị Hàn.",
    "originalPrice": 85000,
    "discountPrice": 32000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0017-4000-8000-000000000017",
    "merchantId": "b1ead7a1-0014-4000-8000-000000000014",
    "merchantName": "Circle K - Hoàng Đạo Thúy",
    "name": "Túi Bữa Sáng Năng Lượng & Thức Uống Đóng Chai Circle K",
    "description": "Bánh bao nóng hổi hoặc xúc xích nướng vàng ruộm kèm nước ép trái cây giải khát, bữa phụ tiếp sức năng động tức thì.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0018-4000-8000-000000000018",
    "merchantId": "b1ead7a1-0015-4000-8000-000000000015",
    "merchantName": "7-Eleven - Landmark 72 Phạm Hùng",
    "name": "Túi Món Ngon Nóng Hổi & Bánh Ngọt Tiện Lợi 7-Eleven",
    "description": "Cơm hộp Bento nóng sốt đậm đà cùng bánh mì mềm ngọt ngào mang thương hiệu tiện ích toàn cầu 7-Eleven.",
    "originalPrice": 80000,
    "discountPrice": 30000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "bac70001-0019-4000-8000-000000000019",
    "merchantId": "b1ead7a1-0016-4000-8000-000000000016",
    "merchantName": "Annam Gourmet Market - Syrena Tây Hồ",
    "name": "Túi Phô Mai Nhập Khẩu & Trái Cây Hữu Cơ Cao Cấp",
    "description": "Trải nghiệm ẩm thực phong vị châu Âu cao cấp với phô mai Brie hảo hạng, nho tươi hữu cơ và bánh quy mặn giòn giã.",
    "originalPrice": 250000,
    "discountPrice": 89000,
    "category": "vegetarian",
    "imageUrl": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "5a650b75-b805-4fff-a91c-8800623ab25e",
    "merchantId": "bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7",
    "merchantName": "Cơm Niêu Singapore KOMBO - Duy Tân",
    "name": "Túi Cơm Niêu Singapore Bò Nướng Sốt Tiêu Đen",
    "description": "Lớp cháy giòn tan vàng rộm hai mặt hòa quyện cùng thịt bò mềm mọng sốt tiêu đen đậm đà và canh rau xanh thanh mát.",
    "originalPrice": 110000,
    "discountPrice": 42000,
    "category": "meat",
    "imageUrl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "931b7eb7-5d18-449a-87f6-1747e9bcfbc5",
    "merchantId": "db669945-636b-4538-84be-568185e22b13",
    "merchantName": "Cơm Thố Bách Khoa - Trần Cung",
    "name": "Túi Cơm Thố Xá Xíu Quảng Đông & Canh Rong Biển Nóng",
    "description": "Cơm thố nóng giòn cháy đáy chuẩn vị, thịt xá xíu thơm lừng ngọt mềm đẫm sốt ăn kèm kim chi và canh rong biển thanh ngọt.",
    "originalPrice": 85000,
    "discountPrice": 32000,
    "category": "meat",
    "imageUrl": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "b673df8e-2657-4d5c-bc32-3839100fc7f4",
    "merchantId": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "merchantName": "Nhà Hàng Chay Vị Lai - Lý Thường Kiệt",
    "name": "Túi Mỹ Vị Chay Vị Lai: Súp Nấm Rừng & Cơm Lá Sen",
    "description": "Tuyệt tác ẩm thực thực dưỡng với súp nấm rừng thanh mát bổ dưỡng và cơm bọc lá sen thơm dịu tao nhã, cân bằng thân tâm.",
    "originalPrice": 150000,
    "discountPrice": 55000,
    "category": "vegetarian",
    "imageUrl": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "2c6f95b8-37f6-4ad2-bfaf-b2550cb8035c",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cơm Chay Thực Dưỡng Hạt Sen & Nấm Kho Tiêu",
    "description": "Cơm gạo lứt dẻo thơm kết hợp nấm đùi gà kho tiêu đậm đà, đậu hũ sốt cà chua và canh rau củ thanh ngọt thanh lọc cơ thể.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "vegetarian",
    "imageUrl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "ffdae2e8-2df4-4547-88b2-20be1ca1ec79",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Bún Nem Nấm Chay Giòn Rụm & Giò Lụa Chay",
    "description": "Nem nấm chay giòn rụm rán vàng ươm chấm nước mắm chay chua ngọt vừa miệng, ăn kèm bún tươi và rau thơm thanh mát.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "vegetarian",
    "imageUrl": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "7a110000-0000-0000-0000-000000000003",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Lẩu Nấm Dưỡng Sinh & Đậu Hũ Non Thanh Tịnh",
    "description": "Nước dùng nấm hầm ngọt tự nhiên từ thảo mộc, nấm tươi thập cẩm cùng đậu hũ non mềm mượt cho bữa ăn chay trọn vẹn yêu thương.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "vegetarian",
    "imageUrl": "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "7a110000-0000-0000-0000-000000000004",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Chè Tuyết Yến Dưỡng Nhan & Nước Sâm Hạt Chia",
    "description": "Món tráng miệng thanh mát với tuyết yến, táo đỏ, hạt sen ninh mềm và nước sâm thanh nhiệt tự nhiên giải tỏa âu lo.",
    "originalPrice": 60000,
    "discountPrice": 22000,
    "category": "beverage",
    "imageUrl": "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "c101a5bd-472a-4135-a948-ad8c50b8e121",
    "merchantId": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "merchantName": "McDonald's - Nguyễn Trãi Q1",
    "name": "Túi Gà Rán Giòn Rụm & Bánh Táo Nướng McDonald's",
    "description": "Gà rán da giòn rụm bên ngoài mọng nước bên trong kèm bánh táo nướng vỏ quế thơm lừng và tương chua ngọt đặc trưng McDonald’s.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "e59e4220-3882-4f02-95e3-21d51abe796d",
    "merchantId": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "merchantName": "McDonald's - Nguyễn Trãi Q1",
    "name": "Túi Burger Bò Nướng Phô Mai & Khoai Tây Chiên McDonald's",
    "description": "Burger bò nướng lửa thơm khói quyện cùng phô mai cheddar béo ngậy và phần khoai tây chiên vàng giòn rụm chuẩn phong cách Mỹ.",
    "originalPrice": 130000,
    "discountPrice": 49000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "d5bd05a9-7324-4493-a6e6-489e30f6d573",
    "merchantId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "merchantName": "KFC Vietnam - Bến Nghé Q1",
    "name": "Túi Gà Giòn Cay Đặc Biệt & Khoai Tây Lắc Phô Mai KFC",
    "description": "Gà rán KFC công thức 11 loại thảo mộc huyền thoại giòn cay bốc khói cùng phần khoai tây chiên lắc bột phô mai thơm ngậy lôi cuốn.",
    "originalPrice": 125000,
    "discountPrice": 46000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "5f637281-5d7e-478f-8b58-330ed5eb2326",
    "merchantId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "merchantName": "KFC Vietnam - Bến Nghé Q1",
    "name": "Túi Bánh Trứng Egg Tart Nướng & Burger Zinger KFC",
    "description": "Bánh trứng Egg Tart nướng thơm lừng lớp vỏ ngàn lớp giòn tan nhân kem trứng béo ngậy kèm burger phi-lê gà cay Zinger nức tiếng.",
    "originalPrice": 115000,
    "discountPrice": 42000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "03aa4b45-1c0a-4b5b-9419-8ca44123b842",
    "merchantId": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "merchantName": "Lotteria - Nguyễn Huệ Q1",
    "name": "Túi Gà Rán Giòn Cay & Khoai Tây Chiên Lotteria",
    "description": "Gà rán truyền thống vỏ giòn rụm thịt mềm ngọt mọng nước kèm khoai tây chiên giòn tan và tương cà chua ngọt đậm đà chuẩn vị Lotteria.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "16eaa1e9-b4ca-46c9-a779-aca11b6bd567",
    "merchantId": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "merchantName": "Lotteria - Nguyễn Huệ Q1",
    "name": "Túi Burger Tôm Hải Sản & Phô Mai Que Lotteria",
    "description": "Burger tôm tươi ngọt thịt phủ xốt Tartar béo nhẹ cùng phô mai que Mozzarella chiên vàng kéo sợi hấp dẫn bất tận.",
    "originalPrice": 110000,
    "discountPrice": 40000,
    "category": "other",
    "imageUrl": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  },
  {
    "id": "2fd22156-be49-4567-8cd1-e89a168e541b",
    "merchantId": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "merchantName": "Domino's Pizza - Liễu Giai",
    "name": "Túi Pizza Hải Sản Xốt Mayonnaise & Bánh Mì Bơ Tỏi Domino's",
    "description": "Pizza hải sản tươi với sốt mayonnaise ngậy thơm phủ lớp phô mai Mozzarella dẻo thơm đi kèm bánh mì bơ tỏi nướng giòn rụm.",
    "originalPrice": 160000,
    "discountPrice": 59000,
    "category": "bakery",
    "imageUrl": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:45:15.674Z"
  }
];

export const customerService = {
  getStaticHome() {
    return {
      banners: HOME_BANNERS,
      categories: HOME_CATEGORIES,
      brands: [],
      merchants: [],
      bags: [],
    };
  },

  async getHome(coords?: { lat: number; lng: number }) {
    const lat = coords?.lat ?? 21.0535;
    const lng = coords?.lng ?? 105.7820;
    const coordsKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;

    // Tránh duplicate API calls song song khi cùng vị trí
    if (inFlightHomePromise && lastHomeCoordsKey === coordsKey) {
      return inFlightHomePromise;
    }

    lastHomeCoordsKey = coordsKey;
    inFlightHomePromise = (async () => {
      let remoteStores: Merchant[] = [];
      let remoteBags: SurpriseBag[] = [];

      try {
        // Chạy song song cả truy vấn stores và bags từ Supabase với các cột chọn lọc tối ưu băng thông
        const [rawStores, bagsSource] = await Promise.all([
          (async () => {
            try {
              const { data: directStores, error: storesErr } = await supabase
                .from('stores')
                .select('id, name, description, phone, address, logo_url, banner_url, rating, total_ratings, is_open, open_time, close_time, latitude, longitude')
                .limit(50);
              if (!storesErr && Array.isArray(directStores)) return directStores;

              const { data: storesData } = await supabase.rpc('list_stores_nearby', {
                p_lat: lat,
                p_lng: lng,
                p_radius: 500000,
                p_category: null,
                p_page: 1,
                p_limit: 50,
              });
              return Array.isArray(storesData) ? storesData : [];
            } catch {
              return [];
            }
          })(),

          (async () => {
            try {
              const { data: directBags, error: bagsErr } = await supabase
                .from('surprise_bags')
                .select('id, store_id, name, description, original_price, discount_price, category, image_url, quantity, max_quantity, pickup_start, pickup_end, is_available, expires_at, created_at, bag_type, repeat_mode, daily_quota, expiry_date, status, stores(id, name, logo_url, banner_url, address, latitude, longitude, rating, total_ratings)')
                .eq('is_available', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(50);
              if (!bagsErr && Array.isArray(directBags)) return directBags;

              const { data: nearbyBags } = await supabase.rpc('list_bags_nearby', {
                p_lat: lat,
                p_lng: lng,
                p_radius: 500000,
                p_category: null,
                p_page: 1,
                p_limit: 50,
              });
              return Array.isArray(nearbyBags) ? nearbyBags : [];
            } catch {
              return [];
            }
          })(),
        ]);

      if (rawStores.length > 0) {
        remoteStores = rawStores.map((s: any) => {
          const storeLat = s.latitude != null ? Number(s.latitude) : undefined;
          const storeLng = s.longitude != null ? Number(s.longitude) : undefined;

          let distM = 500;
          if (typeof storeLat === 'number' && typeof storeLng === 'number') {
            const distKm = calculateDistanceKm([lng, lat], [storeLng, storeLat]);
            distM = Math.round(distKm * 1000);
          }

          return {
            id: s.id,
            brandId: s.id,
            name: s.name,
            description: s.description || 'Quán ăn đối tác GoSavingFood',
            phone: s.phone || '+849****0000',
            address: s.address || 'Việt Nam',
            logo: getStoreLogo(s.logo_url),
            banner: getStoreBanner(s.banner_url),
            rating: typeof s.rating === 'number' ? Number(s.rating) : 0,
            totalRatings: typeof s.total_ratings === 'number' ? Number(s.total_ratings) : 0,
            distance: distM,
            status: 'active' as const,
            isOpen: s.is_open ?? true,
            openingHours: `${s.open_time?.slice(0, 5) || '07:00'} - ${s.close_time?.slice(0, 5) || '20:00'}`,
            latitude: storeLat,
            longitude: storeLng,
          };
        });
      }

      if (bagsSource.length > 0) {
        remoteBags = bagsSource
          .map((b: any) => ({
            id: b.id,
            merchantId: b.store_id,
            merchantName: b.store_name || b.stores?.name || 'Quán đối tác',
            name: b.name,
            description: b.description || 'Túi cứu trợ thực phẩm xanh',
            originalPrice: Number(b.original_price) || 50000,
            discountPrice: Number(b.discount_price) || 30000,
            category: normalizeCategory(b.category),
            imageUrl: b.image_url || getBagImage(b.name, null),
            quantity: Number(b.quantity) || 5,
            maxQuantity: Number(b.max_quantity) || 2,
            pickupStart: b.pickup_start?.slice(0, 5) || '11:00',
            pickupEnd: b.pickup_end?.slice(0, 5) || '14:00',
            bagType: b.bag_type || 'daily',
            repeatMode: b.repeat_mode || 'today_only',
            dailyQuota: b.daily_quota != null ? Number(b.daily_quota) : undefined,
            expiryDate: b.expiry_date || undefined,
            status: b.status || 'active',
            isAvailable: b.is_available ?? true,
            expiresAt: b.expires_at || undefined,
            rating: b.stores?.rating != null ? Number(b.stores.rating) : (typeof b.rating === 'number' ? Number(b.rating) : 4.8),
            createdAt: b.created_at,
          }))
          .filter(isBagVisibleOnMarket);

        remoteBags.sort((a: any, b: any) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    } catch (err) {
      console.warn('Lấy dữ liệu Supabase getHome lỗi:', err);
    }

    // 1. Tính khoảng cách thực tế đến các cửa hàng Hà Nội fallback
    const hanoiStoresWithDistance: Merchant[] = HANOI_STORES.map((s) => {
      const distKm = calculateDistanceKm([lng, lat], [s.longitude!, s.latitude!]);
      return {
        ...s,
        distance: Math.round(distKm * 1000),
      };
    });

    // 2. Kết hợp toàn bộ cửa hàng (Dữ liệu Supabase ưu tiên hàng đầu, loại bỏ trùng lặp)
    const storeMap = new Map<string, Merchant>();
    for (const s of remoteStores) {
      storeMap.set(s.id, s);
      storeMap.set(s.name, s);
    }
    for (const s of hanoiStoresWithDistance) {
      if (!storeMap.has(s.id) && !storeMap.has(s.name)) {
        storeMap.set(s.id, s);
      }
    }
    const allStores = Array.from(new Set(storeMap.values()));
    allStores.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

    // 3. Kết hợp túi mù (Dữ liệu Supabase ưu tiên hàng đầu, loại bỏ trùng lặp)
    const bagMap = new Map<string, SurpriseBag>();
    for (const b of remoteBags) {
      bagMap.set(b.id, b);
      bagMap.set(b.name, b);
    }
    for (const b of HANOI_BAGS) {
      if (!bagMap.has(b.id) && !bagMap.has(b.name)) {
        bagMap.set(b.id, b);
      }
    }
    const allBags = Array.from(new Set(bagMap.values())).filter(isBagVisibleOnMarket);

    // Ưu tiên hiển thị túi từ các cửa hàng gần vị trí người dùng nhất
    allBags.sort((a, b) => {
      const storeA = storeMap.get(a.merchantId);
      const storeB = storeMap.get(b.merchantId);
      return (storeA?.distance ?? 999999) - (storeB?.distance ?? 999999);
    });

    const seenBrandNames = new Set<string>();
    const brands: Brand[] = [];
    for (const m of allStores) {
      const baseName = m.name.split(' - ')[0].trim();
      if (!seenBrandNames.has(baseName) && m.logo && (m.logo.startsWith('http') || m.logo.startsWith('data:'))) {
        seenBrandNames.add(baseName);
        brands.push({
          id: m.id,
          name: baseName,
          logo: m.logo,
          description: m.description,
          rating: m.rating,
          totalRatings: m.totalRatings,
          totalStores: allStores.filter((s) => s.name.split(' - ')[0].trim() === baseName).length,
          categories: ['Ẩm Thực', 'Đặc Sản', 'F&B'],
          sustainabilityMessage: 'Đồng hành cùng GoSavingFood giảm lãng phí thực phẩm mỗi ngày.',
        });
      }
    }

      return {
        banners: HOME_BANNERS,
        categories: HOME_CATEGORIES,
        brands,
        merchants: allStores,
        bags: allBags,
      };
    })();

    try {
      return await inFlightHomePromise;
    } finally {
      inFlightHomePromise = null;
    }
  },

  async getBag(id: string) {
    try {
      const { data } = await supabase
        .from('surprise_bags')
        .select('*, stores(id, name, logo_url, banner_url, address, latitude, longitude, rating, total_ratings)')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (data) {
        return {
          id: data.id,
          merchantId: data.store_id,
          merchantName: data.stores?.name || 'Quán đối tác',
          name: data.name,
          description: data.description || '',
          originalPrice: Number(data.original_price),
          discountPrice: Number(data.discount_price),
          category: (data.category as Exclude<FoodCategory, 'all'>) || 'vegetarian',
          imageUrl: data.image_url || getBagImage(data.name, null),
          quantity: Number(data.quantity) || 1,
          maxQuantity: Number(data.max_quantity) || 2,
          pickupStart: data.pickup_start?.slice(0, 5) || '11:00',
          pickupEnd: data.pickup_end?.slice(0, 5) || '14:00',
          bagType: data.bag_type || 'daily',
          repeatMode: data.repeat_mode || 'today_only',
          dailyQuota: data.daily_quota != null ? Number(data.daily_quota) : undefined,
          expiryDate: data.expiry_date || undefined,
          status: data.status || 'active',
          isAvailable: data.is_available ?? true,
          expiresAt: data.expires_at || undefined,
          rating: Number(data.stores?.rating) || (typeof data.rating === 'number' && data.rating > 0 ? Number(data.rating) : 4.9),
        } satisfies SurpriseBag;
      }
    } catch (err) {
      console.warn('getBag Supabase lỗi:', err);
    }

    return null;
  },

  async getMerchant(id: string) {
    try {
      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      const { data: bags } = await supabase
        .from('surprise_bags')
        .select('*')
        .eq('store_id', id)
        .eq('is_available', true)
        .neq('status', 'archived')
        .neq('status', 'expired')
        .is('deleted_at', null);

      if (store) {
        const merchant: Merchant = {
          id: store.id,
          brandId: store.id,
          name: store.name,
          description: store.description || '',
          phone: store.phone || '',
          address: store.address || '',
          logo: getStoreLogo(store.logo_url),
          banner: getStoreBanner(store.banner_url),
          rating: typeof store.rating === 'number' ? Number(store.rating) : 0,
          totalRatings: typeof store.total_ratings === 'number' ? Number(store.total_ratings) : 0,
          distance: 500,
          status: 'active',
          isOpen: store.is_open ?? true,
          openingHours: `${store.open_time?.slice(0, 5) || '07:00'} - ${store.close_time?.slice(0, 5) || '20:00'}`,
          latitude: store.latitude != null ? Number(store.latitude) : undefined,
          longitude: store.longitude != null ? Number(store.longitude) : undefined,
        };

        const mappedBags: SurpriseBag[] = (bags || [])
          .map((b: any) => ({
            id: b.id,
            merchantId: b.store_id,
            merchantName: store.name,
            name: b.name,
            description: b.description || '',
            originalPrice: Number(b.original_price),
            discountPrice: Number(b.discount_price),
            category: (b.category as Exclude<FoodCategory, 'all'>) || 'vegetarian',
            imageUrl: b.image_url || getBagImage(b.name, null),
            quantity: Number(b.quantity),
            maxQuantity: Number(b.max_quantity) || 2,
            pickupStart: b.pickup_start?.slice(0, 5) || '11:00',
            pickupEnd: b.pickup_end?.slice(0, 5) || '14:00',
            bagType: b.bag_type || 'daily',
            repeatMode: b.repeat_mode || 'today_only',
            dailyQuota: b.daily_quota != null ? Number(b.daily_quota) : undefined,
            expiryDate: b.expiry_date || undefined,
            status: b.status || 'active',
            isAvailable: b.is_available ?? true,
            expiresAt: b.expires_at || undefined,
            rating: typeof store.rating === 'number' && store.rating > 0 ? Number(store.rating) : 4.9,
          }))
          .filter(isBagVisibleOnMarket);

        return { merchant, bags: mappedBags };
      }
    } catch (err) {
      console.warn('getMerchant Supabase lỗi:', err);
    }

    return { merchant: null, bags: [] };
  },

  async getBrand(id: string) {
    const { merchant } = await this.getMerchant(id);
    if (!merchant) return { brand: null, stores: [] };

    const brand: Brand = {
      id: merchant.id,
      name: merchant.name,
      logo: merchant.logo,
      description: merchant.description,
      rating: merchant.rating,
      totalStores: 1,
      categories: ['Món Chay', 'Healthy'],
      sustainabilityMessage: 'Cùng GoSavingFood giảm lãng phí thực phẩm mỗi ngày.',
    };
    return { brand, stores: [merchant] };
  },

  async getOrders(userId?: string): Promise<Order[]> {
    let currentUserId = userId;
    if (!currentUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    if (!currentUserId) {
      return [];
    }

    let localOrders: Order[] = [];
    try {
      const key = `gsf_local_orders_${currentUserId}`;
      localOrders = JSON.parse(localStorage.getItem(key) || '[]');
    } catch {}

    try {
      const query = supabase
        .from('orders')
        .select(
          `
          *,
          stores (name, address, phone, logo_url),
          order_items (*, surprise_bags (image_url)),
          reviews (*)
        `
        )
        .eq('customer_id', currentUserId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        let hasOverdueOrders = false;
        const remoteOrders = data.map((o: any) => {
          const rev = Array.isArray(o.reviews) ? o.reviews[0] : o.reviews;
          const isOverdue =
            o.status === 'pending_payment' &&
            o.payment_expires_at &&
            new Date(o.payment_expires_at).getTime() <= Date.now();

          if (isOverdue) hasOverdueOrders = true;

          const normalizedStatus = isOverdue
            ? 'expired'
            : o.status === 'picked_up'
            ? 'completed'
            : o.status;

          return {
            id: o.id,
            orderCode: o.order_code || `GSF-${o.id.slice(0, 6).toUpperCase()}`,
            merchantId: o.store_id,
            merchantName: o.stores?.name || 'Quán đối tác',
            items: (o.order_items || []).map((item: any) => ({
              bagId: item.bag_id,
              bagName: item.bag_name || 'Túi cứu trợ thực phẩm',
              imageUrl:
                item.surprise_bags?.image_url ||
                item.image_url ||
                'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
              quantity: item.quantity,
              unitPrice: item.unit_price,
              totalPrice: item.total_price || item.unit_price * item.quantity,
            })),
            totalOriginalPrice: Number(o.total_original_price) || Number(o.final_amount),
            totalDiscountPrice: Number(o.total_discount_price) || Number(o.final_amount),
            discountAmount: Number(o.discount_amount) || 0,
            finalAmount: Number(o.final_amount) || 0,
            status: normalizedStatus,
            paymentMethod: o.payment_method === 'cash' ? 'payos_vietqr' : (o.payment_method || 'payos_vietqr'),
            paymentStatus: o.payment_status || (o.status === 'pending_payment' ? 'pending' : 'success'),
            pickupTime: o.pickup_time || '11:00 - 14:00',
            pickupAddress: o.stores?.address || 'Hà Nội',
            createdAt: o.created_at,
            paidAt: o.paid_at || undefined,
            completedAt: o.completed_at || undefined,
            cancelledAt: o.cancelled_at || undefined,
            cancelReason: isOverdue ? 'Hết thời hạn thanh toán (TTL 30 phút)' : (o.cancel_reason || undefined),
            note: o.note || undefined,
            qrCode: o.qr_code || `GSF-ORDER-${o.id}`,
            pickupToken: o.pickup_token || undefined,
            recipientName: o.recipient_name || undefined,
            recipientPhone: o.recipient_phone || undefined,
            paymentExpiresAt: o.payment_expires_at || undefined,
            review: rev
              ? {
                  rating: Number(rev.rating) || 5,
                  tags: Array.isArray(rev.tags) ? rev.tags : undefined,
                  comment: rev.comment || '',
                  createdAt: rev.created_at || o.created_at,
                }
              : undefined,
          };
        });

        if (hasOverdueOrders) {
          void customerService.cleanupExpiredPendingOrders();
        }

        const remoteIdSet = new Set((remoteOrders || []).map((o: any) => String(o.id).toLowerCase()));
        const validLocalOrders = localOrders.filter((l: any) => !remoteIdSet.has(String(l.id).toLowerCase()));
        return [...validLocalOrders, ...remoteOrders];
      }
    } catch (err) {
      console.warn('Lấy đơn hàng từ Supabase lỗi:', err);
    }
    return localOrders;
  },

  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        return data.map((n: any) => ({
          id: n.id,
          icon: n.icon || 'system',
          title: n.title || 'Thông báo',
          body: n.body || '',
          time: formatRelativeTime(n.created_at),
          read: Boolean(n.is_read),
          data: n.data || null,
        }));
      }
      if (error) console.warn('Lấy thông báo từ Supabase lỗi:', error.message);
    } catch (err) {
      console.warn('Lấy thông báo từ Supabase lỗi:', err);
    }
    return [];
  },

  async markNotificationRead(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) console.warn('Đánh dấu đã đọc thông báo lỗi:', error.message);
      return !error;
    } catch (err) {
      console.warn('Đánh dấu đã đọc thông báo lỗi:', err);
      return false;
    }
  },

  async markAllNotificationsRead(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) console.warn('Đánh dấu đã đọc thông báo lỗi:', error.message);
      return !error;
    } catch (err) {
      console.warn('Đánh dấu đã đọc thông báo lỗi:', err);
      return false;
    }
  },

  subscribeToCustomerUpdates(
    userId: string,
    onOrderChange: (payload: any) => void,
    onNotificationChange: (payload: any) => void
  ) {
    return supabase
      .channel(`customer-realtime-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime Customer] Order changed:', payload.eventType, (payload.new as any)?.status);
          onOrderChange(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime Customer] Notification received:', (payload.new as any)?.title);
          onNotificationChange(payload);
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn('[Realtime Customer] Channel subscription error:', err);
        else console.log('[Realtime Customer] Channel status:', status);
      });
  },

  async getVouchers(): Promise<Voucher[]> {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('is_active', true);
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((v: any) => ({
          id: v.id,
          code: v.code,
          description: v.description || 'Ưu đãi GoSavingFood',
          discountValue: Number(v.discount_value),
          minOrderValue: Number(v.min_order_value) || 0,
          isActive: v.is_active,
        }));
      }
    } catch {
      // Lỗi truy vấn vouchers -> trả rỗng
    }
    return [];
  },

  async searchLocations(query: string, proximity?: [number, number]): Promise<LocationSuggestion[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Tìm kiếm đồng thời: Cửa hàng đối tác trong DB + Địa điểm từ Mapbox Search Box
    const [storeRes, mapboxResults] = await Promise.all([
      (async () => {
        try {
          return await supabase
            .from('stores')
            .select('id, name, address, latitude, longitude')
            .or(`name.ilike.%${trimmed}%,address.ilike.%${trimmed}%`)
            .limit(3);
        } catch {
          return { data: null };
        }
      })(),
      mapboxService.searchPlaces(trimmed, proximity).catch(() => []),
    ]);


    const storeSuggestions: LocationSuggestion[] = [];
    if (storeRes && 'data' in storeRes && Array.isArray(storeRes.data)) {
      storeRes.data.forEach((s: any) => {
        if (!s.latitude || !s.longitude) return;
        const coords: [number, number] = [Number(s.longitude), Number(s.latitude)];
        let distanceText = 'Quán đối tác';
        if (proximity) {
          const km = calculateDistanceKm(proximity, coords);
          distanceText = formatDistance(km);
        }
        storeSuggestions.push({
          id: `store-${s.id}`,
          name: `🥡 ${s.name}`,
          address: s.address || 'Quán ăn đối tác GoSavingFood',
          distance: distanceText,
          coordinates: coords,
        });
      });
    }

    if (storeSuggestions.length > 0 || mapboxResults.length > 0) {
      return [...storeSuggestions, ...mapboxResults];
    }

    // 2. Fallback qua Supabase Edge Function nếu có
    try {
      const { data, error } = await supabase.functions.invoke('search-location', {
        body: { q: trimmed },
      });
      if (!error && data?.success && Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((item: any) => ({
          id: item.id || `loc-${Math.random()}`,
          name: item.name || item.address,
          address: item.address || item.name,
          distance: 'Khu vực bạn chọn',
        }));
      }
    } catch (err) {
      console.warn('search-location edge function fallback failed:', err);
    }

    return [];
  },

  /**
   * Lấy danh sách cửa hàng gần nhất theo tọa độ [lat, lng] dùng PostGIS RPC
   */
  async getStoresNearby(coords: { lat: number; lng: number }, radiusMeters = 50000) {
    let remoteStores: any[] = [];
    try {
      const { data, error } = await supabase.rpc('list_stores_nearby', {
        p_lat: coords.lat,
        p_lng: coords.lng,
        p_radius: radiusMeters,
        p_category: null,
        p_page: 1,
        p_limit: 30,
      });

      if (!error && Array.isArray(data)) {
        remoteStores = data.filter((s: any) => s.latitude && s.longitude);
      }
    } catch (err) {
      console.error('[CustomerService] list_stores_nearby failed:', err);
    }

    return remoteStores;
  },

  async getUser(): Promise<User | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      let dbName = '';
      let dbPhone = '';
      let dbAvatar = '';
      let hasDbUser = false;
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('name, phone, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (dbUser) {
          hasDbUser = true;
          dbName = dbUser.name || '';
          dbPhone = dbUser.phone || '';
          dbAvatar = dbUser.avatar_url || '';
        }
      } catch {
        // Bỏ qua lỗi truy vấn phụ, dùng metadata
      }

      const meta = user.user_metadata || {};
      const fallbackName =
        meta.custom_name || meta.full_name || meta.name || user.email?.split('@')[0] || 'Khách hàng';
      const fallbackAvatar =
        meta.avatar_url || meta.picture || meta.avatar || undefined;

      if (!hasDbUser) {
        try {
          await supabase.from('users').upsert(
            {
              id: user.id,
              email: user.email,
              name: fallbackName,
              phone: meta.phone || null,
              avatar_url: fallbackAvatar || null,
              role: 'customer',
            },
            { onConflict: 'id' }
          );
        } catch {
          // Bỏ qua lỗi DB nếu trigger đã tự xử lý
        }
      }

      return {
        id: user.id,
        name: dbName || fallbackName,
        phone: dbPhone || meta.phone || '',
        email: user.email,
        avatar: dbAvatar || fallbackAvatar,
      };
    } catch {
      return null;
    }
  },

  async loginWithGoogle() {
    const basePath = import.meta.env.BASE_URL || '/explore/';
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const redirectUrl = new URL(normalizedBase, window.location.origin).toString();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw new Error(error.message || 'Không thể đăng nhập bằng tài khoản Google.');
    }

    return data;
  },

  async login(identifier: string, password?: string) {
    const parsed = parseIdentifier(identifier);
    if (parsed.type === 'invalid') {
      throw new Error(parsed.errorMessage || 'Email hoặc số điện thoại không hợp lệ.');
    }

    let email = parsed.type === 'email' ? parsed.normalized : parsed.syntheticEmail!;
    if (parsed.type === 'phone') {
      try {
        const { data: realEmail } = await supabase.rpc('get_email_by_phone', {
          p_phone: parsed.phoneNational || parsed.raw,
        });
        if (realEmail) {
          email = realEmail;
        }
      } catch {
        // Fallback to synthetic email
      }
    }

    const pwd = password || 'Password123!';

    let { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });

    // Fallback: nếu tra ra email nhưng đăng nhập lỗi, thử với synthetic email
    if (signInError && parsed.type === 'phone' && email !== parsed.syntheticEmail && parsed.syntheticEmail) {
      const fallback = await supabase.auth.signInWithPassword({
        email: parsed.syntheticEmail,
        password: pwd,
      });
      if (!fallback.error) {
        signInData = fallback.data;
        signInError = null;
      }
    }

    if (signInError) {
      throw new Error(mapSupabaseAuthError(signInError));
    }

    if (signInData.user) {
      const u = signInData.user;
      const meta = u.user_metadata || {};
      const fullUser: User = {
        id: u.id,
        name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Khách hàng',
        phone: meta.phone || (parsed.type === 'phone' ? parsed.phoneNational : ''),
        email: u.email,
        avatar: meta.avatar_url || meta.picture || meta.avatar,
      };

      // Đảm bảo đồng bộ thông tin vào bảng public.users nếu thiếu
      try {
        await supabase.from('users').upsert(
          {
            id: u.id,
            email: u.email,
            name: fullUser.name,
            phone: fullUser.phone || null,
            role: 'customer',
          },
          { onConflict: 'id' }
        );
      } catch {
        // Không chặn tiến trình nếu DB RLS hoặc trigger đã tự xử lý
      }

      return fullUser;
    }

    throw new Error('Đăng nhập không thành công.');
  },

  /**
   * Bước 1 Đăng ký: Nhập thông tin & Supabase gửi mã OTP 6 số về Email
   */
  async registerInit(name: string, email: string, password?: string, phone?: string) {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Họ và tên phải có ít nhất 2 ký tự.');
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Địa chỉ email không đúng định dạng (ví dụ: ten@domain.com).');
    }

    let phoneNational = '';
    let phoneE164 = '';
    if (phone && phone.trim()) {
      const parsedPhone = parseIdentifier(phone);
      if (parsedPhone.type !== 'phone') {
        throw new Error(parsedPhone.errorMessage || 'Số điện thoại không đúng định dạng Việt Nam.');
      }
      phoneNational = parsedPhone.phoneNational!;
      phoneE164 = parsedPhone.phoneE164!;
    }

    const pwd = password || 'Password123!';
    if (pwd.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    // Đăng ký tài khoản. Supabase sẽ gửi mã xác thực OTP 6 số về email của người dùng
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: pwd,
      options: {
        data: {
          name: trimmedName,
          full_name: trimmedName,
          phone: phoneNational,
          phone_e164: phoneE164,
          role: 'customer',
        },
      },
    });

    if (signUpError) {
      throw new Error(mapSupabaseAuthError(signUpError));
    }

    // Nếu identities rỗng, Supabase báo hiệu email này đã tồn tại trong database
    if (signUpData.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
      throw new Error('Tài khoản với email này đã tồn tại trên hệ thống. Vui lòng chuyển sang Đăng nhập.');
    }

    // Nếu Supabase Dashboard đang tắt "Confirm email" (Auto-confirm bật), session được tạo ngay:
    if (signUpData.session && signUpData.user) {
      const u = signUpData.user;
      const fullUser: User = {
        id: u.id,
        name: trimmedName,
        phone: phoneNational || '',
        email: u.email,
        avatar: undefined,
      };

      try {
        await supabase.from('users').upsert(
          {
            id: u.id,
            email: u.email,
            name: trimmedName,
            phone: phoneNational || null,
            role: 'customer',
          },
          { onConflict: 'id' }
        );
      } catch {}

      return { email: trimmedEmail, autoConfirmed: true, user: fullUser };
    }

    // Nếu Supabase bật "Confirm email", Supabase đã gửi mã xác thực token 6 số vào email
    return { email: trimmedEmail, autoConfirmed: false, user: null };
  },

  /**
   * Bước 2 Đăng ký: Xác thực mã OTP 6 số từ Email để hoàn tất tạo tài khoản
   */
  async verifyRegisterOtp(email: string, token: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();

    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Địa chỉ email không hợp lệ.');
    }

    if (!trimmedToken || trimmedToken.length !== 6 || !/^\d{6}$/.test(trimmedToken)) {
      throw new Error('Mã OTP gồm đúng 6 chữ số gửi qua email của bạn.');
    }

    // Thử xác thực với type: 'signup' (mã OTP kích hoạt đăng ký của Supabase)
    let { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'signup',
    });

    // Fallback: Nếu project cấu hình email OTP dạng 'email'
    if (error && (error.message.includes('token') || error.message.includes('expired') || error.message.includes('invalid'))) {
      const fallback = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedToken,
        type: 'email',
      });
      if (!fallback.error) {
        data = fallback.data;
        error = null;
      }
    }

    if (error) {
      throw new Error(mapSupabaseAuthError(error));
    }

    if (data?.user) {
      const u = data.user;
      const meta = u.user_metadata || {};
      const fullUser: User = {
        id: u.id,
        name: meta.full_name || meta.name || u.email?.split('@')[0] || 'Khách hàng',
        phone: meta.phone || '',
        email: u.email,
        avatar: meta.avatar_url || meta.picture || meta.avatar,
      };

      try {
        await supabase.from('users').upsert(
          {
            id: u.id,
            email: u.email,
            name: fullUser.name,
            phone: fullUser.phone || null,
            role: 'customer',
          },
          { onConflict: 'id' }
        );
      } catch {
        // Bỏ qua lỗi phụ nếu trigger cơ sở dữ liệu đã tự xử lý
      }

      return fullUser;
    }

    throw new Error('Xác thực OTP không thành công.');
  },

  /**
   * Gửi lại mã xác thực OTP đăng ký vào Email
   */
  async resendRegisterOtp(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      throw new Error('Địa chỉ email không hợp lệ.');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: trimmed,
    });

    if (error) {
      // Fallback nếu Supabase resend type signup gặp lỗi
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: false },
      });
      if (otpError) {
        throw new Error(mapSupabaseAuthError(otpError));
      }
    }

    return true;
  },

  /**
   * Alias tương thích ngược cho hàm register
   */
  async register(name: string, identifier: string, password?: string) {
    return this.registerInit(name, identifier, password);
  },

  /**
   * Cấp độ 2 (Supabase Native Free): Gửi email đặt lại mật khẩu
   */
  async resetPassword(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      throw new Error('Vui lòng nhập địa chỉ email hợp lệ để đặt lại mật khẩu.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: window.location.origin,
    });

    if (error) {
      throw new Error(mapSupabaseAuthError(error));
    }

    return true;
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Đăng xuất lỗi:', err);
    }
  },

  async deleteAccount(userId?: string, identifier?: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. Gọi RPC delete_user_account với userId hiện tại
      let res = await supabase.rpc('delete_user_account', userId ? { p_user_id: userId } : {});
      let result = res.data as { success?: boolean; error?: string; message?: string } | null;

      // 2. Nếu RPC bằng ID chưa thành công hoặc không có userId, thử qua identifier (email / phone)
      if ((!result || !result.success) && identifier) {
        const idRes = await supabase.rpc('delete_user_by_identifier', { p_identifier: identifier });
        if (idRes.data && (idRes.data as any).success) {
          result = idRes.data as any;
        }
      }

      // 3. Đăng xuất khỏi Supabase Auth và dọn dẹp bộ nhớ client
      try {
        await supabase.auth.signOut();
      } catch {}

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('gsf_cached_customer_user');
          localStorage.removeItem('gsf_cached_auth_user');
          localStorage.removeItem('gsf_customer_user_cache');
          localStorage.removeItem('gsf_notifications_enabled');
          localStorage.removeItem('gsf_customer_orders');
          localStorage.removeItem('gsf_pending_auth_target');
        } catch {}
      }

      return {
        success: result?.success ?? true,
        message: result?.message || 'Tài khoản đã được xóa vĩnh viễn khỏi hệ thống.',
      };
    } catch (err: any) {
      console.warn('Lỗi khi xóa tài khoản:', err);
      try {
        await supabase.auth.signOut();
      } catch {}
      return { success: false, message: err?.message || 'Không thể xóa tài khoản. Vui lòng thử lại.' };
    }
  },

  async updateOrderNote(orderId: string, note: string) {
    try {
      const { error } = await supabase.rpc('update_order_note', {
        p_order_id: orderId,
        p_note: note,
      });
      if (error) console.warn('Cập nhật ghi chú đơn hàng lỗi:', error.message);
      return !error;
    } catch (err) {
      console.warn('Cập nhật ghi chú đơn hàng lỗi:', err);
      return false;
    }
  },

  async cancelOrder(
    orderId: string,
    reason: string,
    bankInfo?: { bankName: string; accountNumber: string; accountHolder: string }
  ) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const trimmedReason = reason.trim() || 'Khách hàng yêu cầu hủy đơn';
      const { error } = await supabase.rpc('transition_order_status_transaction', {
        p_order_id: orderId,
        p_target_status: 'cancelled',
        p_actor_id: user.id,
        p_actor_role: 'customer',
        p_reason: trimmedReason,
        p_bank_info: bankInfo || null,
      });

      if (error) {
        console.warn('Hủy đơn hàng trên hệ thống lỗi:', error.message, error.details);
        return false;
      }

      // Đóng link thanh toán trên PayOS nếu đơn chưa thanh toán
      void this.cancelPayOSPayment({
        orderId,
        cancellationReason: trimmedReason,
      });

      return true;
    } catch (err) {
      console.warn('Hủy đơn hàng trên hệ thống lỗi:', err);
      return false;
    }
  },

  async submitIssue(orderId: string, title: string, description: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('issues').insert({
        order_id: orderId,
        reporter_id: user.id,
        reporter_role: 'customer',
        title,
        description: description || null,
      });

      if (error) console.warn('Gửi báo cáo sự cố lỗi:', error.message);
      return !error;
    } catch (err) {
      console.warn('Gửi báo cáo sự cố lỗi:', err);
      return false;
    }
  },
  async createOrder(
    order: Omit<Order, 'id' | 'orderCode' | 'createdAt'>,
    voucherCode?: string,
    customerInfo?: { name?: string; phone?: string }
  ): Promise<Order> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Vui lòng đăng nhập trước khi đặt hàng.');
    }

    if (customerInfo?.name?.trim() || customerInfo?.phone?.trim()) {
      try {
        const updates: { name?: string; phone?: string; updated_at: string } = {
          updated_at: new Date().toISOString(),
        };
        if (customerInfo.name?.trim()) updates.name = customerInfo.name.trim();
        if (customerInfo.phone?.trim()) updates.phone = customerInfo.phone.trim();
        const { error: updateErr } = await supabase.from('users').update(updates).eq('id', user.id);
        if (updateErr) {
          if (updateErr.code === '23505' || updateErr.message?.includes('users_phone_key')) {
            if (updates.name) {
              await supabase.from('users').update({ name: updates.name, updated_at: updates.updated_at }).eq('id', user.id);
            }
          }
        }
      } catch (err) {
        console.warn('Cập nhật thông tin khách hàng vào bảng users lỗi:', err);
      }
    }

    const orderId = crypto.randomUUID();
    const generatedOrderCode = `GSF-${orderId.slice(0, 6).toUpperCase()}`;
    const qrCodeString = `GSF-ORDER-${generatedOrderCode}-${Date.now()}`;
    const idempotencyKey = crypto.randomUUID();
    const pickupIso = new Date(Date.now() + 3600000).toISOString();

    const isLocalHanoiOrder = order.merchantId.startsWith('store-hn-');
    if (isLocalHanoiOrder) {
      const localOrder: Order = {
        ...order,
        id: orderId,
        orderCode: generatedOrderCode,
        qrCode: qrCodeString,
        recipientName: customerInfo?.name?.trim() || undefined,
        recipientPhone: customerInfo?.phone?.trim() || undefined,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
      };
      try {
        const key = `gsf_local_orders_${user.id}`;
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify([localOrder, ...saved]));
      } catch {}
      return localOrder;
    }

    const { data: rpcResult, error } = await supabase.rpc('place_order', {
      p_id: orderId,
      p_store_id: order.merchantId,
      p_idempotency_key: idempotencyKey,
      p_items: order.items.map((item) => ({
        bagId: item.bagId,
        quantity: item.quantity,
      })),
      p_voucher_code: voucherCode || null,
      p_pickup_time: pickupIso,
      p_payment_method: order.paymentMethod,
      p_note: order.note || null,
      p_total_original_price: order.totalOriginalPrice,
      p_total_discount_price: order.totalDiscountPrice,
      p_discount_amount: order.discountAmount,
      p_final_amount: order.finalAmount,
      p_qr_code: qrCodeString,
      p_recipient_name: customerInfo?.name?.trim() || null,
      p_recipient_phone: customerInfo?.phone?.trim() || null,
    });

    if (error) {
      console.warn('Tạo đơn place_order lỗi:', error.message, error.details);
      throw new Error(mapCreateOrderError(error));
    }

    const createdId = (rpcResult as { order_id?: string; pickup_token?: string } | null)?.order_id || orderId;
    const pickupToken = (rpcResult as { pickup_token?: string } | null)?.pickup_token;

    return {
      ...order,
      id: createdId,
      orderCode: generatedOrderCode,
      qrCode: qrCodeString,
      pickupToken: pickupToken || undefined,
      recipientName: customerInfo?.name?.trim() || undefined,
      recipientPhone: customerInfo?.phone?.trim() || undefined,
      paymentExpiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
      status: 'pending_payment',
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
    };
  },

  async cancelPayOSPayment(params: {
    orderCode?: number | string;
    orderId?: string;
    cancellationReason?: string;
  }): Promise<boolean> {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? 'https://gosavingfood.app' : '');
      const res = await fetch(`${apiBase}/api/payos/cancel-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return res.ok;
    } catch (err) {
      console.warn('cancelPayOSPayment error:', err);
      return false;
    }
  },

  async cleanupExpiredPendingOrders(): Promise<number> {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? 'https://gosavingfood.app' : '');

      // Ưu tiên gọi API cleanup để vừa dọn DB vừa hủy link PayOS
      try {
        const res = await fetch(`${apiBase}/api/payos/cleanup-expired`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return Number(data.expiredCount) || 0;
          }
        }
      } catch {}

      const { data } = await supabase.rpc('cleanup_expired_pending_orders');
      return (data as any)?.expired_orders_count || 0;
    } catch (err) {
      console.warn('cleanupExpiredPendingOrders error:', err);
      return 0;
    }
  },

  async submitFeedback(
    orderId: string,
    storeId: string,
    rating: number,
    comment: string,
    tags?: string[]
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const finalComment = tags && tags.length > 0 && !comment.includes(tags[0])
        ? `${tags.join(', ')} — ${comment}`.trim()
        : comment;

      const insertData: Record<string, any> = {
        order_id: orderId,
        customer_id: user?.id,
        store_id: storeId,
        rating,
        comment: finalComment,
      };

      const { error } = await supabase.from('reviews').insert(insertData);
      if (error) {
        console.warn('Lưu đánh giá vào Supabase lỗi:', error.message);
      }
      return !error;
    } catch (err) {
      console.warn('Lưu đánh giá lỗi:', err);
      return false;
    }
  },

  async getStoreReviews(storeId: string): Promise<CustomerReview[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const { data, error } = await supabase
        .from('reviews')
        .select('id, order_id, store_id, rating, comment, created_at, customer_id')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && Array.isArray(data) && data.length > 0) {
        const sampleNames = [
          'Linh Nguyễn',
          'Hoàng Nam',
          'Minh Anh',
          'Thu Trang',
          'Quốc Bảo',
          'Hương Ly',
          'Tuấn Kiệt',
          'Phương Thảo',
        ];
        return data.map((r: any, idx: number) => {
          const isMe = user?.id && r.customer_id === user.id;
          const charSum = (r.id as string).split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), idx);
          const sampleName = sampleNames[charSum % sampleNames.length];
          const name = isMe ? 'Bạn (Đã xác minh)' : sampleName;
          return {
            id: r.id,
            orderId: r.order_id,
            storeId: r.store_id,
            customerName: name,
            avatar: name.slice(0, 1).toUpperCase(),
            rating: Number(r.rating) || 5,
            comment: r.comment || '',
            createdAt: r.created_at,
            timeAgo: formatRelativeTime(r.created_at),
          };
        });
      }
    } catch (err) {
      console.warn('Lấy đánh giá cửa hàng lỗi:', err);
    }
    // Trả về rỗng nếu chưa có đánh giá nào từ khách thật
    return [];
  },
  async createPayOSPayment(params: {
    orderId: string;
    amount: number;
    description?: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
  }): Promise<{
    success: boolean;
    orderCode: number;
    paymentLinkId: string;
    checkoutUrl: string;
    qrCode: string;
    accountNumber: string;
    accountName: string;
    bin: string;
    amount: number;
    description: string;
  } | null> {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? 'https://gosavingfood.app' : '');
      const res = await fetch(`${apiBase}/api/payos/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        console.warn('[customerService] PayOS create-payment returned non-200:', res.status);
        return null;
      }
      const data = await res.json();
      if (data.success) {
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[customerService] createPayOSPayment error:', err);
      return null;
    }
  },

  async checkPayOSStatus(
    params: { orderCode?: number | string; orderId?: string } | number | string
  ): Promise<{ success?: boolean; paid: boolean; status: string; updated?: boolean } | null> {
    try {
      const apiBase =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? 'https://gosavingfood.app' : '');

      let queryString = '';
      if (typeof params === 'object') {
        const q = new URLSearchParams();
        if (params.orderCode) q.set('orderCode', String(params.orderCode));
        if (params.orderId) q.set('orderId', params.orderId);
        queryString = q.toString();
      } else {
        queryString = `orderCode=${encodeURIComponent(String(params))}`;
      }

      const res = await fetch(`${apiBase}/api/payos/check-status?${queryString}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  },

  async uploadAvatar(userId: string, blob: Blob, contentType: string = 'image/webp'): Promise<string> {
    const ext = contentType.includes('webp') ? 'webp' : 'jpg';
    const filePath = `${userId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[customerService] Upload avatar to storage failed:', uploadError);
      throw new Error(uploadError.message || 'Không thể tải ảnh lên kho lưu trữ.');
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;
    if (!publicUrl) {
      throw new Error('Không lấy được đường dẫn ảnh công khai.');
    }

    // 1. Cập nhật bảng public.users
    try {
      const { error: dbError } = await supabase
        .from('users')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (dbError) {
        console.warn('[customerService] Update users table avatar warning:', dbError.message);
      }
    } catch (dbErr) {
      console.warn('[customerService] Update users table error:', dbErr);
    }

    // 2. Thử cập nhật fallback các bảng profiles hoặc customers nếu có
    try {
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch {}

    try {
      await supabase
        .from('customers')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch {}

    // 3. Cập nhật Auth Metadata của Supabase
    try {
      await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
          picture: publicUrl,
          avatar: publicUrl,
        },
      });
    } catch (authErr) {
      console.warn('[customerService] Update auth metadata warning:', authErr);
    }

    return publicUrl;
  },

  async updateUserProfile(
    userId: string,
    updates: { name?: string; phone?: string; email?: string; avatar?: string }
  ): Promise<boolean> {
    try {
      const dbPayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (updates.name !== undefined) dbPayload.name = updates.name;
      if (updates.phone !== undefined) dbPayload.phone = updates.phone;
      if (updates.avatar !== undefined) dbPayload.avatar_url = updates.avatar;

      const { error } = await supabase
        .from('users')
        .update(dbPayload)
        .eq('id', userId);

      if (error) {
        console.warn('[customerService] updateUserProfile DB error:', error.message);
      }

      const metaPayload: Record<string, any> = {};
      if (updates.name) {
        const trimmedName = updates.name.trim();
        metaPayload.full_name = trimmedName;
        metaPayload.name = trimmedName;
        metaPayload.custom_name = trimmedName;
      }
      if (updates.phone) metaPayload.phone = updates.phone;
      if (updates.avatar) {
        metaPayload.avatar_url = updates.avatar;
        metaPayload.picture = updates.avatar;
        metaPayload.avatar = updates.avatar;
      }

      if (Object.keys(metaPayload).length > 0) {
        await supabase.auth.updateUser({ data: metaPayload });
      }

      return true;
    } catch (err) {
      console.warn('[customerService] updateUserProfile error:', err);
      return false;
    }
  },
};

