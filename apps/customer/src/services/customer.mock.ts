import type {
  Banner,
  Brand,
  Category,
  LocationSuggestion,
  Merchant,
  NotificationItem,
  Order,
  SurpriseBag,
  User,
  Voucher,
} from '../shared/types/customer.types';

const futureDate = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

export const mockUser: User = {
  id: 'customer-01',
  name: 'Nguyễn Minh Anh',
  phone: '090 123 4589',
  email: 'minhanh@example.com',
};

export const mockBanners: Banner[] = [
  {
    id: 'banner-1',
    eyebrow: 'Giải cứu hôm nay',
    title: 'Ngon hơn khi không bị lãng phí',
    description: 'Túi bất ngờ từ các cửa hàng quanh bạn, giảm đến 70%.',
    accent: 'green',
    icon: 'bag',
  },
  {
    id: 'banner-2',
    eyebrow: 'Ưu đãi thành viên',
    title: 'Giảm thêm 20.000đ cho đơn đầu tiên',
    description: 'Dùng mã HELLOGSF khi thanh toán đơn từ 50.000đ.',
    accent: 'yellow',
    icon: 'ticket',
  },
  {
    id: 'banner-3',
    eyebrow: 'Tác động xanh',
    title: 'Mỗi túi cứu được giảm 2,5kg CO₂',
    description: 'Một lựa chọn nhỏ, thêm một ngày tốt cho hành tinh.',
    accent: 'mint',
    icon: 'globe',
  },
];

export const mockCategories: Category[] = [
  { id: 'all', label: 'Tất cả', icon: 'all' },
  { id: 'bakery', label: 'Bánh ngọt', icon: 'bakery' },
  { id: 'meat', label: 'Món nóng', icon: 'meat' },
  { id: 'vegetarian', label: 'Ăn xanh', icon: 'vegetarian' },
  { id: 'beverage', label: 'Đồ uống', icon: 'beverage' },
  { id: 'other', label: 'Túi bí mật', icon: 'other' },
];

export const mockBrands: Brand[] = [
  {
    id: 'brand-1',
    name: 'Paris Baguette',
    logo: '🥐',
    description: 'Thương hiệu bánh tươi mỗi ngày với các cửa hàng tại trung tâm thành phố.',
    rating: 4.8,
    totalStores: 12,
    categories: ['Bánh mì', 'Bánh ngọt'],
    sustainabilityMessage: 'Tặng thêm giá trị cho từng chiếc bánh cuối ngày.',
  },
  {
    id: 'brand-2',
    name: 'The Coffee House',
    logo: '☕',
    description: 'Không gian cà phê Việt hiện đại và các món bánh ăn nhẹ.',
    rating: 4.7,
    totalStores: 18,
    categories: ['Đồ uống', 'Bánh'],
    sustainabilityMessage: 'Giảm lãng phí hôm nay, nuôi dưỡng tương lai ngày mai.',
  },
  {
    id: 'brand-3',
    name: 'Green Bowl',
    logo: '🥗',
    description: 'Bữa ăn lành mạnh từ nguyên liệu tươi và rau củ theo mùa.',
    rating: 4.9,
    totalStores: 5,
    categories: ['Salad', 'Healthy'],
    sustainabilityMessage: 'Ăn sạch hơn và sống xanh hơn trong mỗi bữa.',
  },
  {
    id: 'brand-4',
    name: 'Bếp Nhà Mình',
    logo: '🍲',
    description: 'Món Việt nấu trong ngày, tròn vị như bữa cơm gia đình.',
    rating: 4.6,
    totalStores: 8,
    categories: ['Cơm', 'Món Việt'],
    sustainabilityMessage: 'Không để một bữa cơm ngon nào bị bỏ lại.',
  },
];

export const mockMerchants: Merchant[] = [
  {
    id: 'merchant-1',
    brandId: 'brand-1',
    name: 'Paris Baguette Nguyễn Huệ',
    description: 'Bánh mì và bánh ngọt chuẩn Pháp được làm mới mỗi ngày.',
    phone: '028 3822 7788',
    address: '42 Nguyễn Huệ, P. Bến Nghé, Quận 1',
    logo: '🥐',
    banner: 'linear-gradient(135deg, #003426, #006c40)',
    rating: 4.8,
    totalRatings: 326,
    distance: 0.4,
    status: 'active',
    isOpen: true,
    openingHours: '07:00 - 21:00',
  },
  {
    id: 'merchant-2',
    brandId: 'brand-4',
    name: 'Bếp Nhà Mình Pasteur',
    description: 'Cơm nhà và món nóng vừa vị, nấu mới trong ngày.',
    phone: '028 3911 2299',
    address: '118 Pasteur, P. Bến Nghé, Quận 1',
    logo: '🍱',
    banner: 'linear-gradient(135deg, #5c3b18, #8a5a26)',
    rating: 4.7,
    totalRatings: 214,
    distance: 0.8,
    status: 'active',
    isOpen: true,
    openingHours: '10:00 - 20:30',
  },
  {
    id: 'merchant-3',
    brandId: 'brand-3',
    name: 'Green Bowl Lê Thánh Tôn',
    description: 'Salad, nước ép và bowl dinh dưỡng từ rau củ tươi.',
    phone: '028 3939 8899',
    address: '81 Lê Thánh Tôn, P. Bến Nghé, Quận 1',
    logo: '🥗',
    banner: 'linear-gradient(135deg, #1e6f4f, #69a77d)',
    rating: 4.9,
    totalRatings: 175,
    distance: 1.1,
    status: 'active',
    isOpen: true,
    openingHours: '09:00 - 20:00',
  },
];

export const mockBags: SurpriseBag[] = [
  {
    id: 'bag-1', merchantId: 'merchant-1', merchantName: 'Paris Baguette Nguyễn Huệ',
    name: 'Túi bánh Pháp cuối ngày', description: '3–4 loại bánh ngọt hoặc bánh mì tươi được chọn bất ngờ từ quầy trong ngày.',
    originalPrice: 120000, discountPrice: 39000, category: 'bakery', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=80',
    quantity: 4, maxQuantity: 3, pickupStart: '19:00', pickupEnd: '20:30', isAvailable: true, expiresAt: futureDate(7), rating: 4.9,
  },
  {
    id: 'bag-2', merchantId: 'merchant-2', merchantName: 'Bếp Nhà Mình Pasteur',
    name: 'Cơm nhà đủ món', description: 'Một phần cơm gồm món mặn, rau và canh trong ngày. Món cụ thể tùy quầy.',
    originalPrice: 79000, discountPrice: 29000, category: 'meat', imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80',
    quantity: 6, maxQuantity: 4, pickupStart: '13:30', pickupEnd: '15:00', isAvailable: true, expiresAt: futureDate(3), rating: 4.7,
  },
  {
    id: 'bag-3', merchantId: 'merchant-3', merchantName: 'Green Bowl Lê Thánh Tôn',
    name: 'Healthy Bowl bất ngờ', description: 'Bowl rau củ, protein và sốt nhà làm. Phù hợp cho một bữa nhẹ lành mạnh.',
    originalPrice: 95000, discountPrice: 35000, category: 'vegetarian', imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    quantity: 3, maxQuantity: 2, pickupStart: '18:00', pickupEnd: '19:30', isAvailable: true, expiresAt: futureDate(6), rating: 4.9,
  },
  {
    id: 'bag-4', merchantId: 'merchant-1', merchantName: 'Paris Baguette Nguyễn Huệ',
    name: 'Combo sandwich & cà phê', description: 'Sandwich trong ngày kèm một thức uống lạnh bất ngờ.',
    originalPrice: 105000, discountPrice: 42000, category: 'other', imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80',
    quantity: 2, maxQuantity: 2, pickupStart: '17:30', pickupEnd: '19:00', isAvailable: true, expiresAt: futureDate(5), rating: 4.8,
  },
  {
    id: 'bag-5', merchantId: 'merchant-2', merchantName: 'Bếp Nhà Mình Pasteur',
    name: 'Túi món Việt cuối ca', description: 'Các món Việt nóng trong ngày được đóng gói thành phần ăn tiết kiệm.',
    originalPrice: 89000, discountPrice: 32000, category: 'meat', imageUrl: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=900&q=80',
    quantity: 5, maxQuantity: 3, pickupStart: '20:00', pickupEnd: '21:00', isAvailable: true, expiresAt: futureDate(8), rating: 4.6,
  },
  {
    id: 'bag-6', merchantId: 'merchant-3', merchantName: 'Green Bowl Lê Thánh Tôn',
    name: 'Nước ép xanh trong ngày', description: 'Hai chai nước ép cold-pressed từ rau củ và trái cây theo mùa.',
    originalPrice: 110000, discountPrice: 45000, category: 'beverage', imageUrl: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?auto=format&fit=crop&w=900&q=80',
    quantity: 4, maxQuantity: 2, pickupStart: '18:30', pickupEnd: '20:00', isAvailable: true, expiresAt: futureDate(6), rating: 4.8,
  },
];

export const mockOrders: Order[] = [
  {
    id: 'order-8821', orderCode: 'GSF-8821', merchantId: 'merchant-1', merchantName: 'Paris Baguette Nguyễn Huệ',
    items: [{ bagId: 'bag-1', bagName: 'Túi bánh Pháp cuối ngày', imageUrl: mockBags[0].imageUrl, quantity: 1, unitPrice: 39000, totalPrice: 39000 }],
    totalOriginalPrice: 120000, totalDiscountPrice: 39000, discountAmount: 0, finalAmount: 39000,
    status: 'ready_for_pickup', paymentMethod: 'banking', paymentStatus: 'success', pickupTime: '19:00 - 20:30',
    pickupAddress: mockMerchants[0].address, createdAt: new Date().toISOString(),
  },
  {
    id: 'order-7614', orderCode: 'GSF-7614', merchantId: 'merchant-3', merchantName: 'Green Bowl Lê Thánh Tôn',
    items: [{ bagId: 'bag-3', bagName: 'Healthy Bowl bất ngờ', imageUrl: mockBags[2].imageUrl, quantity: 1, unitPrice: 35000, totalPrice: 35000 }],
    totalOriginalPrice: 95000, totalDiscountPrice: 35000, discountAmount: 0, finalAmount: 35000,
    status: 'completed', paymentMethod: 'momo', paymentStatus: 'success', pickupTime: '18:00 - 19:30',
    pickupAddress: mockMerchants[2].address, createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

export const mockNotifications: NotificationItem[] = [
  { id: 'notification-1', icon: '🎁', title: 'Túi mới gần bạn', body: 'Paris Baguette vừa thêm 4 túi bánh Pháp cuối ngày.', time: '5 phút trước', read: false },
  { id: 'notification-2', icon: '✅', title: 'Đơn hàng sẵn sàng', body: 'Đơn GSF-8821 đã sẵn sàng để bạn đến nhận.', time: '25 phút trước', read: false },
  { id: 'notification-3', icon: '🌱', title: 'Tác động tuần này', body: 'Bạn đã giúp giảm 5kg CO₂ nhờ giải cứu 2 bữa ăn.', time: 'Hôm qua', read: true },
];

export const mockVouchers: Voucher[] = [
  { id: 'voucher-1', code: 'HELLOGSF', description: 'Giảm 20.000đ cho đơn đầu tiên', discountValue: 20000, minOrderValue: 50000, isActive: true },
  { id: 'voucher-2', code: 'GREEN10', description: 'Giảm 10.000đ cho đơn từ 60.000đ', discountValue: 10000, minOrderValue: 60000, isActive: true },
];

export const mockLocations: LocationSuggestion[] = [
  { id: 'location-1', name: 'Phố đi bộ Nguyễn Huệ', address: 'Nguyễn Huệ, P. Bến Nghé, Quận 1', distance: '0,2 km' },
  { id: 'location-2', name: 'Chợ Bến Thành', address: 'Lê Lợi, P. Bến Thành, Quận 1', distance: '0,8 km' },
  { id: 'location-3', name: 'Nhà thờ Đức Bà', address: 'Công xã Paris, P. Bến Nghé, Quận 1', distance: '1,1 km' },
];
