import type { AnalyticsMetrics, BagItem, InventoryItem, MerchantOrder, NotificationItem, ReviewItem, RevenueChartPoint, StoreProfile } from '../types';

export const STORE_ID = 'store-gsf-01';
export const PRESET_BAG_CATEGORIES = ['Bánh ngọt', 'Món Việt', 'Đồ uống', 'Rau củ', 'Combo bất ngờ'];
export const PRESET_BAG_IMAGES = [
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=600&q=80',
];
const now = new Date().toISOString();

export const INITIAL_BAGS_MOCK: BagItem[] = [
  { id: 'bag-01', storeId: STORE_ID, name: 'Túi bánh tươi cuối ngày', description: '4–6 loại bánh ngọt và bánh mì được chọn ngẫu nhiên.', category: 'Bánh ngọt', originalPrice: 120000, salePrice: 45000, quantity: 8, availableQuantity: 6, imageUrl: PRESET_BAG_IMAGES[0], imageUrls: [PRESET_BAG_IMAGES[0]], pickupTimeStart: '18:00', pickupTimeEnd: '20:00', status: 'active', createdAt: now },
  { id: 'bag-02', storeId: STORE_ID, name: 'Combo bữa trưa xanh', description: 'Cơm, món mặn và rau theo thực đơn trong ngày.', category: 'Món Việt', originalPrice: 95000, salePrice: 39000, quantity: 5, availableQuantity: 2, imageUrl: PRESET_BAG_IMAGES[1], imageUrls: [PRESET_BAG_IMAGES[1]], pickupTimeStart: '17:30', pickupTimeEnd: '19:00', status: 'active', createdAt: now },
  { id: 'bag-03', storeId: STORE_ID, name: 'Túi trái cây bất ngờ', description: 'Trái cây chín ngon cần được giải cứu trong ngày.', category: 'Rau củ', originalPrice: 110000, salePrice: 42000, quantity: 0, availableQuantity: 0, imageUrl: PRESET_BAG_IMAGES[3], imageUrls: [PRESET_BAG_IMAGES[3]], pickupTimeStart: '19:00', pickupTimeEnd: '20:30', status: 'sold_out', createdAt: now },
];

export const INITIAL_ORDERS_MOCK: MerchantOrder[] = [
  { id: 'order-01', storeId: STORE_ID, orderCode: 'GSF89231', customerName: 'Nguyễn Minh Anh', customerPhone: '0903 248 886', storeName: 'GoGreen Bakery', bagName: 'Túi bánh tươi cuối ngày', quantity: 2, price: 90000, originalPrice: 240000, imageUrl: PRESET_BAG_IMAGES[0], status: 'pending', createdAt: now, placedAt: '2026-09-26T14:12:00+07:00', pickupTime: '18:00 - 20:00', qrCode: 'GSF-QR-89231', note: 'Không lấy bánh có hạt.' },
  { id: 'order-02', storeId: STORE_ID, orderCode: 'GSF78415', customerName: 'Trần Quốc Huy', customerPhone: '0918 502 114', storeName: 'GoGreen Bakery', bagName: 'Combo bữa trưa xanh', quantity: 1, price: 39000, imageUrl: PRESET_BAG_IMAGES[1], status: 'processing', createdAt: now, placedAt: '2026-09-26T13:32:00+07:00', paidAt: '2026-09-26T13:33:10+07:00', pickupTime: '17:30 - 19:00', qrCode: 'GSF-QR-78415' },
  { id: 'order-03', storeId: STORE_ID, orderCode: 'GSF62109', customerName: 'Lê Thảo Vy', customerPhone: '0982 331 755', storeName: 'GoGreen Bakery', bagName: 'Túi bánh tươi cuối ngày', quantity: 1, price: 45000, imageUrl: PRESET_BAG_IMAGES[0], status: 'confirmed', createdAt: now, placedAt: '2026-09-26T11:20:00+07:00', paidAt: '2026-09-26T11:21:04+07:00', pickupTime: '18:00 - 20:00', qrCode: 'GSF-QR-62109' },
  { id: 'order-04', storeId: STORE_ID, orderCode: 'GSF51027', customerName: 'Phạm Khánh Linh', customerPhone: '0938 618 902', storeName: 'GoGreen Bakery', bagName: 'Combo bữa trưa xanh', quantity: 2, price: 78000, imageUrl: PRESET_BAG_IMAGES[1], status: 'completed', createdAt: now, placedAt: '2026-09-25T16:42:00+07:00', paidAt: '2026-09-25T16:43:17+07:00', pickupTime: '17:30 - 19:00', qrCode: 'GSF-QR-51027' },
];

export const INITIAL_INVENTORY_MOCK: InventoryItem[] = INITIAL_BAGS_MOCK.filter((bag) => bag.status !== 'hidden').map((bag, index) => ({
  id: `inventory-${bag.id}`,
  bagId: bag.id,
  storeId: STORE_ID,
  name: bag.name,
  sku: `GSF-${String(index + 1).padStart(3, '0')}`,
  category: bag.category,
  imageUrl: bag.imageUrl,
  price: bag.salePrice,
  originalPrice: bag.originalPrice,
  quantity: bag.availableQuantity,
  minQuantity: 1,
  unit: 'túi',
  schedule: 'today',
  appliesTomorrow: index === 2,
  lastUpdated: now,
}));

export const STORE_PROFILE_MOCK: StoreProfile = {
  id: STORE_ID, userId: 'merchant-user-01', name: 'GoGreen Bakery', description: 'Bánh tươi và những bữa ăn tử tế, cùng bạn giảm lãng phí mỗi ngày.',
  coverImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1400&q=80',
  logoUrl: '', avatar: 'GS', address: '128 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP.HCM', latitude: 10.7736, longitude: 106.7035,
  phone: '028 3822 8899', email: 'hello@gogreen.vn', category: 'Tiệm bánh', openingHours: '07:00', closingHours: '21:00', pickupHours: '17:30 - 20:30',
  isOpen: true, rating: 4.9, totalRescuedBags: 1284, totalCo2SavedKg: 642, createdAt: now, updatedAt: now,
};

export const ANALYTICS_METRICS_MOCK: AnalyticsMetrics = { totalRevenue: 24580000, monthlyRevenue: 8420000, monthlyGrowthPercent: 18.6, previousMonthRevenue: 7100000, totalOrders: 326, totalSoldBags: 1284, bagsOnShelf: 17, averageRating: 4.9, totalReviewsCount: 214 };
export const WEEK_CHART_MOCK: RevenueChartPoint[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, index) => ({ label, value: [820, 1160, 940, 1380, 1680, 2140, 1520][index] * 1000 }));
export const MONTH_CHART_MOCK: RevenueChartPoint[] = ['T1', 'T2', 'T3', 'T4'].map((label, index) => ({ label, value: [5200, 6800, 5940, 8420][index] * 1000 }));
export const REVIEWS_MOCK: ReviewItem[] = [
  { id: 'review-1', customerName: 'Minh Anh', avatar: 'MA', rating: 5, comment: 'Bánh vẫn rất ngon và nhân viên chuẩn bị nhanh. Sẽ tiếp tục ủng hộ!', timeAgo: '2 giờ trước' },
  { id: 'review-2', customerName: 'Quốc Huy', avatar: 'QH', rating: 5, comment: 'Túi đồ đầy đặn hơn mong đợi, đóng gói sạch sẽ.', timeAgo: 'Hôm qua' },
  { id: 'review-3', customerName: 'Thảo Vy', avatar: 'TV', rating: 4, comment: 'Nhận hàng thuận tiện, món ăn ngon và giá hợp lý.', timeAgo: '2 ngày trước' },
];

export const NOTIFICATIONS_MOCK: NotificationItem[] = [
  { id: 'notification-1', orderId: 'order-01', orderCode: 'GSF89231', title: 'Đơn hàng mới', message: 'Minh Anh vừa đặt 2 túi bánh tươi.', type: 'new_order', isRead: false, createdAt: now, timeAgo: '2 phút trước' },
  { id: 'notification-2', orderId: 'order-03', orderCode: 'GSF62109', title: 'Sắp đến giờ nhận', message: 'Khách hàng sẽ đến nhận trong khung 18:00–20:00.', type: 'pickup_reminder', isRead: false, createdAt: now, timeAgo: '18 phút trước' },
  { id: 'notification-3', title: 'Đánh giá mới 5 sao', message: 'Khách hàng rất hài lòng với túi bánh hôm nay.', type: 'review_alert', isRead: true, createdAt: now, timeAgo: '2 giờ trước' },
];
