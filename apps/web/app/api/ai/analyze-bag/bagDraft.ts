/**
 * Prompt, schema & hậu xử lý cho AI Đăng Hàng (tách khỏi route.ts để unit test được).
 */

export const CATEGORY_ENUM = ['bakery', 'beverage', 'raw_food', 'vegetarian', 'other'] as const;
export type CategoryEnum = (typeof CATEGORY_ENUM)[number];

export interface AnalyzeBagResult {
  isFood: boolean;
  itemsSeen: string[];
  name: string;
  category: CategoryEnum;
  description: string;
  expiryDate: string | null;
  estimatedOriginalPrice: number | null;
}

export interface StoreContext {
  name?: string | null;
  foodCategories?: string[] | null;
}

export const SYSTEM_PROMPT = `Bạn là copywriter đăng bán cho GoSavingFood – app "Túi bất ngờ" giải cứu đồ ăn còn dư cuối ngày tại Hà Nội.
Chủ quán chụp 1 ảnh đồ còn dư; bạn trả về JSON đúng schema để điền sẵn form đăng bán. Khách sẽ đọc tên + mô tả trên điện thoại trong 2 giây, nên phải CỤ THỂ, NGON MIỆNG và TRUNG THỰC.

BƯỚC 1 – items_seen: liệt kê 1–6 món nhìn thấy RÕ trong ảnh, tên tiếng Việt thông dụng (vd "bánh sừng bò", "bánh mì que", "trà sữa trân châu"). Không liệt kê thứ không thấy.
NHẬN DIỆN MÓN VIỆT (ảnh chụp tại quán ở Hà Nội, mặc định đây là đồ ăn Việt Nam):
- Ổ bánh mì ngắn ~20–30cm, vỏ mỏng giòn, ruột xốp, hai đầu thon hoặc bầu, có/không có nhân (pate, chả, thịt, trứng, rau, dưa) -> "bánh mì" (có nhân thì ghi rõ nhân: "bánh mì pate chả", "bánh mì trứng"). KHÔNG gọi là "baguette".
- Chỉ dùng "baguette" khi là bánh mì Pháp rất dài (~50cm+), mảnh, vỏ dày rạch xéo nhiều đường, hoặc nhãn/biển ghi rõ "baguette".
- Tương tự: dùng tên Việt cho món Việt (xôi, bánh bao, bánh giò, bánh chưng, bánh cuốn, bún, phở, cơm tấm, chè, nem/chả giò, bánh bông lan, bánh su kem, sữa chua, trà đá...). Món ngoại phổ biến mà người Việt gọi bằng tên gốc thì giữ (croissant, tiramisu, donut, kimbap, tokbokki).
- Đọc chữ trên nhãn/bao bì/biển nếu có (tên sản phẩm, vị) và ưu tiên dùng đúng tên in trên đó.
- Không chắc món cụ thể thì dùng tên chung đúng (vd "bánh mì", "bánh ngọt", "cơm hộp") thay vì đoán sai tên cụ thể.

BƯỚC 2 – name (18–50 ký tự):
- Mẫu: "Túi " + món chính cụ thể + 1 đặc điểm nổi bật nhìn thấy được (nhân/vị/kiểu). Nhiều loại thì gộp: "Túi bánh ngọt mix: croissant & su kem".
- Dùng đúng tên món đã nhận diện ở BƯỚC 1 (ưu tiên tên Việt theo quy tắc trên).
- KHÔNG dùng: "cuối ngày", "giải cứu", "giảm giá", "siêu", "ngon nhất", số lượng, giá, emoji, dấu ngoặc kép, tên thương hiệu không thấy trên bao bì, dấu chấm cuối.
- Chỉ viết hoa chữ cái đầu (và tên riêng).

BƯỚC 3 – description (2 câu, 110–220 ký tự):
- Câu 1: trong túi có gì (dựa trên items_seen) + 1–2 chi tiết cảm quan NHÌN THẤY được (vỏ vàng giòn, lớp kem dày, nhiều topping…).
- Câu 2: gợi ý thưởng thức/bảo quản hữu ích (vd "Hâm lò 3–5 phút cho giòn lại", "Dùng trong ngày, bảo quản ngăn mát").
- KHÔNG bịa: không nói "mới ra lò", "nóng hổi", "100%", "organic", "tốt cho sức khỏe", thành phần không thấy. Không nhắc giá/giảm giá. Giọng thân thiện, không sến, không emoji.

category: bakery (bánh mì, bánh ngọt, bánh kem), beverage (đồ uống: trà, cà phê, sữa, nước ép), raw_food (rau củ, trái cây, thịt cá tươi sống), vegetarian (món chay chế biến sẵn), other (cơm, bún, món mặn, combo, khác).

expiry_date: CHỈ khi đọc được NGÀY CỤ THỂ in trên nhãn là hạn sử dụng (HSD/EXP/Use by/Best before). Đổi dd/mm/yyyy -> YYYY-MM-DD. NSX/MFG là ngày sản xuất, không phải hạn. Không thấy ngày -> null. TUYỆT ĐỐI không ghi chữ như "Hôm nay".

estimated_original_price: tổng giá bán lẻ gốc (VNĐ, làm tròn nghìn) của TẤT CẢ món thấy trong ảnh theo mặt bằng giá Hà Nội. Tham khảo/món: bánh mì 15–30k, croissant 25–45k, bánh ngọt nhỏ 20–40k, bánh kem miếng 35–60k, bánh kem nguyên 200–450k, trà sữa/cà phê 30–60k, cơm/bún hộp 35–65k, hộp trái cây 30–80k. Không ước lượng được -> null.

is_food: false nếu ảnh không phải đồ ăn/đồ uống (khi đó các trường khác để rỗng/null).

VÍ DỤ (chỉ để hiểu FORMAT & độ cụ thể — KHÔNG chép lại câu chữ; mỗi ảnh viết mô tả riêng, câu 2 phải hợp đúng món đó):
{"items_seen":["cơm gà xối mỡ","dưa leo"],"name":"Túi cơm gà xối mỡ da giòn","description":"Hộp cơm trắng kèm đùi gà xối mỡ da vàng ruộm và vài lát dưa leo. Quay lò vi sóng 1–2 phút là ăn ngon như vừa mua.","category":"other"}
{"items_seen":["xoài cắt miếng","dưa hấu","thanh long"],"name":"Túi trái cây cắt sẵn: xoài, dưa hấu & thanh long","description":"Hộp trái cây cắt miếng gồm xoài chín vàng, dưa hấu đỏ và thanh long ruột trắng. Để ngăn mát và dùng trong ngày để giữ độ tươi.","category":"raw_food"}`;

/** Ngữ cảnh cửa hàng giúp AI chọn từ ngữ đúng loại quán (không bắt buộc). */
export function buildUserPrompt(store?: StoreContext): string {
  const parts = ['Phân tích ảnh đồ còn dư này để đăng bán.'];
  if (store?.name) parts.push(`Cửa hàng: ${String(store.name).slice(0, 80)}.`);
  if (store?.foodCategories?.length) {
    parts.push(`Loại hình quán: ${store.foodCategories.slice(0, 5).join(', ')} (chỉ để tham khảo, ưu tiên những gì thấy trong ảnh).`);
  }
  return parts.join(' ');
}

// Gemini responseSchema (OpenAPI subset). items_seen đứng trước để model "nhìn kỹ" trước khi đặt tên.
export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: ['is_food', 'items_seen', 'name', 'category', 'description', 'expiry_date', 'estimated_original_price'],
  properties: {
    is_food: { type: 'BOOLEAN' },
    items_seen: { type: 'ARRAY', items: { type: 'STRING' } },
    name: { type: 'STRING' },
    category: { type: 'STRING', enum: [...CATEGORY_ENUM] },
    description: { type: 'STRING' },
    expiry_date: { type: 'STRING', nullable: true },
    estimated_original_price: { type: 'INTEGER', nullable: true },
  },
  propertyOrdering: ['is_food', 'items_seen', 'name', 'category', 'description', 'expiry_date', 'estimated_original_price'],
} as const;

const EMOJI_RE = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
// Từ cấm trong tên (chủ quán yêu cầu bỏ hẳn "cuối ngày"); kèm cả dấu nối/phẩy đứng trước
const BANNED_NAME_WORDS = /\s*[-–,:]?\s*(?<!\p{L})(cuối ngày|cuối ngày hôm nay|giải cứu|giảm giá|siêu ngon|ngon nhất)(?!\p{L})/giu;

/** Làm sạch tên: bỏ emoji/ngoặc/từ cấm/dấu chấm cuối, gọn khoảng trắng, viết hoa chữ đầu, tối đa 60 ký tự. */
export function cleanName(raw: unknown): string {
  let name = String(raw ?? '')
    .replace(EMOJI_RE, '')
    .replace(/["“”'‘’]/g, '')
    .replace(BANNED_NAME_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.。!]+$/u, '')
    .trim();
  if (name.length > 60) {
    const cut = name.slice(0, 60);
    const lastSpace = cut.lastIndexOf(' ');
    name = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).replace(/[\s,&:–-]+$/u, '');
  }
  return name ? name.charAt(0).toLocaleUpperCase('vi-VN') + name.slice(1) : '';
}

/** Làm sạch mô tả: bỏ emoji, gọn khoảng trắng, tối đa 240 ký tự cắt theo ranh giới câu. */
export function cleanDescription(raw: unknown): string {
  let desc = String(raw ?? '')
    .replace(EMOJI_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (desc.length > 240) {
    const cut = desc.slice(0, 240);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.endsWith('.') ? cut.length - 1 : -1);
    desc = lastStop > 80 ? cut.slice(0, lastStop + 1) : `${cut.slice(0, cut.lastIndexOf(' ')).trim()}…`;
  }
  if (desc && !/[.!?…]$/u.test(desc)) desc += '.';
  return desc;
}

/** Chuẩn hóa hạn dùng: chấp nhận YYYY-MM-DD hoặc dd/mm/yyyy; còn lại -> null. */
export function normalizeExpiry(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  let y: number, m: number, d: number;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) {
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (y < 2020 || y > 2100) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function sanitizeResult(input: unknown): AnalyzeBagResult {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const category: CategoryEnum = (CATEGORY_ENUM as readonly unknown[]).includes(raw.category)
    ? (raw.category as CategoryEnum)
    : 'other';
  const price = Number(raw.estimated_original_price);
  const itemsSeen: string[] = Array.isArray(raw.items_seen)
    ? raw.items_seen.map((i: unknown) => String(i ?? '').trim()).filter(Boolean).slice(0, 8)
    : [];
  return {
    isFood: raw.is_food !== false,
    itemsSeen,
    // AI để trống tên -> ghép từ các món nhìn thấy để form không bị rỗng
    name: cleanName(raw.name) || (itemsSeen.length ? cleanName(`Túi ${itemsSeen.slice(0, 3).join(' & ')}`) : ''),
    category,
    description: cleanDescription(raw.description),
    expiryDate: normalizeExpiry(raw.expiry_date),
    estimatedOriginalPrice:
      Number.isFinite(price) && price >= 1000 && price <= 5_000_000 ? Math.round(price / 1000) * 1000 : null,
  };
}

// OpenAI Structured Outputs (strict JSON Schema): mọi trường bắt buộc, null biểu diễn bằng union type.
export const OPENAI_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_food', 'items_seen', 'name', 'category', 'description', 'expiry_date', 'estimated_original_price'],
  properties: {
    is_food: { type: 'boolean' },
    items_seen: { type: 'array', items: { type: 'string' } },
    name: { type: 'string' },
    category: { type: 'string', enum: [...CATEGORY_ENUM] },
    description: { type: 'string' },
    expiry_date: { type: ['string', 'null'] },
    estimated_original_price: { type: ['integer', 'null'] },
  },
} as const;
