import { supabase } from './supabase';
import { calculateDistanceKm, formatDistance, mapboxService } from './mapbox.service';
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
        if (parsed?.reason === 'EXPIRED') {
          return parsed.pickupEnd
            ? `Túi thực phẩm đã hết giờ lấy hàng hôm nay (kết thúc lúc ${parsed.pickupEnd}). Vui lòng chọn túi khác.`
            : 'Túi thực phẩm đã quá khung giờ nhận hàng trong ngày. Vui lòng chọn túi khác.';
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
    id: 'fcc75682-534e-495c-91a7-982622d02cf7',
    brandId: 'fcc75682-534e-495c-91a7-982622d02cf7',
    name: 'Tous Les Jours - Hoàng Quốc Việt',
    description: 'Thương hiệu bánh ngọt và bánh mì tươi phong cách Pháp - Hàn Quốc cao cấp.',
    phone: '024 3755 8899',
    address: '234 Hoàng Quốc Việt, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    rating: 5.0,
    totalRatings: 4,
    distance: 450,
    status: 'active',
    isOpen: true,
    openingHours: '06:30 - 22:00',
    latitude: 21.0465,
    longitude: 105.7892,
  },
  {
    id: 'b509682b-350a-4f10-8bbc-a76f6537c248',
    brandId: 'b509682b-350a-4f10-8bbc-a76f6537c248',
    name: 'Bếp Chay An Lạc - Cổ Nhuế',
    description: 'Cơm chay thanh tịnh, thực phẩm dinh dưỡng từ nấm và rau củ hữu cơ tươi ngon.',
    phone: '0988 234 112',
    address: '128 Cổ Nhuế, Cổ Nhuế 2, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200',
    banner: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    rating: 4.8,
    totalRatings: 4,
    distance: 300,
    status: 'active',
    isOpen: true,
    openingHours: '09:00 - 21:00',
    latitude: 21.0620,
    longitude: 105.7765,
  },
  {
    id: '5779597d-222b-4e30-9501-f1c44c383330',
    brandId: '5779597d-222b-4e30-9501-f1c44c383330',
    name: 'Fresh Garden Bakery - Phạm Văn Đồng',
    description: 'Bánh tươi mỗi ngày, bánh mì gối dinh dưỡng, donut và bánh su kem béo ngậy.',
    phone: '024 3856 9900',
    address: '43 Phạm Văn Đồng, Mai Dịch, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    rating: 4.7,
    totalRatings: 3,
    distance: 1200,
    status: 'active',
    isOpen: true,
    openingHours: '07:00 - 21:30',
    latitude: 21.0410,
    longitude: 105.7795,
  },
  {
    id: '2257c133-3c76-4646-8ae9-13f9d34115a3',
    brandId: '2257c133-3c76-4646-8ae9-13f9d34115a3',
    name: 'WinMart+ - Green Stars Phạm Văn Đồng',
    description: 'Siêu thị tiện lợi hàng đầu, rau củ quả VietGAP và thực phẩm sạch trong ngày.',
    phone: '024 7106 6866',
    address: 'Tòa 27A2 Green Stars, 234 Phạm Văn Đồng, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
    banner: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800',
    rating: 4.7,
    totalRatings: 3,
    distance: 600,
    status: 'active',
    isOpen: true,
    openingHours: '06:00 - 22:00',
    latitude: 21.0535,
    longitude: 105.7820,
  },
  {
    id: '4bd5a486-8ee2-49cf-8bd6-6eacf946db56',
    brandId: '4bd5a486-8ee2-49cf-8bd6-6eacf946db56',
    name: 'Highlands Coffee - IPH Xuân Thủy',
    description: 'Cà phê rang xay đậm đà phong vị Việt cùng bánh ngọt và trà hoa quả thanh mát.',
    phone: '024 3795 4242',
    address: '241 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200',
    banner: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
    rating: 5.0,
    totalRatings: 3,
    distance: 2100,
    status: 'active',
    isOpen: true,
    openingHours: '07:00 - 23:00',
    latitude: 21.0368,
    longitude: 105.7828,
  },
  {
    id: 'bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7',
    brandId: 'bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7',
    name: 'Cơm Niêu Singapore KOMBO - Duy Tân',
    description: 'Cơm niêu giòn rụm hai mặt hòa quyện cùng sốt bò tiêu đen và sốt gà nấm đặc sản.',
    phone: '0971 615 775',
    address: '86 Duy Tân, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    banner: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    rating: 4.7,
    totalRatings: 3,
    distance: 2800,
    status: 'active',
    isOpen: true,
    openingHours: '10:00 - 21:00',
    latitude: 21.0315,
    longitude: 105.7835,
  },
  {
    id: 'db669945-636b-4538-84be-568185e22b13',
    brandId: 'db669945-636b-4538-84be-568185e22b13',
    name: 'Bánh Mì Dân Tổ - Trần Cung',
    description: 'Đặc sản bánh mì pate trứng xào trứ danh Hà Thành, giòn rụm và thơm nức mũi.',
    phone: '0963 882 190',
    address: '96 Trần Cung, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=200',
    banner: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800',
    rating: 4.7,
    totalRatings: 3,
    distance: 550,
    status: 'active',
    isOpen: true,
    openingHours: '06:00 - 22:00',
    latitude: 21.0498,
    longitude: 105.7865,
  },
  {
    id: 'ac5987b4-c50f-4e33-ae1b-42c7a78c74cc',
    brandId: 'ac5987b4-c50f-4e33-ae1b-42c7a78c74cc',
    name: 'Nước Ép Juicy Garden - Chùa Láng',
    description: 'Nước ép trái cây tươi nguyên chất 100% không thêm đường và sinh tố detox mát lành.',
    phone: '0912 345 678',
    address: '112 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200',
    banner: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800',
    rating: 5.0,
    totalRatings: 3,
    distance: 3500,
    status: 'active',
    isOpen: true,
    openingHours: '08:00 - 22:00',
    latitude: 21.0265,
    longitude: 105.8035,
  },
  {
    id: '2f207531-63ee-4650-b3ef-71282d3e91c3',
    brandId: '2f207531-63ee-4650-b3ef-71282d3e91c3',
    name: 'Bếp Cơm Quê Mẹ Nấu - Hồ Tùng Mậu',
    description: 'Cơm trưa đậm đà hương vị gia đình Bắc Bộ, canh cua rau đay và thịt rang cháy cạnh.',
    phone: '0945 678 910',
    address: '136 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
    banner: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    rating: 4.7,
    totalRatings: 3,
    distance: 1900,
    status: 'active',
    isOpen: true,
    openingHours: '10:30 - 20:30',
    latitude: 21.0395,
    longitude: 105.7695,
  },
  {
    id: '6a3e9343-a8a7-4d11-828e-106fb4edbf7c',
    brandId: '6a3e9343-a8a7-4d11-828e-106fb4edbf7c',
    name: 'Nhà Hàng Chay Vị Lai - Lý Thường Kiệt',
    description: 'Ẩm thực chay nghệ thuật cao cấp giữa lòng thủ đô, không gian thanh tịnh an nhiên.',
    phone: '0853 535 656',
    address: '67 Lý Thường Kiệt, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200',
    banner: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    rating: 5.0,
    totalRatings: 3,
    distance: 7200,
    status: 'active',
    isOpen: true,
    openingHours: '09:30 - 22:00',
    latitude: 21.0245,
    longitude: 105.8495,
  },
  {
    id: '2840d89d-5fdd-4e7b-a467-20ed26a9e4da',
    brandId: '2840d89d-5fdd-4e7b-a467-20ed26a9e4da',
    name: 'Bơ Bồng Bềnh Bakery - Liễu Giai',
    description: 'Bánh kem bắp mềm tan, tart trứng bơ thơm lừng và bánh mì hoa cúc brioche cao cấp.',
    phone: '0936 123 789',
    address: '54 Liễu Giai, Cống Vị, Ba Đình, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200',
    banner: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
    rating: 4.7,
    totalRatings: 3,
    distance: 4200,
    status: 'active',
    isOpen: true,
    openingHours: '08:00 - 21:30',
    latitude: 21.0345,
    longitude: 105.8142,
  },
  {
    id: '6c2a82a7-0ecd-43f3-bf7d-a74bc7e4a0d5',
    brandId: '6c2a82a7-0ecd-43f3-bf7d-a74bc7e4a0d5',
    name: 'Lạc Trà & Hoa Quả Tươi - Tây Hồ',
    description: 'Trà sen Tây Hồ thơm ngát, trà ô long mãng cầu tươi cùng đĩa hoa quả nhiệt đới tươi sạch.',
    phone: '0904 889 900',
    address: '18 Đặng Thai Mai, Quảng An, Tây Hồ, Hà Nội',
    logo: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200',
    banner: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800',
    rating: 4.7,
    totalRatings: 3,
    distance: 5100,
    status: 'active',
    isOpen: true,
    openingHours: '07:30 - 22:30',
    latitude: 21.0665,
    longitude: 105.8235,
  },
];

export const HANOI_BAGS: SurpriseBag[] = [
  // 1. Tous Les Jours - Hoàng Quốc Việt (store-hn-01)
  {
    id: 'bag-hn-01',
    merchantId: 'fcc75682-534e-495c-91a7-982622d02cf7',
    merchantName: 'Tous Les Jours - Hoàng Quốc Việt',
    name: 'Túi Bánh Mì & Pastry Cuối Ngày',
    description: 'Bao gồm 3-4 loại bánh mì nướng tươi trong ngày: bánh sừng bò, bánh mì phô mai mềm và bánh ngọt pastry.',
    originalPrice: 110000,
    discountPrice: 35000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '19:30',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-02',
    merchantId: 'fcc75682-534e-495c-91a7-982622d02cf7',
    merchantName: 'Tous Les Jours - Hoàng Quốc Việt',
    name: 'Túi Bánh Ngọt Pháp & Croissant Bơ',
    description: 'Croissant ngàn lớp giòn rụm bơ Pháp, pain au chocolat và bánh su mềm béo ngậy.',
    originalPrice: 130000,
    discountPrice: 45000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '20:00',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'bag-hn-03',
    merchantId: 'fcc75682-534e-495c-91a7-982622d02cf7',
    merchantName: 'Tous Les Jours - Hoàng Quốc Việt',
    name: 'Combo Bánh Mì Gối Mềm & Bánh Mặn',
    description: 'Bánh mì gối ngũ cốc dinh dưỡng cho bữa sáng kèm 2 chiếc bánh xúc xích sốt cay kiểu Hàn.',
    originalPrice: 85000,
    discountPrice: 30000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600',
    quantity: 6,
    maxQuantity: 3,
    pickupStart: '19:00',
    pickupEnd: '21:30',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },

  // 2. Bếp Chay An Lạc - Cổ Nhuế (store-hn-02)
  {
    id: 'bag-hn-04',
    merchantId: 'b509682b-350a-4f10-8bbc-a76f6537c248',
    merchantName: 'Bếp Chay An Lạc - Cổ Nhuế',
    name: 'Phần Cơm Chay Thực Dưỡng Sen Vàng',
    description: 'Cơm gạo lứt huyết rồng, đậu hũ sốt nấm hương, chả giò chay nấm và canh rong biển hạt sen thanh mát.',
    originalPrice: 70000,
    discountPrice: 35000,
    category: 'vegetarian',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    quantity: 6,
    maxQuantity: 2,
    pickupStart: '13:00',
    pickupEnd: '14:30',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'bag-hn-05',
    merchantId: 'b509682b-350a-4f10-8bbc-a76f6537c248',
    merchantName: 'Bếp Chay An Lạc - Cổ Nhuế',
    name: 'Túi Bún Nem Chay & Giò Nấm Hà Thành',
    description: 'Bún tươi mềm dẻo, nem rán giòn vỏ, giò nấm thủ công ăn kèm nước chấm chua ngọt tỏi ớt chay.',
    originalPrice: 65000,
    discountPrice: 30000,
    category: 'vegetarian',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '19:00',
    pickupEnd: '21:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-06',
    merchantId: 'b509682b-350a-4f10-8bbc-a76f6537c248',
    merchantName: 'Bếp Chay An Lạc - Cổ Nhuế',
    name: 'Túi Lẩu Nấm Chay Tươi Mini Tự Nấu',
    description: 'Set nấm đùi gà, nấm kim châm, nấm bào ngư hữu cơ kèm nước cốt lẩu hầm táo đỏ và củ quả.',
    originalPrice: 120000,
    discountPrice: 49000,
    category: 'vegetarian',
    imageUrl: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=600',
    quantity: 3,
    maxQuantity: 1,
    pickupStart: '18:30',
    pickupEnd: '21:00',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },

  // 3. Fresh Garden Bakery - Phạm Văn Đồng (store-hn-03)
  {
    id: 'bag-hn-07',
    merchantId: '5779597d-222b-4e30-9501-f1c44c383330',
    merchantName: 'Fresh Garden Bakery - Phạm Văn Đồng',
    name: 'Túi Bánh Su Kem & Donut Tươi Xốp',
    description: 'Hộp bánh su kem vani mềm béo ngậy kèm bánh donut phủ sô cô la hạt hạnh nhân thơm ngon.',
    originalPrice: 75000,
    discountPrice: 29000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600',
    quantity: 7,
    maxQuantity: 2,
    pickupStart: '19:30',
    pickupEnd: '21:30',
    isAvailable: true,
    rating: 4.7,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-08',
    merchantId: '5779597d-222b-4e30-9501-f1c44c383330',
    merchantName: 'Fresh Garden Bakery - Phạm Văn Đồng',
    name: 'Túi Bánh Mì Bơ Tỏi & Xúc Xích Phô Mai',
    description: 'Bánh mì nướng bơ tỏi giòn tan viền phô mai cùng bánh cuộn xúc xích tiêu đen béo thơm ngậy.',
    originalPrice: 95000,
    discountPrice: 39000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '20:00',
    pickupEnd: '21:30',
    isAvailable: true,
    rating: 4.7,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'bag-hn-09',
    merchantId: '5779597d-222b-4e30-9501-f1c44c383330',
    merchantName: 'Fresh Garden Bakery - Phạm Văn Đồng',
    name: 'Bánh Mì Ngũ Cốc Nguyên Cám Healthy',
    description: 'Túi bánh mì đen hạt chia, yến mạch và hạt lanh nguyên cám, lý tưởng cho chế độ ăn lành mạnh.',
    originalPrice: 80000,
    discountPrice: 32000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '18:00',
    pickupEnd: '21:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },

  // 4. WinMart+ - Green Stars Phạm Văn Đồng (store-hn-04)
  {
    id: 'bag-hn-10',
    merchantId: '2257c133-3c76-4646-8ae9-13f9d34115a3',
    merchantName: 'WinMart+ - Green Stars Phạm Văn Đồng',
    name: 'Túi Rau Củ Hữu Cơ Đà Lạt Chuẩn VietGAP',
    description: 'Combo rau xà lách thủy canh, cà chua bi, cải ngọt và bí ngòi hữu cơ còn tươi ngon trong ngày.',
    originalPrice: 60000,
    discountPrice: 25000,
    category: 'vegetarian',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    quantity: 8,
    maxQuantity: 3,
    pickupStart: '19:00',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'bag-hn-11',
    merchantId: '2257c133-3c76-4646-8ae9-13f9d34115a3',
    merchantName: 'WinMart+ - Green Stars Phạm Văn Đồng',
    name: 'Túi Thịt Heo & Gà Tươi Cứu Trợ Cuối Ngày',
    description: 'Thịt ba chỉ heo mát MEATDeli hoặc ức gà phi lê đóng gói hút chân không, hạn dùng trong ngày.',
    originalPrice: 110000,
    discountPrice: 45000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '20:00',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-12',
    merchantId: '2257c133-3c76-4646-8ae9-13f9d34115a3',
    merchantName: 'WinMart+ - Green Stars Phạm Văn Đồng',
    name: 'Túi Bí Mật Trái Cây Nội Ngoại Nhập Tươi Ngon',
    description: 'Táo Gala New Zealand, cam sành miền Tây và ổi lê giòn ngọt đóng khay giải cứu cuối ngày.',
    originalPrice: 85000,
    discountPrice: 35000,
    category: 'other',
    imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600',
    quantity: 6,
    maxQuantity: 2,
    pickupStart: '19:30',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },

  // 5. Highlands Coffee - IPH Xuân Thủy (store-hn-05)
  {
    id: 'bag-hn-13',
    merchantId: '4bd5a486-8ee2-49cf-8bd6-6eacf946db56',
    merchantName: 'Highlands Coffee - IPH Xuân Thủy',
    name: 'Túi Bánh Ngọt Mousse & Trà Thạch Đào',
    description: 'Bánh mousse đào mềm mịn kết hợp cùng một ly Trà thạch đào thơm ngọt thanh nhiệt ngày hè.',
    originalPrice: 85000,
    discountPrice: 35000,
    category: 'beverage',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '20:30',
    pickupEnd: '23:00',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-14',
    merchantId: '4bd5a486-8ee2-49cf-8bd6-6eacf946db56',
    merchantName: 'Highlands Coffee - IPH Xuân Thủy',
    name: 'Combo Cà Phê Phin Sữa Tươi & Bánh Phô Mai',
    description: 'Cà phê phin truyền thống đậm đà thơm ngậy hòa cùng một lát cheesecake nướng béo bùi.',
    originalPrice: 95000,
    discountPrice: 39000,
    category: 'beverage',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '16:00',
    pickupEnd: '18:30',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'bag-hn-15',
    merchantId: '4bd5a486-8ee2-49cf-8bd6-6eacf946db56',
    merchantName: 'Highlands Coffee - IPH Xuân Thủy',
    name: 'Túi Mù Bánh Mì Que & Freeze Trà Xanh',
    description: 'Bánh mì que pate giòn rụm nóng hổi kèm thức uống Freeze trà xanh thạch giòn mát lạnh.',
    originalPrice: 89000,
    discountPrice: 35000,
    category: 'beverage',
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600',
    quantity: 6,
    maxQuantity: 2,
    pickupStart: '20:00',
    pickupEnd: '22:30',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },

  // 6. Cơm Niêu Singapore KOMBO - Duy Tân (store-hn-06)
  {
    id: 'bag-hn-16',
    merchantId: 'bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7',
    merchantName: 'Cơm Niêu Singapore KOMBO - Duy Tân',
    name: 'Suất Cơm Niêu Bò Nướng Sốt Tiêu Đen',
    description: 'Cơm niêu cháy hai mặt giòn rụm, thịt bò ướp đậm đà nước sốt tiêu đen đặc sản cay nồng nàn.',
    originalPrice: 115000,
    discountPrice: 49000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '13:30',
    pickupEnd: '14:30',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-17',
    merchantId: 'bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7',
    merchantName: 'Cơm Niêu Singapore KOMBO - Duy Tân',
    name: 'Cơm Niêu Gà Sốt Nấm Tươi Đậm Đà',
    description: 'Cơm niêu nóng hổi thơm nức, thịt gà mềm thấm vị nước sốt nấm hương ngọt thanh tròn vị.',
    originalPrice: 99000,
    discountPrice: 45000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '19:30',
    pickupEnd: '21:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'bag-hn-18',
    merchantId: 'bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7',
    merchantName: 'Cơm Niêu Singapore KOMBO - Duy Tân',
    name: 'Túi Cơm Niêu Thịt Heo Sốt BBQ Đậm Vị',
    description: 'Thịt heo rim sốt BBQ thơm lừng ăn cùng lớp cơm cháy giòn rụm và canh rau củ trong ngày.',
    originalPrice: 95000,
    discountPrice: 42000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600',
    quantity: 3,
    maxQuantity: 1,
    pickupStart: '20:00',
    pickupEnd: '21:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },

  // 7. Bánh Mì Dân Tổ - Trần Cung (store-hn-07)
  {
    id: 'bag-hn-19',
    merchantId: 'db669945-636b-4538-84be-568185e22b13',
    merchantName: 'Bánh Mì Dân Tổ - Trần Cung',
    name: 'Combo Bánh Mì Thập Cẩm Nhân Xào Đậm Đà (2 chiếc)',
    description: 'Nhân hỗn hợp xào thơm phức gồm pate, trứng, lạp xưởng, chả và bơ béo ngậy kèm dưa chuột.',
    originalPrice: 70000,
    discountPrice: 35000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600',
    quantity: 6,
    maxQuantity: 2,
    pickupStart: '17:00',
    pickupEnd: '21:30',
    isAvailable: true,
    rating: 4.7,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-20',
    merchantId: 'db669945-636b-4538-84be-568185e22b13',
    merchantName: 'Bánh Mì Dân Tổ - Trần Cung',
    name: 'Túi Bánh Mì Trứng Pate Cổ Truyền & Sữa Đậu',
    description: 'Bánh mì nướng than hoa giòn tan kẹp pate béo ngậy cùng cốc sữa đậu nành nấu lá dứa ngọt nhẹ.',
    originalPrice: 55000,
    discountPrice: 28000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '18:00',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 4.7,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },

  // 8. Nước Ép Juicy Garden - Chùa Láng (store-hn-08)
  {
    id: 'bag-hn-21',
    merchantId: 'ac5987b4-c50f-4e33-ae1b-42c7a78c74cc',
    merchantName: 'Nước Ép Juicy Garden - Chùa Láng',
    name: 'Túi 2 Chai Nước Ép Trái Cây Cold-Pressed',
    description: '2 chai 350ml ép lạnh nguyên chất (Cần tây táo dứa & Cam cà rốt gừng), không thêm đường và nước.',
    originalPrice: 90000,
    discountPrice: 35000,
    category: 'beverage',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600',
    quantity: 6,
    maxQuantity: 2,
    pickupStart: '19:00',
    pickupEnd: '21:30',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'bag-hn-22',
    merchantId: 'ac5987b4-c50f-4e33-ae1b-42c7a78c74cc',
    merchantName: 'Nước Ép Juicy Garden - Chùa Láng',
    name: 'Smoothie Bowl Detox Xanh & Granola Hạt',
    description: 'Bát sinh tố bơ chuối cải xoăn phủ đầy dâu tây, việt quất và yến mạch nướng mật ong giòn bùi.',
    originalPrice: 85000,
    discountPrice: 38000,
    category: 'beverage',
    imageUrl: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '18:00',
    pickupEnd: '21:00',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },

  // 9. Bếp Cơm Quê Mẹ Nấu - Hồ Tùng Mậu (store-hn-09)
  {
    id: 'bag-hn-23',
    merchantId: '2f207531-63ee-4650-b3ef-71282d3e91c3',
    merchantName: 'Bếp Cơm Quê Mẹ Nấu - Hồ Tùng Mậu',
    name: 'Suất Cơm Gia Đình Canh Cua Rau Đay & Thịt Rang',
    description: 'Cơm trắng gạo tám thơm ăn cùng thịt ba chỉ rang cháy cạnh đậm vị, canh cua đồng giã tay và cà pháo.',
    originalPrice: 75000,
    discountPrice: 35000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '13:00',
    pickupEnd: '14:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-24',
    merchantId: '2f207531-63ee-4650-b3ef-71282d3e91c3',
    merchantName: 'Bếp Cơm Quê Mẹ Nấu - Hồ Tùng Mậu',
    name: 'Túi Cá Kho Tộ Riềng & Canh Chua Miền Bắc',
    description: 'Cá trắm đen kho mục xương đượm vị riềng sả ăn kèm canh cá nấu măng chua và rau muống luộc dầm sấu.',
    originalPrice: 85000,
    discountPrice: 40000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '19:00',
    pickupEnd: '20:30',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'bag-hn-25',
    merchantId: '2f207531-63ee-4650-b3ef-71282d3e91c3',
    merchantName: 'Bếp Cơm Quê Mẹ Nấu - Hồ Tùng Mậu',
    name: 'Phần Cơm Sườn Xào Chua Ngọt Chuẩn Vị Mẹ',
    description: 'Sườn thăn sụn non rim nước sốt cà chua dứa óng ánh, dưa chua xào lòng mề và cơm nóng.',
    originalPrice: 80000,
    discountPrice: 39000,
    category: 'meat',
    imageUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '19:30',
    pickupEnd: '20:30',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },

  // 10. Nhà Hàng Chay Vị Lai - Lý Thường Kiệt (store-hn-10)
  {
    id: 'bag-hn-26',
    merchantId: '6a3e9343-a8a7-4d11-828e-106fb4edbf7c',
    merchantName: 'Nhà Hàng Chay Vị Lai - Lý Thường Kiệt',
    name: 'Túi Cao Cấp Vị Lai: Súp Nấm Rừng & Cơm Lá Sen',
    description: 'Súp nấm tuyết đông trùng hạ thảo, cơm gạo sen gói lá sen hương thơm quý phái và chả nấm mối nướng.',
    originalPrice: 140000,
    discountPrice: 55000,
    category: 'vegetarian',
    imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
    quantity: 3,
    maxQuantity: 1,
    pickupStart: '20:00',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 5.0,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'bag-hn-27',
    merchantId: '6a3e9343-a8a7-4d11-828e-106fb4edbf7c',
    merchantName: 'Nhà Hàng Chay Vị Lai - Lý Thường Kiệt',
    name: 'Combo Chả Giò Rong Biển & Salad Hoa Quả Hữu Cơ',
    description: 'Nem rong biển giòn tan cuộn khoai môn bùi bùi cùng bát salad sốt chanh leo thanh mát bổ dưỡng.',
    originalPrice: 115000,
    discountPrice: 45000,
    category: 'vegetarian',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '19:30',
    pickupEnd: '21:30',
    isAvailable: true,
    rating: 5.0,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },

  // 11. Bơ Bồng Bềnh Bakery - Liễu Giai (store-hn-11)
  {
    id: 'bag-hn-28',
    merchantId: '2840d89d-5fdd-4e7b-a467-20ed26a9e4da',
    merchantName: 'Bơ Bồng Bềnh Bakery - Liễu Giai',
    name: 'Túi Bánh Kem Bắp & Tart Trứng Nướng Phô Mai',
    description: 'Hộp bánh kem bắp cốt bánh chiffon siêu mềm mịn thơm bơ và 2 chiếc tart trứng vỏ ngàn lớp giòn tan.',
    originalPrice: 95000,
    discountPrice: 39000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    quantity: 5,
    maxQuantity: 2,
    pickupStart: '19:30',
    pickupEnd: '21:30',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'bag-hn-29',
    merchantId: '2840d89d-5fdd-4e7b-a467-20ed26a9e4da',
    merchantName: 'Bơ Bồng Bềnh Bakery - Liễu Giai',
    name: 'Bánh Mì Hoa Cúc Brioche Bơ Pháp',
    description: 'Bánh mì hoa cúc sợi bơ Pháp thơm lừng nức nở rắc hạt hạnh nhân lát, thơm ngậy nguyên ngày.',
    originalPrice: 110000,
    discountPrice: 45000,
    category: 'bakery',
    imageUrl: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600',
    quantity: 4,
    maxQuantity: 2,
    pickupStart: '18:30',
    pickupEnd: '21:00',
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },

  // 12. Lạc Trà & Hoa Quả Tươi - Tây Hồ (store-hn-12)
  {
    id: 'bag-hn-30',
    merchantId: '6c2a82a7-0ecd-43f3-bf7d-a74bc7e4a0d5',
    merchantName: 'Lạc Trà & Hoa Quả Tươi - Tây Hồ',
    name: 'Túi Trà Ô Long Mãng Cầu Tươi & Trái Cây Cắt Sẵn',
    description: 'Ly trà ô long thượng hạng dầm mãng cầu tươi ngọt thanh cùng khay dưa hấu và ổi ruby cắt sẵn ướp lạnh.',
    originalPrice: 85000,
    discountPrice: 35000,
    category: 'beverage',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600',
    quantity: 6,
    maxQuantity: 2,
    pickupStart: '19:00',
    pickupEnd: '22:00',
    isAvailable: true,
    rating: 4.8,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
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
                .select('id, store_id, name, description, original_price, discount_price, category, image_url, quantity, max_quantity, pickup_start, pickup_end, is_available, expires_at, created_at, stores(id, name, logo_url, banner_url, address, latitude, longitude, rating, total_ratings)')
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
            phone: s.phone || '+84900000000',
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
        remoteBags = bagsSource.map((b: any) => ({
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
          isAvailable: b.is_available ?? true,
          expiresAt: b.expires_at || undefined,
          rating: b.stores?.rating != null ? Number(b.stores.rating) : (typeof b.rating === 'number' ? Number(b.rating) : 4.8),
          createdAt: b.created_at,
        }));

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
    const allBags = Array.from(new Set(bagMap.values()));

    const brands: Brand[] = allStores.map((m) => ({
      id: m.id,
      name: m.name,
      logo: m.logo,
      description: m.description,
      rating: m.rating,
      totalRatings: m.totalRatings,
      totalStores: 1,
      categories: ['Món Chay', 'Thực Dưỡng', 'Healthy'],
      sustainabilityMessage:
        'Đồng hành cùng GoSavingFood giảm lãng phí thực phẩm mỗi ngày.',
    }));

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
        .eq('is_available', true)
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

        const mappedBags: SurpriseBag[] = (bags || []).map((b: any) => ({
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
          isAvailable: b.is_available ?? true,
          expiresAt: b.expires_at || undefined,
          rating: typeof store.rating === 'number' && store.rating > 0 ? Number(store.rating) : 4.9,
        }));

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
        const remoteOrders = data.map((o: any) => {
          const rev = Array.isArray(o.reviews) ? o.reviews[0] : o.reviews;
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
            status: o.status === 'picked_up' ? 'completed' : o.status,
            paymentMethod: o.payment_method === 'cash' ? 'payos_vietqr' : (o.payment_method || 'payos_vietqr'),
            paymentStatus: o.payment_status || (o.status === 'pending_payment' ? 'pending' : 'success'),
            pickupTime: o.pickup_time || '11:00 - 14:00',
            pickupAddress: o.stores?.address || 'Hà Nội',
            createdAt: o.created_at,
            paidAt: o.paid_at || undefined,
            completedAt: o.completed_at || undefined,
            cancelledAt: o.cancelled_at || undefined,
            cancelReason: o.cancel_reason || undefined,
            note: o.note || undefined,
            qrCode: o.qr_code || `GSF-ORDER-${o.id}`,
            pickupToken: o.pickup_token || undefined,
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
        }));
      }
      if (error) console.warn('Lấy thông báo từ Supabase lỗi:', error.message);
    } catch (err) {
      console.warn('Lấy thông báo từ Supabase lỗi:', err);
    }
    return [];
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
        meta.full_name || meta.name || user.email?.split('@')[0] || 'Khách hàng';
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

  async cancelOrder(orderId: string, reason: string) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.rpc('transition_order_status_transaction', {
        p_order_id: orderId,
        p_target_status: 'cancelled',
        p_actor_id: user.id,
        p_actor_role: 'customer',
      });

      if (error) {
        console.warn('Hủy đơn hàng trên hệ thống lỗi:', error.message, error.details);
        return false;
      }

      if (reason.trim()) {
        const { error: reasonError } = await supabase.rpc('set_order_cancel_reason', {
          p_order_id: orderId,
          p_reason: reason.trim(),
        });
        if (reasonError) console.warn('Lưu lý do hủy đơn lỗi:', reasonError.message);
      }

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
        await supabase.from('users').update(updates).eq('id', user.id);
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
        metaPayload.full_name = updates.name;
        metaPayload.name = updates.name;
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

