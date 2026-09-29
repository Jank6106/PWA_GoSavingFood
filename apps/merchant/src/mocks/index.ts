// Hằng dùng chung của merchant UI:
// - STORE_ID: ID quán seed thật trong DB (Quán Chay Quýt), chỉ dùng làm fallback pre-login.
// - PRESET_*: ảnh/danh mục preset cho form tạo túi (nội dung UI, không phải dữ liệu giả).
export const STORE_ID = 'b0000000-0000-0000-0000-000000000002';
export const PRESET_BAG_CATEGORIES = ['Bánh ngọt', 'Món Việt', 'Đồ uống', 'Rau củ', 'Combo bất ngờ'];
export const PRESET_BAG_IMAGES = [
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=600&q=80',
];
