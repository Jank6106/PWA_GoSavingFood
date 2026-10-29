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
  { id: 'vegetarian', label: 'Món Chay', icon: 'vegetarian' },
  { id: 'beverage', label: 'Đồ uống', icon: 'beverage' },
  { id: 'raw_food', label: 'Rau củ', icon: 'raw_food' },
  { id: 'other', label: 'Combo bất ngờ', icon: 'other' },
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
  // SVG vector format is already lossless and super lightweight, bypass compression
  if (url.startsWith('data:image/svg+xml') || url.endsWith('.svg')) return url;

  // Unsplash CDN auto-format to WebP/AVIF with dimensions and quality compression
  if (url.includes('images.unsplash.com')) {
    const base = url.split('?')[0];
    return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
  }

  // Cloudinary CDN optimization
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_${quality},w_${width},c_limit/`);
  }

  // Google User Content (avatars/photos)
  if (url.includes('googleusercontent.com')) {
    const base = url.split('=')[0];
    return `${base}=w${width}-c`;
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
  if (c === 'raw_food' || c.includes('rau') || c.includes('củ') || c.includes('trái cây') || c.includes('nông sản')) return 'raw_food';
  if (c === 'vegetarian' || c.includes('chay') || c.includes('healthy')) return 'vegetarian';
  if (c === 'seafood' || c.includes('hải sản') || c.includes('cá') || c.includes('tôm')) return 'seafood';
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/tous-les-jours.jpg",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/tous-les-jours.jpg",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/fresh-garden.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/fresh-garden.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/highlands-coffee.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/highlands-coffee.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/breadtalk.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/paris-baguette.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/sapo-bakery.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/anh-hoa-bakery.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/phuc-long.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/katinat.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/the-coffee-house.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/cong-ca-phe.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/starbucks.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/phe-la.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/cheese-coffee.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/tocotoco.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/dairy-queen.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/baskin-robbins.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/winmart.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/winmart.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/gs25.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/circle-k.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/7-eleven.webp",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/annam-gourmet.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/kombo.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/com-tho-bach-khoa.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/vi-lai.png",
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
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/bep-chay-an-lac.png",
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
    "name": "McDonald's - Hồ Gươm",
    "description": "Bữa ăn nhanh thịnh soạn chuẩn quốc tế với Burger Big Mac huyền thoại và gà rán giòn cay ngắm trọn Hồ Gươm.",
    "phone": "024 3938 1234",
    "address": "2 Hàng Bài, Tràng Tiền, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/mcdonalds.webp",
    "banner": "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 55,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 23:00",
    "latitude": 21.0258,
    "longitude": 105.8528
  },
  {
    "id": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "brandId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "name": "KFC Vietnam - Bà Triệu",
    "description": "Gà rán công thức 11 loại thảo mộc bí truyền, burger zinger giòn cay và bánh trứng nướng nức tiếng phố Bà Triệu.",
    "phone": "1900 6886",
    "address": "292 Bà Triệu, Lê Đại Hành, Hai Bà Trưng, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/kfc-vietnam.webp",
    "banner": "https://images.unsplash.com/photo-1513639776629-7b61b0ac49cb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 48,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "09:00 - 22:00",
    "latitude": 21.0105,
    "longitude": 105.8495
  },
  {
    "id": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "brandId": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "name": "Lotteria - Tràng Tiền",
    "description": "Món gà rán giòn rụm sốt đậu Hàn Quốc, burger phô mai mozzarella kéo sợi và khoai lắc phô mai ngay trung tâm Tràng Tiền.",
    "phone": "1900 6778",
    "address": "1 Tràng Tiền, Phan Chu Trinh, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/lotteria.png",
    "banner": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 62,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:00",
    "latitude": 21.0245,
    "longitude": 105.8572
  },
  {
    "id": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "brandId": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "name": "Domino's Pizza - Liễu Giai",
    "description": "Pizza nhào bột tươi bằng tay theo chuẩn Mỹ, phô mai Mozzarella 100% hảo hạng và bánh mì bơ tỏi.",
    "phone": "1900 6099",
    "address": "54 Liễu Giai, Cống Vị, Ba Đình, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/dominos-pizza.webp",
    "banner": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 37,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "10:00 - 22:00",
    "latitude": 21.0325,
    "longitude": 105.813
  },
  {
    "id": "b1ead7a1-0021-4000-8000-000000000021",
    "brandId": "b1ead7a1-0021-4000-8000-000000000021",
    "name": "Maison Marou Chocolatier - Bà Triệu",
    "description": "Thương hiệu socola thủ công lừng danh thế giới kết hợp các loại bánh ngọt pastry Pháp xa hoa.",
    "phone": "024 3717 3964",
    "address": "91 Bà Triệu, Hàng Bài, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/maison-marou.png",
    "banner": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=1200&q=80",
    "rating": 5,
    "totalRatings": 68,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:30 - 22:00",
    "latitude": 21.0185,
    "longitude": 105.8505
  },
  {
    "id": "b1ead7a1-0022-4000-8000-000000000022",
    "brandId": "b1ead7a1-0022-4000-8000-000000000022",
    "name": "Saint Honoré Bakery - Xuân Diệu",
    "description": "Bistro & tiệm bánh Pháp truyền thống trứ danh Tây Hồ với bánh mì sourdough, croissant và éclair tinh tế.",
    "phone": "024 3933 2345",
    "address": "24 Xuân Diệu, Quảng An, Tây Hồ, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/saint-honore.png",
    "banner": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 58,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 22:00",
    "latitude": 21.0602,
    "longitude": 105.8278
  },
  {
    "id": "b1ead7a1-0023-4000-8000-000000000023",
    "brandId": "b1ead7a1-0023-4000-8000-000000000023",
    "name": "L’Épicerie du Metropole - Sofitel Legend Metropole",
    "description": "Tiệm bánh và ẩm thực Pháp thượng lưu 5 sao giữa lòng thủ đô, macaron quý tộc và bánh brioche bơ Pháp.",
    "phone": "024 3826 6919",
    "address": "15 Ngô Quyền, Tràng Tiền, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/metropole-lepicerie.png",
    "banner": "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80",
    "rating": 5,
    "totalRatings": 92,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 21:30",
    "latitude": 21.0252,
    "longitude": 105.8562
  },
  {
    "id": "b1ead7a1-0024-4000-8000-000000000024",
    "brandId": "b1ead7a1-0024-4000-8000-000000000024",
    "name": "Artisan Bakery & Cafe - Vũ Phạm Hàm",
    "description": "Tiệm bánh thủ công phong cách Hàn Quốc nổi tiếng với bánh kem tươi trái cây, bánh mì gối và pastry bơ hảo hạng.",
    "phone": "024 3200 8833",
    "address": "10 Vũ Phạm Hàm, Trung Hòa, Cầu Giấy, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/artisan-bakery.png",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 41,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 22:00",
    "latitude": 21.0135,
    "longitude": 105.7995
  },
  {
    "id": "b1ead7a1-0025-4000-8000-000000000025",
    "brandId": "b1ead7a1-0025-4000-8000-000000000025",
    "name": "C’est Si Bon Cafe & Dessert - Thái Hà",
    "description": "Không gian tráng miệng và trà bánh thanh lịch với bánh crepe ngàn lớp mille-crêpes và trà trái cây tao nhã.",
    "phone": "024 2244 5599",
    "address": "276 Thái Hà, Chợ Dừa, Đống Đa, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/cest-si-bon.png",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 54,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:30 - 22:30",
    "latitude": 21.0125,
    "longitude": 105.8188
  },
  {
    "id": "b1ead7a1-0026-4000-8000-000000000026",
    "brandId": "b1ead7a1-0026-4000-8000-000000000026",
    "name": "Oromia Coffee & Lounge - Tây Hồ",
    "description": "Quán cà phê sân vườn phong cách resort Tây Hồ với thức uống cold brew hảo hạng và bánh tart dâu tây tươi.",
    "phone": "0908 889 911",
    "address": "8 Quảng Khánh, Quảng An, Tây Hồ, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/oromia-coffee.png",
    "banner": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 63,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 23:00",
    "latitude": 21.0628,
    "longitude": 105.8262
  },
  {
    "id": "b1ead7a1-0027-4000-8000-000000000027",
    "brandId": "b1ead7a1-0027-4000-8000-000000000027",
    "name": "Soko Cake Bake & Brunch - Lý Thường Kiệt",
    "description": "Tiệm bánh và brunch thời thượng phong cách Âu với cronut bơ nướng giòn và bánh croissant lập phương nổi tiếng.",
    "phone": "024 3999 7788",
    "address": "38 Lý Thường Kiệt, Hàng Bài, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/soko-cake.webp",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 47,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:00",
    "latitude": 21.0238,
    "longitude": 105.8522
  },
  {
    "id": "b1ead7a1-0028-4000-8000-000000000028",
    "brandId": "b1ead7a1-0028-4000-8000-000000000028",
    "name": "RuNam d'Or Cafe - Nhà Thờ",
    "description": "Không gian cà phê quý tộc sang trọng phong cách hoàng gia, tinh hoa cà phê thủ công và bánh ngọt chuẩn Ý.",
    "phone": "024 3928 8866",
    "address": "13 Nhà Thờ, Hàng Trống, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/runam.png",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 5,
    "totalRatings": 76,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 23:00",
    "latitude": 21.029,
    "longitude": 105.8493
  },
  {
    "id": "b1ead7a1-0029-4000-8000-000000000029",
    "brandId": "b1ead7a1-0029-4000-8000-000000000029",
    "name": "Là Việt Coffee - Ngô Thì Nhậm",
    "description": "Thương hiệu cà phê đặc sản Đà Lạt trứ danh với hạt Arabica nguyên chất rang mộc và bánh quy bơ thơm bùi.",
    "phone": "024 3633 1188",
    "address": "1B Ngô Thì Nhậm, Hàng Bài, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/la-viet.png",
    "banner": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 52,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 22:00",
    "latitude": 21.0192,
    "longitude": 105.8535
  },
  {
    "id": "b1ead7a1-0030-4000-8000-000000000030",
    "brandId": "b1ead7a1-0030-4000-8000-000000000030",
    "name": "The Rustics Coffeeshop - Điện Biên Phủ",
    "description": "Quán cà phê ngôi nhà trên cây độc đáo, không gian xanh thư thái phục vụ cà phê pha máy và bánh cà rốt nướng.",
    "phone": "024 3747 6622",
    "address": "21B Điện Biên Phủ, Điện Biên, Ba Đình, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/the-rustics.jpg",
    "banner": "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 39,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:30",
    "latitude": 21.0318,
    "longitude": 105.8398
  },
  {
    "id": "b1ead7a1-0031-4000-8000-000000000031",
    "brandId": "b1ead7a1-0031-4000-8000-000000000031",
    "name": "Tous Les Jours - Vincom Metropolis Liễu Giai",
    "description": "Chi nhánh cao cấp tại trung tâm thương mại Vincom Metropolis với bánh danish trái cây và croissant phô mai tươi.",
    "phone": "024 3201 1888",
    "address": "Tầng 1 Vincom Metropolis, 29 Liễu Giai, Ngọc Khánh, Ba Đình, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/tous-les-jours.jpg",
    "banner": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 44,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 22:00",
    "latitude": 21.0315,
    "longitude": 105.8142
  },
  {
    "id": "b1ead7a1-0032-4000-8000-000000000032",
    "brandId": "b1ead7a1-0032-4000-8000-000000000032",
    "name": "La Terrasse - Metropole Hanoi",
    "description": "Quán cà phê vỉa hè phong cách Paris cổ điển tại khách sạn Metropole với cà phê espresso và bánh madeleine.",
    "phone": "024 3826 6919",
    "address": "15 Ngô Quyền, Tràng Tiền, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/la-terrasse.png",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 5,
    "totalRatings": 85,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 23:00",
    "latitude": 21.0255,
    "longitude": 105.856
  },
  {
    "id": "b1ead7a1-0033-4000-8000-000000000033",
    "brandId": "b1ead7a1-0033-4000-8000-000000000033",
    "name": "Paris Baguette - Hoàng Đạo Thúy",
    "description": "Thương hiệu bánh ngọt danh tiếng với bánh mì bơ tỏi phô mai thơm ngậy và pudding sữa hoàng gia.",
    "phone": "024 3556 6688",
    "address": "Tòa 17T5 Hoàng Đạo Thúy, Trung Hòa, Cầu Giấy, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/paris-baguette.webp",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 38,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 22:00",
    "latitude": 21.0075,
    "longitude": 105.803
  },
  {
    "id": "b1ead7a1-0034-4000-8000-000000000034",
    "brandId": "b1ead7a1-0034-4000-8000-000000000034",
    "name": "Bready Bánh Mì Tươi - Đội Cấn",
    "description": "Tiệm bánh mì dinh dưỡng hữu cơ với bánh mì gối nguyên cám, bánh ngọt ít đường và thức uống healthy.",
    "phone": "024 3722 8999",
    "address": "198 Đội Cấn, Đội Cấn, Ba Đình, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/bready-banh-mi.png",
    "banner": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.7,
    "totalRatings": 27,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "06:30 - 21:30",
    "latitude": 21.036,
    "longitude": 105.8205
  },
  {
    "id": "b1ead7a1-0035-4000-8000-000000000035",
    "brandId": "b1ead7a1-0035-4000-8000-000000000035",
    "name": "Blackbird Coffee - Chân Cầm",
    "description": "Quán cà phê rang mộc nổi tiếng khu phố cổ với hương vị espresso nồng nàn và bánh cuộn quế cinnamon thơm lừng.",
    "phone": "0982 998 833",
    "address": "5 Chân Cầm, Hàng Trống, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/blackbird-coffee.jpg",
    "banner": "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 62,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 22:30",
    "latitude": 21.0305,
    "longitude": 105.8488
  },
  {
    "id": "b1ead7a1-0036-4000-8000-000000000036",
    "brandId": "b1ead7a1-0036-4000-8000-000000000036",
    "name": "Tranquil Books & Coffee - Nguyễn Quang Bích",
    "description": "Không gian sách và cà phê tĩnh lặng giữa lòng Hà Nội, chuyên cà phê pha thủ công pour-over và bánh chuối nướng.",
    "phone": "0978 665 522",
    "address": "5 Nguyễn Quang Bích, Cửa Đông, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/tranquil-books.jpg",
    "banner": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 58,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:00 - 22:30",
    "latitude": 21.0328,
    "longitude": 105.8455
  },
  {
    "id": "b1ead7a1-0037-4000-8000-000000000037",
    "brandId": "b1ead7a1-0037-4000-8000-000000000037",
    "name": "All Day Coffee - Quang Trung",
    "description": "Xưởng rang cà phê phong cách châu Âu ấn tượng với món cà phê trứng béo ngậy và bánh waffle nướng mật ong.",
    "phone": "024 6686 8090",
    "address": "37 Quang Trung, Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/all-day-coffee.jpg",
    "banner": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 70,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:00 - 23:00",
    "latitude": 21.0215,
    "longitude": 105.8508
  },
  {
    "id": "b1ead7a1-0038-4000-8000-000000000038",
    "brandId": "b1ead7a1-0038-4000-8000-000000000038",
    "name": "The Hive Lounge - InterContinental Landmark72",
    "description": "Sảnh tiệc trà chiều 5 sao trên tầng 62 khách sạn InterContinental với bánh scone nho khô và pastry thượng phẩm.",
    "phone": "024 3698 8888",
    "address": "Tầng 62 InterContinental Landmark72, Phạm Hùng, Mễ Trì, Nam Từ Liêm, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/the-hive-lounge.png",
    "banner": "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80",
    "rating": 5,
    "totalRatings": 80,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "09:00 - 22:30",
    "latitude": 21.0173,
    "longitude": 105.7838
  },
  {
    "id": "b1ead7a1-0039-4000-8000-000000000039",
    "brandId": "b1ead7a1-0039-4000-8000-000000000039",
    "name": "An Café Specialty Coffee - Tô Ngọc Vân",
    "description": "Xưởng cà phê đặc sản cao cấp khu biệt thự Tây Hồ với hạt cà phê micro-lot tuyển chọn và bánh canelé nướng giòn.",
    "phone": "0936 112 288",
    "address": "52 Tô Ngọc Vân, Quảng An, Tây Hồ, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/an-cafe.png",
    "banner": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.8,
    "totalRatings": 45,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "07:30 - 21:30",
    "latitude": 21.0645,
    "longitude": 105.8255
  },
  {
    "id": "b1ead7a1-0040-4000-8000-000000000040",
    "brandId": "b1ead7a1-0040-4000-8000-000000000040",
    "name": "Jouri Dessert & Tea - Khúc Hạo",
    "description": "Boutique tráng miệng phong cách Bắc Âu lãng mạn với bánh tiramisu rượu thơm và trà thảo mộc organic thanh mát.",
    "phone": "024 3734 9911",
    "address": "10 Khúc Hạo, Điện Biên, Ba Đình, Hà Nội",
    "logo": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands/jouri-dessert.png",
    "banner": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
    "rating": 4.9,
    "totalRatings": 51,
    "distance": 500,
    "status": "active",
    "isOpen": true,
    "openingHours": "08:30 - 22:30",
    "latitude": 21.0325,
    "longitude": 105.8368
  }
];

export const HANOI_BAGS: SurpriseBag[] = [
  {
    "id": "bac70001-0018-4000-8000-000000000018",
    "merchantId": "b1ead7a1-0015-4000-8000-000000000015",
    "merchantName": "7-Eleven - Landmark 72 Phạm Hùng",
    "name": "Túi Cứu Cơm Bento & Món Tiện Lợi Cuối Ca 7-Eleven (Hâm nóng khi dùng)",
    "description": "Túi đồ ăn nhanh tiện lợi quốc tế gồm ngẫu nhiên suất cơm Bento đóng hộp, bánh mì sandwich hoặc thức uống giải khát mát lạnh từ 7-Eleven. Hâm nóng cơm bento 1-2 phút trước khi dùng.",
    "originalPrice": 80000,
    "discountPrice": 30000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:59.284Z"
  },
  {
    "id": "bac80001-0005-4000-8000-000000000005",
    "merchantId": "b1ead7a1-0015-4000-8000-000000000015",
    "merchantName": "7-Eleven - Landmark 72 Phạm Hùng",
    "name": "Túi Cứu Cơm Bento Nóng & Mì Xào Cuối Ca 7-Eleven (Hâm nóng khi dùng)",
    "description": "Hộp cơm bento nóng sốt chuẩn vị Nhật hoặc mì xào thịt xá xíu chuẩn bị trong ngày tại 7-Eleven. Vui lòng hâm nóng 1 phút bằng lò vi sóng trước khi dùng.",
    "originalPrice": 55000,
    "discountPrice": 22000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "11:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:36.103Z"
  },
  {
    "id": "bac80001-0047-4000-8000-000000000047",
    "merchantId": "b1ead7a1-0015-4000-8000-000000000015",
    "merchantName": "7-Eleven - Landmark 72 Phạm Hùng",
    "name": "Túi Cứu Sandwich Tam Giác & Sữa Chua Uống 7-Eleven",
    "description": "Combo bữa sáng/bữa phụ nhẹ bụng gồm sandwich tam giác kẹp thịt phô mai tươi ngon kèm chai sữa chua uống lợi khuẩn đóng chai trong ngày.",
    "originalPrice": 49000,
    "discountPrice": 19000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-004.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:40.477Z"
  },
  {
    "id": "bac70001-0037-4000-8000-000000000037",
    "merchantId": "b1ead7a1-0037-4000-8000-000000000037",
    "merchantName": "All Day Coffee - Quang Trung",
    "name": "Túi Cứu Cà Phê Cold Brew & Bánh Waffle All Day",
    "description": "Túi trải nghiệm All Day gồm 01 chai Cold Brew ủ chậm nguyên bản đóng chai mát lạnh kèm bánh waffle nướng giòn ngọt ngào.",
    "originalPrice": 130000,
    "discountPrice": 48000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:31.954Z"
  },
  {
    "id": "bac80001-0016-4000-8000-000000000016",
    "merchantId": "b1ead7a1-0037-4000-8000-000000000037",
    "merchantName": "All Day Coffee - Quang Trung",
    "name": "Túi Cứu Cà Phê Trứng Đóng Chai & Bánh Scone All Day",
    "description": "Phần sốt kem trứng béo ngậy kèm chai cà phê phin đậm đà đóng chai bảo quản mát cùng bánh scone mứt dâu nướng thơm mộc mạc All Day.",
    "originalPrice": 125000,
    "discountPrice": 48000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:37.401Z"
  },
  {
    "id": "bac70001-0039-4000-8000-000000000039",
    "merchantId": "b1ead7a1-0039-4000-8000-000000000039",
    "merchantName": "An Café Specialty Coffee - Tô Ngọc Vân",
    "name": "Túi Cứu Cà Phê Specialty Đóng Chai & Bánh Canelé An Café",
    "description": "Túi cà phê tinh hoa Tây Hồ gồm chai Cold Brew hạt specialty chọn lọc kèm bánh Canelé nướng vỏ giòn ruột mềm thơm mùi vani Pháp.",
    "originalPrice": 140000,
    "discountPrice": 52000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T13:08:32.572Z"
  },
  {
    "id": "bac80001-0022-4000-8000-000000000022",
    "merchantId": "b1ead7a1-0004-4000-8000-000000000004",
    "merchantName": "Anh Hòa Bakery - Cầu Giấy",
    "name": "Túi Bất Ngờ Bánh Bông Lan Trứng Muối & Cookies Anh Hòa",
    "description": "Túi giải cứu ngọt ngào gồm bánh bông lan trứng muối sốt phô mai béo ngậy kèm hộp bánh quy bơ nướng giòn rụm trong ngày.",
    "originalPrice": 110000,
    "discountPrice": 42000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-007.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:37.975Z"
  },
  {
    "id": "bac70001-0007-4000-8000-000000000007",
    "merchantId": "b1ead7a1-0004-4000-8000-000000000004",
    "merchantName": "Anh Hòa Bakery - Cầu Giấy",
    "name": "Túi Bất Ngờ Bánh Mì & Bánh Ngọt Pháp Anh Hòa Bakery",
    "description": "Túi ngẫu nhiên gồm các dòng bánh nướng bơ sữa New Zealand hảo hạng từ Anh Hòa Bakery (như bánh mì ngũ cốc, mousse chanh leo, tart hoa quả hoặc bánh kem mềm).",
    "originalPrice": 115000,
    "discountPrice": 42000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:57.936Z"
  },
  {
    "id": "bac80001-0042-4000-8000-000000000042",
    "merchantId": "b1ead7a1-0016-4000-8000-000000000016",
    "merchantName": "Annam Gourmet Market - Syrena Tây Hồ",
    "name": "Túi Cứu Nấm Hữu Cơ & Măng Tây Nhập Khẩu Annam Gourmet",
    "description": "Set rau củ thượng hạng gồm măng tây xanh giòn ngọt, nấm Portobello hữu cơ và ớt chuông baby nhập khẩu trực tiếp từ Châu Âu.",
    "originalPrice": 180000,
    "discountPrice": 68000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-007.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:40.070Z"
  },
  {
    "id": "bac70001-0019-4000-8000-000000000019",
    "merchantId": "b1ead7a1-0016-4000-8000-000000000016",
    "merchantName": "Annam Gourmet Market - Syrena Tây Hồ",
    "name": "Túi Cứu Nông Sản & Thực Phẩm Nhập Khẩu Annam Gourmet",
    "description": "Túi ẩm thực ngoại nhập cao cấp gồm ngẫu nhiên phô mai châu Âu hảo hạng, trái cây tươi nhập khẩu, bánh quy bơ hoặc mứt trái cây organic trong ngày.",
    "originalPrice": 250000,
    "discountPrice": 89000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-010.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:59.408Z"
  },
  {
    "id": "bac80001-0040-4000-8000-000000000040",
    "merchantId": "b1ead7a1-0016-4000-8000-000000000016",
    "merchantName": "Annam Gourmet Market - Syrena Tây Hồ",
    "name": "Túi Cứu Rau Salad Chuẩn Âu & Cà Chua Cherry Annam Gourmet",
    "description": "Túi rau sạch chuẩn Âu gồm rau rocket thơm nồng, cải bó xôi baby, cà chua cherry đỏ mọng đóng hộp bảo quản mát tươi nguyên.",
    "originalPrice": 150000,
    "discountPrice": 59000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:39.907Z"
  },
  {
    "id": "bac80001-0039-4000-8000-000000000039",
    "merchantId": "b1ead7a1-0016-4000-8000-000000000016",
    "merchantName": "Annam Gourmet Market - Syrena Tây Hồ",
    "name": "Túi Cứu Trái Cây Nhập Khẩu & Táo Organic Annam Gourmet",
    "description": "Túi hoa quả nhập khẩu cao cấp ngẫu nhiên gồm táo Envy hữu cơ, lê Nam Phi, kiwi vàng hoặc nho không hạt tươi ngon thượng hạng trong ngày.",
    "originalPrice": 190000,
    "discountPrice": 75000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-002.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:39.805Z"
  },
  {
    "id": "bac70001-0024-4000-8000-000000000024",
    "merchantId": "b1ead7a1-0024-4000-8000-000000000024",
    "merchantName": "Artisan Bakery & Cafe - Vũ Phạm Hàm",
    "name": "Túi Bất Ngờ Bánh Kem & Bánh Mì Thủ Công Artisan",
    "description": "Túi bánh tươi phong cách Hàn Quốc gồm ngẫu nhiên bánh kem tươi hoa quả, bánh mì đậu đỏ ngọt bùi hoặc bánh gối mềm dinh dưỡng nướng trong ngày.",
    "originalPrice": 135000,
    "discountPrice": 49000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T13:08:30.194Z"
  },
  {
    "id": "59d0f42d-c280-4b54-bd23-0b4a8b669fe8",
    "merchantId": "6c2a82a7-0ecd-43f3-bf7d-a74bc7e4a0d5",
    "merchantName": "Baskin-Robbins - Tây Hồ",
    "name": "Túi Cứu Kem Sữa Đóng Hộp & Bánh Quế Baskin-Robbins",
    "description": "Túi kem cao cấp ngẫu nhiên từ 31 vị kem nổi tiếng thế giới của Baskin-Robbins đóng hộp bảo quản đông lạnh kèm bánh quế nướng giòn tan béo ngậy.",
    "originalPrice": 140000,
    "discountPrice": 49000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-12T18:31:48.323Z"
  },
  {
    "id": "bac80001-0034-4000-8000-000000000034",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Bánh Bột Lọc Chay & Chả Nấm An Lạc (Hâm nóng khi dùng)",
    "description": "Đĩa bánh bột lọc chay nhân nấm mộc nhĩ dẻo dai trong suốt kèm chả quế chay nướng thơm ngon trong ngày. Hấp nóng lại 2 phút để bánh mềm thơm.",
    "originalPrice": 45000,
    "discountPrice": 18000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-003.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:39.243Z"
  },
  {
    "id": "bac80001-0028-4000-8000-000000000028",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Bún Riêu Chay Nấm Non Cuối Ca An Lạc (Hâm nóng khi dùng)",
    "description": "Suất bún riêu chay ngọt thanh nấu từ rau củ tự nhiên kèm riêu đậu nành, nấm rơm và đậu hũ chiên vàng. Nước dùng và bún đóng hộp riêng, đun nóng khi dùng.",
    "originalPrice": 50000,
    "discountPrice": 20000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-002.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:38.713Z"
  },
  {
    "id": "7a110000-0000-0000-0000-000000000004",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Chè Dưỡng Nhan & Nước Sâm Đóng Chai An Lạc",
    "description": "Túi thức uống thực dưỡng đóng chai thanh mát trong ngày gồm chè tuyết yến dưỡng nhan, nước sâm hoặc hạt sen ninh mềm đóng chai mát lạnh tự nhiên giải tỏa âu lo.",
    "originalPrice": 60000,
    "discountPrice": 22000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-007.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-22T08:02:07.328Z"
  },
  {
    "id": "2c6f95b8-37f6-4ad2-bfaf-b2550cb8035c",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Cơm Chay Thực Dưỡng Cuối Ca An Lạc (Hâm nóng khi dùng)",
    "description": "Phần cơm chay dinh dưỡng đóng hộp từ các món chuẩn bị trong ngày gồm cơm gạo lứt, đậu hũ sốt nấm, rau xào thập cẩm và canh dưỡng sinh thanh tịnh.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-006.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-12T18:31:46.341Z"
  },
  {
    "id": "bac80001-0032-4000-8000-000000000032",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Cơm Gạo Lứt Chả Chay Cuối Ca An Lạc (Hâm nóng khi dùng)",
    "description": "Suất cơm gạo lứt huyết rồng dẻo thơm ăn kèm chả lụa chay kho tiêu và rau củ luộc chấm kho quẹt chay thanh tịnh. Hâm nóng 1 phút trước khi thưởng thức.",
    "originalPrice": 50000,
    "discountPrice": 20000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-006.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:39.060Z"
  },
  {
    "id": "bac80001-0029-4000-8000-000000000029",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Đậu Hũ Kho Nấm & Canh Rau Củ Cuối Ca An Lạc (Hâm nóng khi dùng)",
    "description": "Phần cơm chay gia đình ấm áp gồm đậu hũ non kho nấm hương đậm vị cùng tô canh bí đỏ đậu phộng béo bùi. Hâm nóng 1-2 phút bằng microwave.",
    "originalPrice": 55000,
    "discountPrice": 22000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-011.webp",
    "quantity": 7,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:38.810Z"
  },
  {
    "id": "7a110000-0000-0000-0000-000000000003",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Lẩu Nấm & Rau Chay Cuối Ca An Lạc (Nấu nóng khi dùng)",
    "description": "Phần lẩu chay thảo mộc ngọt thanh tự nhiên gồm nước dùng nấm hầm, nấm tươi thập cẩm và đậu hũ non mềm mượt cho bữa ăn ấm cúng trọn vẹn.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-011.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-22T08:01:16.665Z"
  },
  {
    "id": "ffdae2e8-2df4-4547-88b2-20be1ca1ec79",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Món Chay Tươi Ngon Cuối Ca An Lạc (Hâm nóng khi dùng)",
    "description": "Túi ẩm thực chay bất ngờ gồm bún nem nấm chay giòn rụm hoặc các món gỏi chay tươi mát bổ dưỡng trong ngày. Đóng hộp mang về tiện lợi.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-010.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-12T18:31:46.507Z"
  },
  {
    "id": "bac80001-0030-4000-8000-000000000030",
    "merchantId": "b509682b-350a-4f10-8bbc-a76f6537c248",
    "merchantName": "Bếp Chay An Lạc - Cổ Nhuế",
    "name": "Túi Cứu Phở Chay Nấm Bào Ngư Cuối Ca An Lạc (Nấu nóng khi dùng)",
    "description": "Tô phở chay thanh đạm với nước hầm củ quả ngọt lành, nấm bào ngư xào thơm và bánh phở tươi dẻo đóng hộp sạch sẽ. Đun sôi nước dùng chan bánh phở.",
    "originalPrice": 50000,
    "discountPrice": 20000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "20:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:38.889Z"
  },
  {
    "id": "bac70001-0035-4000-8000-000000000035",
    "merchantId": "b1ead7a1-0035-4000-8000-000000000035",
    "merchantName": "Blackbird Coffee - Chân Cầm",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Quế Blackbird",
    "description": "Túi cà phê phố cổ đậm đà gồm 01 chai cà phê Cold Brew rang mộc ủ lạnh đóng chai sẵn kèm bánh cuộn quế cinnamon roll nướng thơm nức mũi.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:31.787Z"
  },
  {
    "id": "bac70001-0004-4000-8000-000000000004",
    "merchantId": "b1ead7a1-0001-4000-8000-000000000001",
    "merchantName": "BreadTalk - Vincom Bà Triệu",
    "name": "Túi Bất Ngờ Bánh Mì & Pastry Nướng BreadTalk",
    "description": "Túi bánh bất ngờ từ BreadTalk Singapore gồm ngẫu nhiên 3–4 món bánh nướng đặc trưng (như bánh mì chà bông flosss, danish trái cây, bánh phô mai tươi hoặc donut ngọt nướng trong ngày).",
    "originalPrice": 125000,
    "discountPrice": 45000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:57.668Z"
  },
  {
    "id": "bac80001-0020-4000-8000-000000000020",
    "merchantId": "b1ead7a1-0001-4000-8000-000000000001",
    "merchantName": "BreadTalk - Vincom Bà Triệu",
    "name": "Túi Bất Ngờ Bánh Mì Chà Bông Flosss & Donut BreadTalk",
    "description": "Túi bánh đặc trưng BreadTalk gồm bánh mì chà bông cay huyền thoại, bánh donut phủ chocolate và bánh mì gối nướng tươi mềm.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:37.771Z"
  },
  {
    "id": "bac70001-0034-4000-8000-000000000034",
    "merchantId": "b1ead7a1-0034-4000-8000-000000000034",
    "merchantName": "Bready Bánh Mì Tươi - Đội Cấn",
    "name": "Túi Bất Ngờ Bánh Mì Dinh Dưỡng & Nước Ép Tươi Bready",
    "description": "Combo bữa ăn nhẹ thanh lành gồm bánh mì tươi mềm dinh dưỡng kết hợp cùng chai nước ép hoa quả nguyên chất đóng chai trong ngày từ Bready.",
    "originalPrice": 95000,
    "discountPrice": 35000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-27T13:08:31.274Z"
  },
  {
    "id": "bac70001-0025-4000-8000-000000000025",
    "merchantId": "b1ead7a1-0025-4000-8000-000000000025",
    "merchantName": "C’est Si Bon Cafe & Dessert - Thái Hà",
    "name": "Túi Bất Ngờ Bánh Crepe Ngàn Lớp C’est Si Bon",
    "description": "Trải nghiệm bánh ngọt tinh tế ngẫu nhiên gồm các lát bánh crepe ngàn lớp mille crepe trứ danh, tart trái cây hoặc mousse béo ngậy từ C'est Si Bon.",
    "originalPrice": 150000,
    "discountPrice": 55000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:30.297Z"
  },
  {
    "id": "bac70001-0014-4000-8000-000000000014",
    "merchantId": "b1ead7a1-0011-4000-8000-000000000011",
    "merchantName": "Cheese Coffee - Lê Duẩn",
    "name": "Túi Cứu Cà Phê Đóng Chai & Bánh Pastry Cheese Coffee",
    "description": "Túi bất ngờ gồm 01 chai cà phê hoặc trà ủ lạnh đóng chai đặc trưng kèm bánh nướng bơ giòn rụm từ chuỗi cà phê phong cách Châu Âu Cheese Coffee.",
    "originalPrice": 115000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:58.502Z"
  },
  {
    "id": "bac70001-0017-4000-8000-000000000017",
    "merchantId": "b1ead7a1-0014-4000-8000-000000000014",
    "merchantName": "Circle K - Hoàng Đạo Thúy",
    "name": "Túi Cứu Bữa Ăn Tiện Lợi Cuối Ngày Circle K (Hâm nóng khi dùng)",
    "description": "Túi thực phẩm tiện dụng gồm ngẫu nhiên bánh bao nóng, xúc xích nướng, bánh mì ngọt hoặc nước ép đóng chai giải khát nhanh chóng trong ngày.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/mixed/mixed-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-27T12:40:59.187Z"
  },
  {
    "id": "bac80001-0007-4000-8000-000000000007",
    "merchantId": "b1ead7a1-0014-4000-8000-000000000014",
    "merchantName": "Circle K - Hoàng Đạo Thúy",
    "name": "Túi Cứu Cơm Nóng & Bánh Bao Thịt Cuối Ca Circle K (Hâm nóng khi dùng)",
    "description": "Phần cơm nóng tiện lợi kèm bánh bao thịt trứng cút thơm ngon hấp nóng trong ngày. Khuyên dùng: Hâm nóng lại 1 phút trước khi ăn.",
    "originalPrice": 48000,
    "discountPrice": 19000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-001.webp",
    "quantity": 7,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:36.508Z"
  },
  {
    "id": "bac80001-0046-4000-8000-000000000046",
    "merchantId": "b1ead7a1-0014-4000-8000-000000000014",
    "merchantName": "Circle K - Hoàng Đạo Thúy",
    "name": "Túi Cứu Mì Trộn Xúc Xích & Trứng Lòng Đào Circle K (Hâm nóng khi dùng)",
    "description": "Tô mì trộn tiện lợi sốt cay nồng kèm xúc xích nướng giòn và trứng lòng đào béo ngậy chuẩn bị trong ngày tại Circle K. Hâm nóng 1 phút trước khi thưởng thức.",
    "originalPrice": 45000,
    "discountPrice": 18000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-005.webp",
    "quantity": 7,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:40.401Z"
  },
  {
    "id": "bac80001-0003-4000-8000-000000000003",
    "merchantId": "bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7",
    "merchantName": "Cơm Niêu Singapore KOMBO - Duy Tân",
    "name": "Túi Cứu Cơm Niêu Bò Sốt Tiêu Đen Cuối Ca (Hâm nóng khi dùng)",
    "description": "Phần cơm niêu cháy hai mặt giòn rụm kèm thịt bò mềm ngập xốt tiêu đen cay nồng và canh rau xanh. Đóng hộp giữ nhiệt mang về. Khuyên dùng: Hâm nóng 1–2 phút.",
    "originalPrice": 85000,
    "discountPrice": 32000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-009.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "14:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:35.868Z"
  },
  {
    "id": "5a650b75-b805-4fff-a91c-8800623ab25e",
    "merchantId": "bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7",
    "merchantName": "Cơm Niêu Singapore KOMBO - Duy Tân",
    "name": "Túi Cứu Cơm Niêu Cuối Ca (Hâm nóng khi dùng)",
    "description": "Phần cơm niêu Singapore đóng hộp từ ca trưa/tối chưa bán hết, gồm cơm cháy hai mặt giòn rụm kết hợp thịt xốt đậm vị (bò xốt tiêu đen hoặc gà nướng nấm) và canh rau xanh. ⚠️ Lưu ý Yindii: Thức ăn đóng hộp mang về, vui lòng hâm nóng lại 1–2 phút bằng lò vi sóng trước khi thưởng thức.",
    "originalPrice": 110000,
    "discountPrice": 42000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-010.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-12T18:31:47.239Z"
  },
  {
    "id": "bac80001-0004-4000-8000-000000000004",
    "merchantId": "bd45d1dc-e7ae-4ad9-b2b1-6a84da2ee6e7",
    "merchantName": "Cơm Niêu Singapore KOMBO - Duy Tân",
    "name": "Túi Cứu Cơm Niêu Gà Nướng Nấm Cuối Ca (Hâm nóng khi dùng)",
    "description": "Suất cơm niêu gà nướng xốt nấm thơm béo cùng lớp cháy giòn rụm chuẩn Singapore trong ca. Đóng hộp mang về, hâm nóng 1–2 phút trước khi thưởng thức.",
    "originalPrice": 75000,
    "discountPrice": 29000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-011.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "14:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:35.983Z"
  },
  {
    "id": "bac80001-0001-4000-8000-000000000001",
    "merchantId": "db669945-636b-4538-84be-568185e22b13",
    "merchantName": "Cơm Thố Bách Khoa - Trần Cung",
    "name": "Túi Cứu Cơm Thố Bò Nướng Kim Chi Cuối Ca (Hâm nóng khi dùng)",
    "description": "Suất cơm thố bò nướng sốt tiêu thơm lừng kèm kim chi cay giòn và canh rong biển chuẩn bị trong ca chưa bán hết. Đóng hộp mang về sạch sẽ. Khuyên dùng: Hâm nóng lại 1–2 phút bằng lò vi sóng trước khi dùng.",
    "originalPrice": 70000,
    "discountPrice": 28000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-012.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "13:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:35.433Z"
  },
  {
    "id": "931b7eb7-5d18-449a-87f6-1747e9bcfbc5",
    "merchantId": "db669945-636b-4538-84be-568185e22b13",
    "merchantName": "Cơm Thố Bách Khoa - Trần Cung",
    "name": "Túi Cứu Cơm Thố Cuối Ca (Hâm nóng khi dùng)",
    "description": "Phần cơm thố chế biến trong ca trưa/tối chưa bán hết, đóng hộp mang về để cùng GoSavingFood chống lãng phí thực phẩm. Gồm cơm cháy giòn đáy kèm xá xíu hoặc bò nướng đậm đà, kim chi và canh rong biển. ⚠️ Lưu ý Yindii: Thức ăn đóng hộp sạch sẽ, khuyên dùng hâm nóng lại 1–2 phút bằng lò vi sóng hoặc áp chảo trước khi thưởng thức để giữ trọn vị giòn thơm chuẩn quán.",
    "originalPrice": 85000,
    "discountPrice": 32000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-12T18:31:47.397Z"
  },
  {
    "id": "bac80001-0002-4000-8000-000000000002",
    "merchantId": "db669945-636b-4538-84be-568185e22b13",
    "merchantName": "Cơm Thố Bách Khoa - Trần Cung",
    "name": "Túi Cứu Cơm Thố Gà Nấm Xá Xíu Cuối Ca (Hâm nóng khi dùng)",
    "description": "Suất cơm thố xá xíu gà quay nấm giòn cháy đáy đậm vị cuối ca trưa/tối. Đóng hộp mang về. Vui lòng hâm nóng lại 1-2 phút bằng lò vi sóng hoặc chảo nóng.",
    "originalPrice": 65000,
    "discountPrice": 25000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-002.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "13:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:35.759Z"
  },
  {
    "id": "bac80001-0011-4000-8000-000000000011",
    "merchantId": "b1ead7a1-0008-4000-8000-000000000008",
    "merchantName": "Cộng Cà Phê - Nhà Thờ",
    "name": "Túi Cứu Cà Phê Nâu Đóng Chai Sẵn & Bánh Sừng Bò Cộng",
    "description": "Chai cà phê sữa nâu đậm đà ủ lạnh đóng chai thủy tinh mang về (không phục vụ đá tại chỗ) kèm bánh sừng bò nướng mộc mạc thơm lừng.",
    "originalPrice": 95000,
    "discountPrice": 38000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:36.954Z"
  },
  {
    "id": "bac70001-0011-4000-8000-000000000011",
    "merchantId": "b1ead7a1-0008-4000-8000-000000000008",
    "merchantName": "Cộng Cà Phê - Nhà Thờ",
    "name": "Túi Cứu Cà Phê Phin Đóng Chai & Bánh Nướng Cộng",
    "description": "Túi trải nghiệm hoài niệm gồm 01 chai cà phê phin ủ lạnh đóng chai sẵn của Cộng (được bảo quản mát, không phục vụ đá pha sẵn) kèm bánh croissant nướng mộc mạc thơm lừng.",
    "originalPrice": 90000,
    "discountPrice": 35000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:58.263Z"
  },
  {
    "id": "5ae47709-4ceb-4aa9-b77e-284ef5a7c0e6",
    "merchantId": "ac5987b4-c50f-4e33-ae1b-42c7a78c74cc",
    "merchantName": "Dairy Queen - Chùa Láng",
    "name": "Túi Cứu Kem Đóng Hộp & Bánh Lạnh Dairy Queen",
    "description": "Túi tráng miệng giải cứu từ Dairy Queen gồm kem tươi đóng hộp giữ lạnh chuyên dụng hoặc bánh kem lạnh hảo hạng chuẩn phong cách Mỹ, mang về dùng ngay hoặc bảo quản ngăn đông.",
    "originalPrice": 110000,
    "discountPrice": 42000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-12T18:31:47.553Z"
  },
  {
    "id": "bac80001-0049-4000-8000-000000000049",
    "merchantId": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "merchantName": "Domino's Pizza - Liễu Giai",
    "name": "Túi Cứu Bánh Mì Bơ Tỏi Nướng & Xúc Xích Phô Mai Domino's (Làm nóng khi dùng)",
    "description": "Bánh mì bơ tỏi nướng giòn ngậy phô mai Pháp kèm phần xúc xích xông khói đút lò thơm nức cuối ca. Nướng lại bằng lò nướng/nồi chiên không dầu 3 phút.",
    "originalPrice": 79000,
    "discountPrice": 29000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-009.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "14:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:40.654Z"
  },
  {
    "id": "bac80001-0008-4000-8000-000000000008",
    "merchantId": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "merchantName": "Domino's Pizza - Liễu Giai",
    "name": "Túi Cứu Mì Ý Bò Bằm & Cánh Gà Nướng Cuối Ca Domino's (Hâm nóng khi dùng)",
    "description": "Phần mì Ý bò bằm đút lò phô mai béo ngậy kèm cánh gà nướng sốt BBQ thơm lừng cuối ca. Làm nóng bằng lò nướng/vi sóng 2-3 phút.",
    "originalPrice": 99000,
    "discountPrice": 39000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-008.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "14:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:36.611Z"
  },
  {
    "id": "2fd22156-be49-4567-8cd1-e89a168e541b",
    "merchantId": "2840d89d-5fdd-4e7b-a467-20ed26a9e4da",
    "merchantName": "Domino's Pizza - Liễu Giai",
    "name": "Túi Cứu Pizza Nướng Trong Ngày Domino's (Làm nóng khi dùng)",
    "description": "Túi pizza bất ngờ từ bột tươi nhào tay Domino's kèm bánh mì bơ tỏi nướng giòn cuối ca. Vui lòng nướng lại bằng nồi chiên không dầu/lò nướng 3–5 phút để phô mai chảy đều và vỏ bánh giòn tan.",
    "originalPrice": 160000,
    "discountPrice": 59000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-008.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-12T18:31:48.173Z"
  },
  {
    "id": "bac70001-0002-4000-8000-000000000002",
    "merchantId": "5779597d-222b-4e30-9501-f1c44c383331",
    "merchantName": "Fresh Garden Bakery - Nguyễn Thị Thập",
    "name": "Túi Bất Ngờ Bánh Tươi & Bánh Quy Bơ Pháp Fresh Garden",
    "description": "Mỗi phần là một kết hợp ngẫu nhiên các món bánh mì mềm thơm bơ, cookies giòn rụm hoặc bánh ngọt tráng miệng nhẹ nhàng thưởng thức cùng trà chiều.",
    "originalPrice": 100000,
    "discountPrice": 38000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-009.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:57.399Z"
  },
  {
    "id": "8d61a0da-732e-426c-966f-a45e3f57f607",
    "merchantId": "5779597d-222b-4e30-9501-f1c44c383330",
    "merchantName": "Fresh Garden Bakery - Phạm Văn Đồng",
    "name": "Túi Bất Ngờ Bánh Mì & Bánh Ngọt Trong Ngày Fresh Garden",
    "description": "Mỗi ngày là một bất ngờ thú vị! Túi giải cứu gồm ngẫu nhiên 3–4 món bánh nướng trong ngày từ Fresh Garden (như sandwich tươi, donut chocolate, su kem hoặc bánh phô mai mềm) giúp chống lãng phí thực phẩm.",
    "originalPrice": 95000,
    "discountPrice": 35000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-12T18:31:46.664Z"
  },
  {
    "id": "bac70001-0020-4000-8000-000000000020",
    "merchantId": "5779597d-222b-4e30-9501-f1c44c383330",
    "merchantName": "Fresh Garden Bakery - Phạm Văn Đồng",
    "name": "Túi Bất Ngờ Bánh Tráng Miệng & Bánh Nướng Fresh Garden",
    "description": "Tuyển chọn ngẫu nhiên các món bánh ngọt tráng miệng trong ngày từ Fresh Garden (như mousse hoa quả, bánh bông lan kem tươi hoặc bánh quy dinh dưỡng).",
    "originalPrice": 110000,
    "discountPrice": 40000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-011.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:57.320Z"
  },
  {
    "id": "bac80001-0048-4000-8000-000000000048",
    "merchantId": "b1ead7a1-0013-4000-8000-000000000013",
    "merchantName": "GS25 - Duy Tân",
    "name": "Túi Cứu Bánh Gạo Tokbokki Cay & Kimbap Cuối Ca GS25 (Hâm nóng khi dùng)",
    "description": "Suất tokbokki sốt cay chuẩn vị Seoul kèm cuộn kimbap ngũ sắc đầy đặn chuẩn bị trong ngày. Hâm nóng tokbokki trong lò vi sóng 2 phút để bánh gạo dẻo mềm.",
    "originalPrice": 65000,
    "discountPrice": 26000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-005.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:40.569Z"
  },
  {
    "id": "bac70001-0016-4000-8000-000000000016",
    "merchantId": "b1ead7a1-0013-4000-8000-000000000013",
    "merchantName": "GS25 - Duy Tân",
    "name": "Túi Cứu Cơm Bento & Bữa Ăn Nhanh Cuối Ca GS25 (Hâm nóng khi dùng)",
    "description": "Túi đồ ăn tiện lợi phong cách Hàn Quốc gồm ngẫu nhiên cơm nắm tam giác onigiri, sandwich tươi, xúc xích hoặc cơm hộp bento từ GS25.",
    "originalPrice": 85000,
    "discountPrice": 32000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:59.105Z"
  },
  {
    "id": "bac80001-0006-4000-8000-000000000006",
    "merchantId": "b1ead7a1-0013-4000-8000-000000000013",
    "merchantName": "GS25 - Duy Tân",
    "name": "Túi Cứu Cơm Bento Gà Cay Phô Mai Cuối Ca GS25 (Hâm nóng khi dùng)",
    "description": "Suất cơm hộp Bento gà sốt cay Hàn Quốc phủ phô mai béo ngậy kèm đồ chua dinh dưỡng. Đóng hộp mang về, quay nóng microwave 1-2 phút để phô mai kéo sợi.",
    "originalPrice": 59000,
    "discountPrice": 24000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-001.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "11:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:36.400Z"
  },
  {
    "id": "5f93f54c-f73a-4737-9d61-2de5396029aa",
    "merchantId": "4bd5a486-8ee2-49cf-8bd6-6eacf946db56",
    "merchantName": "Highlands Coffee - IPH Xuân Thủy",
    "name": "Túi Cứu Cà Phê Đóng Chai & Bánh Tươi Highlands",
    "description": "Túi giải cứu gồm cà phê phin đóng chai lạnh sẵn trong ngày (không kèm đá pha tại chỗ để bảo toàn hương vị đậm đà) kết hợp ngẫu nhiên cùng 1 phần bánh ngọt tươi ngon nướng trong ngày từ Highlands Coffee.",
    "originalPrice": 85000,
    "discountPrice": 35000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-12T18:31:47.036Z"
  },
  {
    "id": "bac80001-0014-4000-8000-000000000014",
    "merchantId": "4bd5a486-8ee2-49cf-8bd6-6eacf946db56",
    "merchantName": "Highlands Coffee - IPH Xuân Thủy",
    "name": "Túi Cứu Trà Sen Vàng Đóng Chai Lạnh & Bánh Phô Mai Highlands",
    "description": "Túi giải cứu gồm chai nước cốt trà sen vàng ủ lạnh đóng chai bảo quản mát (không kèm đá pha sẵn) kèm bánh phô mai cà phê thơm béo trong ngày.",
    "originalPrice": 105000,
    "discountPrice": 39000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "23:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:37.225Z"
  },
  {
    "id": "bac70001-0003-4000-8000-000000000003",
    "merchantId": "4bd5a486-8ee2-49cf-8bd6-6eacf946db57",
    "merchantName": "Highlands Coffee - Vincom Nguyễn Chí Thanh",
    "name": "Túi Cứu Cà Phê Đóng Chai & Bánh Ngọt Highlands",
    "description": "Túi giải cứu thực phẩm gồm 01 chai cà phê phin đóng chai sẵn hoặc lon cà phê Highlands ướp lạnh (không phục vụ đá pha sẵn để tránh tan đá nhạt vị) kèm ngẫu nhiên 1 phần bánh phô mai, bánh chuối nướng hoặc mousse ngọt ngào trong ngày.",
    "originalPrice": 90000,
    "discountPrice": 38000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:57.560Z"
  },
  {
    "id": "bac70001-0040-4000-8000-000000000040",
    "merchantId": "b1ead7a1-0040-4000-8000-000000000040",
    "merchantName": "Jouri Dessert & Tea - Khúc Hạo",
    "name": "Túi Bất Ngờ Tráng Miệng Tiramisu & Trà Hoa Jouri",
    "description": "Túi tráng miệng lãng mạn Bắc Âu từ Jouri gồm bánh tiramisu ngập tràn kem phô mai Mascarpone thoảng hương rượu kèm chai trà hoa cúc mật ong thư giãn đóng chai trong ngày.",
    "originalPrice": 135000,
    "discountPrice": 49000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-006.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:32.651Z"
  },
  {
    "id": "bac70001-0009-4000-8000-000000000009",
    "merchantId": "b1ead7a1-0006-4000-8000-000000000006",
    "merchantName": "Katinat Saigon Kafe - Lý Thường Kiệt",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Sừng Bò Katinat",
    "description": "Túi giải cứu thời thượng gồm 01 chai Cold Brew hoặc trà ủ lạnh đóng chai bảo quản mát (không kèm đá) kết hợp cùng bánh sừng bò nướng bơ Pháp giòn rụm từ Katinat.",
    "originalPrice": 110000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:58.102Z"
  },
  {
    "id": "bac80001-0012-4000-8000-000000000012",
    "merchantId": "b1ead7a1-0006-4000-8000-000000000006",
    "merchantName": "Katinat Saigon Kafe - Lý Thường Kiệt",
    "name": "Túi Cứu Trà Trái Cây Ủ Lạnh Đóng Chai & Bánh Tart Katinat",
    "description": "Túi thức uống gồm chai trà lài ủ lạnh trái cây thơm ngát đóng chai tiện lợi (không kèm đá) kèm bánh tart trứng nướng phô mai giòn rụm từ Katinat.",
    "originalPrice": 110000,
    "discountPrice": 42000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:37.040Z"
  },
  {
    "id": "14a29188-ad1d-49ff-bed9-bccb7aac0533",
    "merchantId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "merchantName": "KFC Vietnam - Bà Triệu",
    "name": "Lạp xưởng nướng đá",
    "description": "test",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-popcorn-chicken.webp",
    "quantity": 3,
    "maxQuantity": 2,
    "pickupStart": "18:00",
    "pickupEnd": "20:00",
    "isAvailable": false,
    "rating": 4.7,
    "createdAt": "2026-10-29T03:06:46.460Z"
  },
  {
    "id": "5f637281-5d7e-478f-8b58-330ed5eb2326",
    "merchantId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "merchantName": "KFC Vietnam - Bà Triệu",
    "name": "Túi Cứu Bánh Trứng & Burger Cuối Ca KFC (Làm nóng khi dùng)",
    "description": "Túi giải cứu thực phẩm đóng hộp gồm bánh trứng nướng egg tart thơm ngậy ngàn lớp hoặc burger phi-lê gà giòn cay Zinger nức tiếng trong ngày.",
    "originalPrice": 115000,
    "discountPrice": 42000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-burger-eggtart.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-27T12:10:44.957Z"
  },
  {
    "id": "d5bd05a9-7324-4493-a6e6-489e30f6d573",
    "merchantId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "merchantName": "KFC Vietnam - Bà Triệu",
    "name": "Túi Cứu Gà Giòn & Bữa Ăn Nhanh Cuối Ca KFC (Làm nóng khi dùng)",
    "description": "Túi bất ngờ từ KFC gồm gà rán công thức 11 loại thảo mộc huyền thoại hoặc gà giòn cay kèm khoai tây lắc phô mai chuẩn bị trong ca. Khuyên dùng hâm nóng lại để vỏ gà giòn rụm.",
    "originalPrice": 125000,
    "discountPrice": 46000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-chicken-bucket.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-27T12:10:44.957Z"
  },
  {
    "id": "bac80001-0043-4000-8000-000000000043",
    "merchantId": "5b051934-45e2-4cbe-92b7-7e78c4b51710",
    "merchantName": "KFC Vietnam - Bà Triệu",
    "name": "Túi Cứu Gà Popcorn & Khoai Tây Chiên Cuối Ca KFC (Làm nóng khi dùng)",
    "description": "Phần gà viên Popcorn tẩm ướp cay giòn kèm khoai tây chiên giòn rụm đóng hộp cuối ca. Khuyên dùng: Cho vào nồi chiên không dầu 3 phút để gà giòn tan.",
    "originalPrice": 75000,
    "discountPrice": 29000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-popcorn-chicken.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:40.155Z"
  },
  {
    "id": "bac70001-0023-4000-8000-000000000023",
    "merchantId": "b1ead7a1-0023-4000-8000-000000000023",
    "merchantName": "L’Épicerie du Metropole - Sofitel Legend Metropole",
    "name": "Túi Bất Ngờ Bánh Ngọt Quý Tộc L’Épicerie Metropole",
    "description": "Túi tráng miệng 5 sao di sản từ Metropole gồm ngẫu nhiên các món macaron danh giá, bánh brioche bơ Pháp thượng phẩm hoặc bánh pastry tinh xảo nướng trong ngày.",
    "originalPrice": 250000,
    "discountPrice": 89000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-27T13:08:30.105Z"
  },
  {
    "id": "bac80001-0025-4000-8000-000000000025",
    "merchantId": "b1ead7a1-0023-4000-8000-000000000023",
    "merchantName": "L’Épicerie du Metropole - Sofitel Legend Metropole",
    "name": "Túi Bất Ngờ Macaron 5 Sao & Bánh Pastry Metropole",
    "description": "Hộp bánh tráng miệng di sản 5 sao gồm 3-4 chiếc macaron đủ vị tinh tế và bánh pastry nướng bơ Pháp thơm lừng từ Metropole.",
    "originalPrice": 220000,
    "discountPrice": 89000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-002.webp",
    "quantity": 3,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-28T06:05:38.239Z"
  },
  {
    "id": "bac70001-0032-4000-8000-000000000032",
    "merchantId": "b1ead7a1-0032-4000-8000-000000000032",
    "merchantName": "La Terrasse - Metropole Hanoi",
    "name": "Túi Cứu Trà Đóng Chai Di Sản & Bánh Madeleine Metropole",
    "description": "Túi phong vị Paris cổ điển 5 sao từ Metropole gồm trà ủ lạnh đóng chai cao cấp kèm các mẩu bánh madeleine bơ tươi hoặc bánh quy Pháp nướng mới trong ngày.",
    "originalPrice": 240000,
    "discountPrice": 85000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-27T13:08:31.084Z"
  },
  {
    "id": "bac70001-0029-4000-8000-000000000029",
    "merchantId": "b1ead7a1-0029-4000-8000-000000000029",
    "merchantName": "Là Việt Coffee - Ngô Thì Nhậm",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng Là Việt",
    "description": "Túi cà phê đặc sản Đà Lạt gồm 01 chai cà phê Cold Brew Arabica nguyên chất đóng chai sẵn (không dùng đá pha tại chỗ) kèm bánh quy bơ hạt điều hoặc bánh ngọt nướng mộc mạc.",
    "originalPrice": 115000,
    "discountPrice": 42000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T13:08:30.817Z"
  },
  {
    "id": "16eaa1e9-b4ca-46c9-a779-aca11b6bd567",
    "merchantId": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "merchantName": "Lotteria - Tràng Tiền",
    "name": "Túi Cứu Burger & Phô Mai Que Cuối Ca Lotteria (Làm nóng khi dùng)",
    "description": "Túi món ăn nhanh đóng hộp ngẫu nhiên gồm burger tôm hoặc burger bò phô mai kèm phô mai que Mozzarella nướng giòn cuối ca. Làm nóng lại 2-3 phút để phô mai tan chảy thơm ngậy.",
    "originalPrice": 110000,
    "discountPrice": 40000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-burger-eggtart.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-11T10:40:55.228Z"
  },
  {
    "id": "03aa4b45-1c0a-4b5b-9419-8ca44123b842",
    "merchantId": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "merchantName": "Lotteria - Tràng Tiền",
    "name": "Túi Cứu Gà Rán & Bữa Ăn Nhanh Cuối Ca Lotteria (Làm nóng khi dùng)",
    "description": "Túi giải cứu từ Lotteria gồm gà rán sốt đậu hoặc gà rán truyền thống da giòn kèm khoai tây chiên chuẩn bị trong ca. Khuyên dùng làm nóng lại bằng nồi chiên không dầu trước khi dùng.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-chicken-bucket.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-11T10:00:55.751Z"
  },
  {
    "id": "bac80001-0045-4000-8000-000000000045",
    "merchantId": "799e644e-2f82-4a85-ba12-b194cf4cc547",
    "merchantName": "Lotteria - Tràng Tiền",
    "name": "Túi Cứu Gà Sốt Đậu Cay & Mực Rán Cuối Ca Lotteria (Làm nóng khi dùng)",
    "description": "Suất gà rán phủ sốt đậu ngọt cay kiểu Hàn Quốc đậm đà kèm khoanh mực chiên giòn thơm nức mũi. Làm nóng lại bằng nồi chiên không dầu để giữ độ giòn.",
    "originalPrice": 85000,
    "discountPrice": 34000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-popcorn-chicken.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:40.323Z"
  },
  {
    "id": "bac80001-0024-4000-8000-000000000024",
    "merchantId": "b1ead7a1-0021-4000-8000-000000000021",
    "merchantName": "Maison Marou Chocolatier - Bà Triệu",
    "name": "Túi Bất Ngờ Bánh Brownie & Mousse Cacao Maison Marou",
    "description": "Túi tráng miệng thượng hạng gồm bánh brownie socola đậm đà, tart socola hạt phỉ hoặc bánh nướng bơ cacao nguyên chất Marou.",
    "originalPrice": 180000,
    "discountPrice": 69000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-003.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-28T06:05:38.138Z"
  },
  {
    "id": "bac70001-0021-4000-8000-000000000021",
    "merchantId": "b1ead7a1-0021-4000-8000-000000000021",
    "merchantName": "Maison Marou Chocolatier - Bà Triệu",
    "name": "Túi Bất Ngờ Bánh Ngọt & Socola Thủ Công Maison Marou",
    "description": "Túi bất ngờ thượng lưu từ Maison Marou gồm các loại bánh ngọt ngẫu nhiên như mousse socola, brownie đậm vị, tart cacao hoặc pastry nướng trong ngày.",
    "originalPrice": 180000,
    "discountPrice": 65000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-27T13:08:29.921Z"
  },
  {
    "id": "bac80001-0044-4000-8000-000000000044",
    "merchantId": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "merchantName": "McDonald's - Hồ Gươm",
    "name": "Túi Cứu Bánh Pie Táo Nóng & Burger Phô Mai McDonald's (Làm nóng khi dùng)",
    "description": "Combo bất ngờ gồm bánh táo nướng giòn ngọt ngào ngàn lớp kèm burger phô mai nướng thơm béo chuẩn vị Mỹ. Hâm nóng 1 phút trước khi ăn.",
    "originalPrice": 79000,
    "discountPrice": 32000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-burger-eggtart.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:40.243Z"
  },
  {
    "id": "e59e4220-3882-4f02-95e3-21d51abe796d",
    "merchantId": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "merchantName": "McDonald's - Hồ Gươm",
    "name": "Túi Cứu Burger & Món Nóng Cuối Ca McDonald's (Làm nóng khi dùng)",
    "description": "Túi thức ăn đóng hộp gồm burger bò nướng lửa thơm khói hoặc burger phi-lê kèm khoai tây chiên cuối ca. Vui lòng làm nóng lại trước khi thưởng thức để bánh mềm ngon.",
    "originalPrice": 130000,
    "discountPrice": 49000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-burger-eggtart.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:10:44.822Z"
  },
  {
    "id": "bac80001-0009-4000-8000-000000000009",
    "merchantId": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "merchantName": "McDonald's - Hồ Gươm",
    "name": "Túi Cứu Cơm Gà Giòn Sốt Cay & Canh Nóng McDonald's (Hâm nóng khi dùng)",
    "description": "Suất cơm gà rán giòn rụm da giòn kèm sốt tỏi cay và canh súp nóng chuẩn bị trong ngày. Hâm nóng 1–2 phút để cơm dẻo và gà giòn như mới.",
    "originalPrice": 69000,
    "discountPrice": 29000,
    "category": "meat",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-chicken-bucket.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "11:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:36.703Z"
  },
  {
    "id": "c101a5bd-472a-4135-a948-ad8c50b8e121",
    "merchantId": "afbde72f-ac50-4f1e-873f-9bed4e118f04",
    "merchantName": "McDonald's - Hồ Gươm",
    "name": "Túi Cứu Gà Giòn & Bữa Ăn Nhanh Cuối Ca McDonald's (Làm nóng khi dùng)",
    "description": "Túi giải cứu thức ăn nhanh chuẩn vị McDonald's gồm gà rán, burger hoặc khoai tây chiên chuẩn bị trong ca chưa bán hết, đóng hộp mang về. 💡 Khuyên dùng làm nóng lại bằng nồi chiên không dầu 3–5 phút để giòn ngon như mới.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/kfc-chicken-bucket.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:10:44.822Z"
  },
  {
    "id": "b673df8e-2657-4d5c-bc32-3839100fc7f4",
    "merchantId": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "merchantName": "Nhà Hàng Chay Vị Lai - Lý Thường Kiệt",
    "name": "Túi Cứu Ẩm Thực Chay Tinh Tế Cuối Ca Vị Lai (Hâm nóng khi dùng)",
    "description": "Túi mỹ vị thực dưỡng thanh tịnh từ Vị Lai gồm súp nấm rừng bổ dưỡng, cơm bọc lá sen hoặc các món chay nghệ thuật chế biến trong ngày chưa bán hết. Đóng hộp mang về sạch sẽ.",
    "originalPrice": 150000,
    "discountPrice": 55000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "10:30",
    "pickupEnd": "21:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-12T18:31:47.964Z"
  },
  {
    "id": "bac80001-0031-4000-8000-000000000031",
    "merchantId": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "merchantName": "Nhà Hàng Chay Vị Lai - Lý Thường Kiệt",
    "name": "Túi Cứu Cơm Chiên Trái Thơm & Đậu Hũ Cốm Vị Lai (Hâm nóng khi dùng)",
    "description": "Món cơm chiên chay quả thơm hạt dẻo thơm ngát kết hợp đậu hũ tẩm cốm non giòn rụm chuẩn bị trong ca chưa bán hết của nhà hàng Vị Lai.",
    "originalPrice": 115000,
    "discountPrice": 45000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-006.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "14:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:38.971Z"
  },
  {
    "id": "bac80001-0026-4000-8000-000000000026",
    "merchantId": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "merchantName": "Nhà Hàng Chay Vị Lai - Lý Thường Kiệt",
    "name": "Túi Cứu Cơm Sen Thực Dưỡng & Súp Nấm Cuối Ca Vị Lai (Hâm nóng khi dùng)",
    "description": "Phần cơm hấp lá sen thơm lừng hạt sen bùi béo kèm bát súp nấm rừng thanh mát bổ dưỡng chuẩn bị trong ca. Hâm nóng 1–2 phút trước khi thưởng thức.",
    "originalPrice": 120000,
    "discountPrice": 46000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-006.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "14:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:38.331Z"
  },
  {
    "id": "bac80001-0033-4000-8000-000000000033",
    "merchantId": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "merchantName": "Nhà Hàng Chay Vị Lai - Lý Thường Kiệt",
    "name": "Túi Cứu Lẩu Nấm Dưỡng Sinh Chay Cuối Ca Vị Lai (Nấu nóng khi dùng)",
    "description": "Set lẩu nấm thượng phẩm gồm nước dùng thảo quả bổ dưỡng, 4 loại nấm quý tươi non và rau hữu cơ tươi sạch đóng gói mang về.",
    "originalPrice": 190000,
    "discountPrice": 75000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-011.webp",
    "quantity": 3,
    "maxQuantity": 3,
    "pickupStart": "14:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:39.164Z"
  },
  {
    "id": "bac80001-0027-4000-8000-000000000027",
    "merchantId": "6a3e9343-a8a7-4d11-828e-106fb4edbf7c",
    "merchantName": "Nhà Hàng Chay Vị Lai - Lý Thường Kiệt",
    "name": "Túi Cứu Nem Nấm Chiên Giòn & Gỏi Ngó Sen Chay Vị Lai (Hâm nóng khi dùng)",
    "description": "Túi món ăn chay thanh tịnh gồm đĩa nem nấm chiên giòn rụm kèm gỏi ngó sen ngũ sắc chua ngọt giải nhiệt trong ngày. Nem làm nóng lại bằng nồi chiên không dầu.",
    "originalPrice": 110000,
    "discountPrice": 42000,
    "category": "vegetarian",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/meals/meal-011.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "14:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:38.579Z"
  },
  {
    "id": "bac70001-0026-4000-8000-000000000026",
    "merchantId": "b1ead7a1-0026-4000-8000-000000000026",
    "merchantName": "Oromia Coffee & Lounge - Tây Hồ",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Tart Oromia",
    "description": "Túi giải cứu bên hồ Tây từ Oromia gồm bánh tart trái cây tươi theo mùa hoặc bánh ngọt kem tươi kết hợp cùng 01 chai cà phê Cold Brew ủ lạnh thanh lọc đóng chai sẵn.",
    "originalPrice": 145000,
    "discountPrice": 52000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:30.387Z"
  },
  {
    "id": "bac70001-0033-4000-8000-000000000033",
    "merchantId": "b1ead7a1-0033-4000-8000-000000000033",
    "merchantName": "Paris Baguette - Hoàng Đạo Thúy",
    "name": "Túi Bất Ngờ Bánh Mì Bơ Tỏi & Tráng Miệng Paris Baguette",
    "description": "Túi bánh tươi bất ngờ từ Paris Baguette gồm bánh mì bơ tỏi phô mai thơm lừng, bánh custard mềm mịn hoặc bánh sừng bò nướng trong ngày.",
    "originalPrice": 155000,
    "discountPrice": 56000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T13:08:31.189Z"
  },
  {
    "id": "bac70001-0005-4000-8000-000000000005",
    "merchantId": "b1ead7a1-0002-4000-8000-000000000002",
    "merchantName": "Paris Baguette - Tràng Tiền Plaza",
    "name": "Túi Bất Ngờ Bánh Mì Chuẩn Âu & Pastry Paris Baguette",
    "description": "Túi bánh cao cấp ngẫu nhiên từ Paris Baguette (có thể bao gồm bánh mì baguette nướng vỏ giòn, croissant bơ thơm, bánh kem phô mai hoặc pastry hoa quả nướng trong ngày).",
    "originalPrice": 160000,
    "discountPrice": 59000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:57.747Z"
  },
  {
    "id": "bac80001-0019-4000-8000-000000000019",
    "merchantId": "b1ead7a1-0002-4000-8000-000000000002",
    "merchantName": "Paris Baguette - Tràng Tiền Plaza",
    "name": "Túi Bất Ngờ Bánh Tart Trái Cây & Croissant Paris Baguette",
    "description": "Túi bánh ngọt cao cấp gồm ngẫu nhiên bánh tart hoa quả tươi, bánh sừng bò bơ Pháp ngàn lớp nướng mới mỗi ngày từ Paris Baguette.",
    "originalPrice": 160000,
    "discountPrice": 58000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:37.684Z"
  },
  {
    "id": "bac80001-0013-4000-8000-000000000013",
    "merchantId": "b1ead7a1-0010-4000-8000-000000000010",
    "merchantName": "Phê La - Hàng Cót",
    "name": "Túi Cứu Cà Phê Cốt Dừa Cold Brew & Bánh Nướng Phê La",
    "description": "Túi bất ngờ gồm chai cà phê Cold Brew cốt dừa ủ lạnh thủ công (đóng chai sẵn mát lạnh) kèm bánh mì nướng bơ sữa mềm xốp trong ngày từ Phê La.",
    "originalPrice": 115000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:37.124Z"
  },
  {
    "id": "bac70001-0013-4000-8000-000000000013",
    "merchantId": "b1ead7a1-0010-4000-8000-000000000010",
    "merchantName": "Phê La - Hàng Cót",
    "name": "Túi Cứu Trà Ô Long Ủ Lạnh & Bánh Nướng Phê La",
    "description": "Túi bất ngờ từ Phê La gồm 01 chai trà Ô Long thủ công ủ lạnh đậm vị từ đồi chè Bảo Lộc (đóng chai sẵn không kèm đá để giữ trọn hậu vị thơm ngát) kèm bánh mì nướng mềm thơm bơ trong ngày.",
    "originalPrice": 110000,
    "discountPrice": 45000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:58.425Z"
  },
  {
    "id": "bac70001-0008-4000-8000-000000000008",
    "merchantId": "b1ead7a1-0005-4000-8000-000000000005",
    "merchantName": "Phúc Long Coffee & Tea - Lotte Center Liễu Giai",
    "name": "Túi Cứu Trà Đóng Chai Đậm Vị & Bánh Ngọt Phúc Long",
    "description": "Túi giải cứu từ Phúc Long gồm chai trà Ô Long hoặc trà trái cây đậm vị ủ lạnh đóng chai (không đá pha tại chỗ) kèm bánh ngọt nướng thơm béo trong ngày.",
    "originalPrice": 105000,
    "discountPrice": 42000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:45",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:58.021Z"
  },
  {
    "id": "bac70001-0028-4000-8000-000000000028",
    "merchantId": "b1ead7a1-0028-4000-8000-000000000028",
    "merchantName": "RuNam d'Or Cafe - Nhà Thờ",
    "name": "Túi Cứu Cà Phê Di Sản Đóng Chai & Bánh Pastry RuNam",
    "description": "Túi ẩm thực thượng lưu RuNam gồm chai cà phê ủ lạnh tinh túy từ hạt Arabica Cầu Đất kèm bánh tart hoa quả hoặc pastry bơ nướng thơm lừng.",
    "originalPrice": 190000,
    "discountPrice": 69000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-27T13:08:30.606Z"
  },
  {
    "id": "bac80001-0017-4000-8000-000000000017",
    "merchantId": "b1ead7a1-0028-4000-8000-000000000028",
    "merchantName": "RuNam d'Or Cafe - Nhà Thờ",
    "name": "Túi Cứu Trà Thảo Mộc Đóng Chai & Bánh Tart RuNam",
    "description": "Chai trà hoa cúc thảo mộc ủ lạnh thanh lọc thượng phẩm kèm bánh tart quả mọng tươi ngon nướng mới từ RuNam d'Or.",
    "originalPrice": 160000,
    "discountPrice": 65000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 3,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-28T06:05:37.506Z"
  },
  {
    "id": "bac80001-0021-4000-8000-000000000021",
    "merchantId": "b1ead7a1-0022-4000-8000-000000000022",
    "merchantName": "Saint Honoré Bakery - Xuân Diệu",
    "name": "Túi Bất Ngờ Bánh Éclair Socola & Brioche Pháp Saint Honoré",
    "description": "Túi bánh chuẩn phong vị Pháp truyền thống gồm bánh su dài éclair socola, bánh mì hoa cúc brioche bơ Pháp vàng óng nướng trong ngày.",
    "originalPrice": 155000,
    "discountPrice": 55000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:37.877Z"
  },
  {
    "id": "bac70001-0022-4000-8000-000000000022",
    "merchantId": "b1ead7a1-0022-4000-8000-000000000022",
    "merchantName": "Saint Honoré Bakery - Xuân Diệu",
    "name": "Túi Bất Ngờ Bánh Mì Men Sourdough & Pastry Saint Honoré",
    "description": "Túi bất ngờ phong vị Pháp từ Saint Honoré gồm ngẫu nhiên bánh mì men sourdough, croissant bơ vàng ruộm, bánh su dài éclair hoặc bánh brioche mềm nướng trong ngày.",
    "originalPrice": 160000,
    "discountPrice": 58000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:30.014Z"
  },
  {
    "id": "bac80001-0023-4000-8000-000000000023",
    "merchantId": "b1ead7a1-0003-4000-8000-000000000003",
    "merchantName": "Sapo Bakery - Quang Trung Hà Đông",
    "name": "Túi Bất Ngờ Bánh Mì Gối Sữa & Bánh Su Kem Sapo",
    "description": "Túi bánh gia đình gồm ổ bánh mì gối sữa tươi mềm mịn, bánh su kem vanilla mát lạnh và bánh nướng phô mai trong ngày.",
    "originalPrice": 95000,
    "discountPrice": 36000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:38.052Z"
  },
  {
    "id": "bac70001-0006-4000-8000-000000000006",
    "merchantId": "b1ead7a1-0003-4000-8000-000000000003",
    "merchantName": "Sapo Bakery - Quang Trung Hà Đông",
    "name": "Túi Bất Ngờ Bánh Thủ Công & Su Kem Sapo Bakery",
    "description": "Túi bất ngờ từ Sapo Bakery gồm ngẫu nhiên các loại bánh su kem béo ngậy, bánh mì bơ tỏi nướng hoặc bánh bông lan trứng muối tươi ngon nướng trong ngày.",
    "originalPrice": 90000,
    "discountPrice": 32000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-007.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-27T12:40:57.855Z"
  },
  {
    "id": "bac70001-0027-4000-8000-000000000027",
    "merchantId": "b1ead7a1-0027-4000-8000-000000000027",
    "merchantName": "Soko Cake Bake & Brunch - Lý Thường Kiệt",
    "name": "Túi Bất Ngờ Bánh Nướng Sáng Tạo Soko Cake Bake",
    "description": "Túi bánh thời thượng ngẫu nhiên gồm các siêu phẩm nướng từ Soko như bánh cronut kem bơ, cube croissant ngàn lớp hoặc bánh pastry nướng giòn rụm trong ngày.",
    "originalPrice": 165000,
    "discountPrice": 59000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-008.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:30.513Z"
  },
  {
    "id": "bac70001-0012-4000-8000-000000000012",
    "merchantId": "b1ead7a1-0009-4000-8000-000000000009",
    "merchantName": "Starbucks Coffee - Nhà Thờ Lớn",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng Starbucks",
    "description": "Túi bất ngờ từ Starbucks gồm 01 phần cà phê Cold Brew ủ lạnh đóng chai hoặc lon Starbucks Reserve (không phục vụ đá pha tại chỗ) kèm 1 bánh pastry nướng tươi chuẩn mực.",
    "originalPrice": 165000,
    "discountPrice": 65000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:58.350Z"
  },
  {
    "id": "bac80001-0010-4000-8000-000000000010",
    "merchantId": "b1ead7a1-0009-4000-8000-000000000009",
    "merchantName": "Starbucks Coffee - Nhà Thờ Lớn",
    "name": "Túi Cứu Trà Hibiscus Ủ Lạnh Đóng Chai & Bánh Muffin Starbucks",
    "description": "Túi thức uống giải cứu gồm 01 chai trà hoa atiso đỏ Hibiscus ủ lạnh thanh mát (không đá) kèm bánh muffin chocolate thơm ngậy từ Starbucks.",
    "originalPrice": 130000,
    "discountPrice": 49000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 4,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "22:30",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:36.877Z"
  },
  {
    "id": "bac70001-0010-4000-8000-000000000010",
    "merchantId": "b1ead7a1-0007-4000-8000-000000000007",
    "merchantName": "The Coffee House - Thái Hà",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Tươi The Coffee House",
    "description": "Túi cứu trợ gồm 01 chai cà phê Cold Brew ủ lạnh hoặc trà đóng chai bảo quản mát (không kèm đá pha tại chỗ) kết hợp cùng bánh mì ngọt/pastry nướng tươi trong ngày từ The Coffee House.",
    "originalPrice": 95000,
    "discountPrice": 38000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:58.179Z"
  },
  {
    "id": "bac70001-0038-4000-8000-000000000038",
    "merchantId": "b1ead7a1-0038-4000-8000-000000000038",
    "merchantName": "The Hive Lounge - InterContinental Landmark72",
    "name": "Túi Cứu Trà Chiều Đóng Chai 5 Sao & Bánh Scone The Hive",
    "description": "Trải nghiệm tiệc trà trên mây từ tầng 62 InterContinental gồm bánh scone nướng bơ truyền thống kèm kem đông clotted cream và chai trà thảo mộc ủ lạnh thượng phẩm.",
    "originalPrice": 260000,
    "discountPrice": 95000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "09:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-27T13:08:32.475Z"
  },
  {
    "id": "bac70001-0030-4000-8000-000000000030",
    "merchantId": "b1ead7a1-0030-4000-8000-000000000030",
    "merchantName": "The Rustics Coffeeshop - Điện Biên Phủ",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng The Rustics",
    "description": "Túi giải cứu từ The Rustics gồm chai cà phê Cold Brew ủ lạnh thủ công thanh mát kèm bánh ngọt nướng trong ngày giữa không gian tổ chim phố cổ.",
    "originalPrice": 125000,
    "discountPrice": 46000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T13:08:30.907Z"
  },
  {
    "id": "82d37623-53ef-4e5e-bcb9-6793cb435aff",
    "merchantId": "fcc75682-534e-495c-91a7-982622d02cf7",
    "merchantName": "Tous Les Jours - Hoàng Quốc Việt",
    "name": "Túi Bất Ngờ Bánh Mì & Pastry Nướng Tươi Tous Les Jours",
    "description": "Mỗi ngày là một bất ngờ thú vị! Túi bao gồm ngẫu nhiên 3–4 món bánh tươi trong ngày từ Tous Les Jours (như bánh mì baguette, croissant bơ Pháp, pastry nướng hoặc bánh phô mai mềm tùy mẻ bánh trong ngày).",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-12T18:31:45.904Z"
  },
  {
    "id": "c67f81fa-4b47-4483-baef-142c7b4f8be1",
    "merchantId": "fcc75682-534e-495c-91a7-982622d02cf7",
    "merchantName": "Tous Les Jours - Hoàng Quốc Việt",
    "name": "Túi Bất Ngờ Bánh Ngọt & Croissant Thượng Hạng Tous Les Jours",
    "description": "Trải nghiệm bánh ngọt phong vị Pháp tinh tế! Túi ngẫu nhiên gồm các loại bánh kem su, pain au chocolat, croissant ngàn lớp hoặc bánh tart béo thơm nướng mới mỗi ngày.",
    "originalPrice": 150000,
    "discountPrice": 55000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 5,
    "createdAt": "2026-10-12T18:31:46.133Z"
  },
  {
    "id": "bac80001-0018-4000-8000-000000000018",
    "merchantId": "fcc75682-534e-495c-91a7-982622d02cf8",
    "merchantName": "Tous Les Jours - Keangnam Landmark 72",
    "name": "Túi Bất Ngờ Bánh Mì Bơ Tỏi & Su Kem Pháp Tous Les Jours",
    "description": "Túi giải cứu gồm ngẫu nhiên 3–4 món bánh nướng trong ngày: bánh mì bơ tỏi thơm lừng, bánh su kem phô mai béo ngậy hoặc pastry hoa quả.",
    "originalPrice": 135000,
    "discountPrice": 49000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-28T06:05:37.593Z"
  },
  {
    "id": "bac70001-0001-4000-8000-000000000001",
    "merchantId": "fcc75682-534e-495c-91a7-982622d02cf8",
    "merchantName": "Tous Les Jours - Keangnam Landmark 72",
    "name": "Túi Bất Ngờ Bánh Mì Dinh Dưỡng & Bánh Mềm Tous Les Jours",
    "description": "Túi bánh tươi dinh dưỡng bất ngờ từ Tous Les Jours (có thể gồm bánh mì gối sữa, bánh su kem, bánh mì xúc xích hoặc bánh nướng ngũ cốc trong ngày) chuẩn chất lượng Pháp - Hàn.",
    "originalPrice": 130000,
    "discountPrice": 48000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "06:00",
    "pickupEnd": "23:59",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T12:40:57.120Z"
  },
  {
    "id": "bac70001-0031-4000-8000-000000000031",
    "merchantId": "b1ead7a1-0031-4000-8000-000000000031",
    "merchantName": "Tous Les Jours - Vincom Metropolis Liễu Giai",
    "name": "Túi Bất Ngờ Bánh Danish & Bánh Mì Cao Cấp Tous Les Jours",
    "description": "Túi bánh bất ngờ gồm bánh danish nho khô ngàn lớp, bánh mì hoa cúc bơ sữa hoặc các dòng bánh nướng bơ tỏi thơm lừng nướng trong ngày từ Tous Les Jours.",
    "originalPrice": 140000,
    "discountPrice": 50000,
    "category": "bakery",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-004.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:45",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:30.994Z"
  },
  {
    "id": "bac80001-0015-4000-8000-000000000015",
    "merchantId": "2f207531-63ee-4650-b3ef-71282d3e91c3",
    "merchantName": "Trà Sữa TocoToco - Hồ Tùng Mậu",
    "name": "Túi Cứu Nước Ép Tươi & Trà Sữa Đóng Chai TocoToco",
    "description": "Combo giải khát gồm 2 chai trà sữa hoặc trà chanh leo đóng chai ủ lạnh trong ngày (được thanh trùng, không bỏ đá pha tại chỗ) uống mát thanh lành.",
    "originalPrice": 85000,
    "discountPrice": 32000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 7,
    "maxQuantity": 3,
    "pickupStart": "09:00",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.6,
    "createdAt": "2026-10-28T06:05:37.313Z"
  },
  {
    "id": "a51a723e-e333-4374-9245-d0b0dfc7d0eb",
    "merchantId": "2f207531-63ee-4650-b3ef-71282d3e91c3",
    "merchantName": "Trà Sữa TocoToco - Hồ Tùng Mậu",
    "name": "Túi Cứu Trà Trái Cây Đóng Chai & Thức Uống TocoToco",
    "description": "Túi giải khát cứu trợ gồm 2 chai trà trái cây tươi mát hoặc trà sữa đóng chai ủ lạnh trong ngày (bảo quản lạnh sẵn, không bỏ đá pha tại chỗ) giúp giải khát thanh lọc và không bị loãng vị.",
    "originalPrice": 80000,
    "discountPrice": 29000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-003.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.6,
    "createdAt": "2026-10-12T18:31:47.759Z"
  },
  {
    "id": "bac70001-0036-4000-8000-000000000036",
    "merchantId": "b1ead7a1-0036-4000-8000-000000000036",
    "merchantName": "Tranquil Books & Coffee - Nguyễn Quang Bích",
    "name": "Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng Tranquil",
    "description": "Túi cà phê yên bình từ Tranquil gồm chai Cold Brew ủ chậm thơm hương hoa quả kèm bánh nướng mộc mạc thưởng thức cùng trang sách.",
    "originalPrice": 110000,
    "discountPrice": 39000,
    "category": "beverage",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/cafe/cafe-001.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:30",
    "pickupEnd": "22:00",
    "isAvailable": true,
    "rating": 4.9,
    "createdAt": "2026-10-27T13:08:31.864Z"
  },
  {
    "id": "bac80001-0041-4000-8000-000000000041",
    "merchantId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "merchantName": "WinMart+ - Green Stars Phạm Văn Đồng",
    "name": "Túi Cứu Bắp Mỹ & Khoai Lang Hữu Cơ VietGAP WinMart+",
    "description": "Túi nông sản dinh dưỡng giải cứu gồm bắp ngọt Mỹ tươi non, khoai lang Nhật dẻo thơm và đậu bắp sạch giàu chất xơ cho bữa ăn nhẹ.",
    "originalPrice": 70000,
    "discountPrice": 26000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-006.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:39.989Z"
  },
  {
    "id": "9ff75bc9-8339-4cb6-9fe2-1907bc2bd4f3",
    "merchantId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "merchantName": "WinMart+ - Green Stars Phạm Văn Đồng",
    "name": "Túi Cứu Nhu Yếu Phẩm & Bách Hóa Tiện Lợi WinMart+",
    "description": "Túi bách hóa tiện lợi gồm ngẫu nhiên các thực phẩm thiết yếu, sữa tươi tiệt trùng, bánh ngọt hoặc đồ uống đóng chai bảo quản tốt trong ngày cho gia đình.",
    "originalPrice": 120000,
    "discountPrice": 45000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/mixed/mixed-006.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-27T10:46:06.297Z"
  },
  {
    "id": "bac80001-0035-4000-8000-000000000035",
    "merchantId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "merchantName": "WinMart+ - Green Stars Phạm Văn Đồng",
    "name": "Túi Cứu Nông Sản Rau Thủy Canh & Nấm Tươi VietGAP WinMart+",
    "description": "Túi giải cứu nông sản sạch gồm các loại rau xà lách thủy canh tươi xanh, nấm đùi gà và nấm kim châm đạt chứng nhận an toàn VietGAP trong ngày.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-007.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "07:30",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:39.456Z"
  },
  {
    "id": "15776100-8c1c-410a-8b6a-1b7602670f70",
    "merchantId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "merchantName": "WinMart+ - Green Stars Phạm Văn Đồng",
    "name": "Túi Cứu Nông Sản Sạch & Rau Củ VietGAP Trong Ngày WinMart+",
    "description": "Túi nông sản bất ngờ từ WinMart+ gồm ngẫu nhiên các loại rau xanh an toàn, nấm tươi và củ quả sạch đạt tiêu chuẩn VietGAP trong ngày cần giải cứu để tránh lãng phí.",
    "originalPrice": 100000,
    "discountPrice": 35000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-007.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-12T18:31:46.820Z"
  },
  {
    "id": "bac80001-0036-4000-8000-000000000036",
    "merchantId": "2257c133-3c76-4646-8ae9-13f9d34115a3",
    "merchantName": "WinMart+ - Green Stars Phạm Văn Đồng",
    "name": "Túi Cứu Trái Cây Miền Nhiệt Đới Tươi Ngon WinMart+",
    "description": "Túi trái cây tươi ngon bất ngờ gồm ngẫu nhiên dưa lưới, cam sành, ổi giòn ngọt hoặc chuối chín tự nhiên an toàn kiểm định trong ngày.",
    "originalPrice": 85000,
    "discountPrice": 32000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.7,
    "createdAt": "2026-10-28T06:05:39.540Z"
  },
  {
    "id": "bac80001-0037-4000-8000-000000000037",
    "merchantId": "b1ead7a1-0012-4000-8000-000000000012",
    "merchantName": "WinMart+ - Times City Minh Khai",
    "name": "Túi Cứu Củ Quả Hữu Cơ & Cà Chua Bi VietGAP WinMart+",
    "description": "Túi nông sản dinh dưỡng gồm cà rốt Đà Lạt, cà chua bi giòn ngọt, dưa chuột và khoai lang mật tươi sạch thu hoạch trong ngày.",
    "originalPrice": 80000,
    "discountPrice": 30000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-003.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:39.619Z"
  },
  {
    "id": "bac70001-0015-4000-8000-000000000015",
    "merchantId": "b1ead7a1-0012-4000-8000-000000000012",
    "merchantName": "WinMart+ - Times City Minh Khai",
    "name": "Túi Cứu Rau Củ Tươi & Trái Cây VietGAP Trong Ngày WinMart+",
    "description": "Túi thực phẩm xanh bảo vệ sức khỏe từ WinMart+ gồm rau hữu cơ tươi non và trái cây theo mùa an toàn đạt chuẩn kiểm định an toàn vệ sinh.",
    "originalPrice": 110000,
    "discountPrice": 39000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-002.webp",
    "quantity": 5,
    "maxQuantity": 3,
    "pickupStart": "07:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-27T12:40:59.026Z"
  },
  {
    "id": "bac80001-0038-4000-8000-000000000038",
    "merchantId": "b1ead7a1-0012-4000-8000-000000000012",
    "merchantName": "WinMart+ - Times City Minh Khai",
    "name": "Túi Cứu Rau Gia Vị & Nấm Sạch Nấu Canh WinMart+",
    "description": "Túi rau củ tươi xanh gồm mồng tơi, rau dền, hành lá, ngò gai và nấm bào ngư sạch giúp chuẩn bị bữa canh ấm nóng gia đình tiện lợi.",
    "originalPrice": 65000,
    "discountPrice": 25000,
    "category": "raw_food",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/grocery/grocery-007.webp",
    "quantity": 7,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:39.705Z"
  },
  {
    "id": "bac80001-0050-4000-8000-000000000050",
    "merchantId": "b1ead7a1-0012-4000-8000-000000000012",
    "merchantName": "WinMart+ - Times City Minh Khai",
    "name": "Túi Cứu Sữa Tiệt Trùng & Bánh Ngọt Tiện Dụng WinMart+",
    "description": "Túi bất ngờ nhu yếu phẩm gia đình gồm 1 lốc sữa tươi tiệt trùng, bánh bông lan kem mềm và đồ ăn nhẹ đóng gói bảo quản tốt trong ngày.",
    "originalPrice": 75000,
    "discountPrice": 28000,
    "category": "other",
    "imageUrl": "https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/product-images/bakery/bakery-010.webp",
    "quantity": 6,
    "maxQuantity": 3,
    "pickupStart": "08:00",
    "pickupEnd": "21:30",
    "isAvailable": true,
    "rating": 4.8,
    "createdAt": "2026-10-28T06:05:40.751Z"
  }
];

function mapCustomerOrderRow(o: any): Order {
  const rev = Array.isArray(o.reviews) ? o.reviews[0] : o.reviews;
  const isOverdue =
    o.status === 'pending_payment' &&
    o.payment_expires_at &&
    new Date(o.payment_expires_at).getTime() <= Date.now();

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
}

const CUSTOMER_ORDER_SELECT = `
  *,
  stores (name, address, phone, logo_url),
  order_items (*, surprise_bags (image_url)),
  reviews (*)
`;

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
                .limit(300);
              if (!storesErr && Array.isArray(directStores)) return directStores;

              const { data: storesData } = await supabase.rpc('list_stores_nearby', {
                p_lat: lat,
                p_lng: lng,
                p_radius: 500000,
                p_category: null,
                p_page: 1,
                p_limit: 300,
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
                .limit(300);
              if (!bagsErr && Array.isArray(directBags)) return directBags;

              const { data: nearbyBags } = await supabase.rpc('list_bags_nearby', {
                p_lat: lat,
                p_lng: lng,
                p_radius: 500000,
                p_category: null,
                p_page: 1,
                p_limit: 300,
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
            quantity: b.quantity != null ? Number(b.quantity) : 0,
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
          quantity: data.quantity != null ? Number(data.quantity) : 0,
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
        .select(CUSTOMER_ORDER_SELECT)
        .eq('customer_id', currentUserId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        const hasOverdueOrders = data.some(
          (o: any) =>
            o.status === 'pending_payment' &&
            o.payment_expires_at &&
            new Date(o.payment_expires_at).getTime() <= Date.now()
        );
        const remoteOrders = data.map(mapCustomerOrderRow);

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

  async getOrder(orderId: string): Promise<Order | null> {
    if (!orderId) return null;
    const cleanId = orderId.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanId);

    try {
      let query = supabase
        .from('orders')
        .select(CUSTOMER_ORDER_SELECT);

      if (isUuid) {
        query = query.eq('id', cleanId);
      } else {
        const token = cleanId.replace(/^#+/, '').replace(/^gsf-(?:order-|qr-)?/i, '').trim();
        query = query.ilike('qr_code', `%${token}%`);
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (!error && data) {
        return mapCustomerOrderRow(data);
      }

      // Fallback: match by payment_order_code if numeric
      const numericCode = Number(cleanId.replace(/\D/g, ''));
      if (Number.isInteger(numericCode) && numericCode > 1000) {
        const { data: numOrder } = await supabase
          .from('orders')
          .select(CUSTOMER_ORDER_SELECT)
          .eq('payment_order_code', numericCode)
          .limit(1)
          .maybeSingle();
        if (numOrder) return mapCustomerOrderRow(numOrder);
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const key = `gsf_local_orders_${user.id}`;
          const localOrders: Order[] = JSON.parse(localStorage.getItem(key) || '[]');
          const target = localOrders.find(
            (o) =>
              o.id.toLowerCase() === cleanId.toLowerCase() ||
              o.orderCode.toLowerCase() === cleanId.toLowerCase() ||
              cleanId.toLowerCase().includes(o.orderCode.toLowerCase())
          );
          if (target) return target;
        }
      } catch {}
    } catch (err) {
      console.warn('Lấy chi tiết đơn hàng lỗi:', err);
    }
    return null;
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
          imageUrl: n.image_url || n.data?.imageUrl || n.data?.image_url || null,
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
      if (updates.avatar !== undefined && !updates.avatar.startsWith('data:')) {
        dbPayload.avatar_url = updates.avatar;
      }

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
      if (updates.avatar && !updates.avatar.startsWith('data:')) {
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

