export const CATEGORY_LABELS: Record<string, string> = {
  meat: 'Món mặn',
  bakery: 'Bánh mì & Bánh ngọt',
  vegetarian: 'Món chay',
  beverage: 'Đồ uống',
  seafood: 'Hải sản',
  raw_food: 'Thực phẩm tươi sống',
  other: 'Khác',
};

export const EXAMPLE_QUERIES = [
  'Tối nay 2 người, 100k, không ăn cay',
  'Tối nay có món mặn nào dưới 35k quanh khu Dịch Vọng ăn no được không?',
  'Cần 1 phần bánh ngọt dưới 30k nhận trước 20:00',
  'Cơm trưa văn phòng 1 người dưới 45k',
];

// Placeholder trung tính: Biểu tượng túi giải cứu nhận diện GoSavingFood,
// không dùng ảnh món ăn cụ thể không liên quan gây hiểu lầm cho khách hàng.
export const NEUTRAL_BAG_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#0f291e"/>
      <g fill="none" stroke="#6ee7b7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(176, 105)">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </g>
      <text x="200" y="175" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#a7d0b8" text-anchor="middle">Chưa có ảnh món</text>
    </svg>`
  );
