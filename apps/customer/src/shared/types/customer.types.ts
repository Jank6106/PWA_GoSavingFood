export type FoodCategory =
  | 'all'
  | 'vegetarian'
  | 'meat'
  | 'bakery'
  | 'seafood'
  | 'beverage'
  | 'other';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'pending'
  | 'confirmed'
  | 'picked_up';

export type PaymentMethod = 'payos_vietqr' | 'banking';
export type PaymentStatus = 'pending' | 'success' | 'refund_pending' | 'refunded' | 'failed';
export type CustomerTab = 'home' | 'cart' | 'orders' | 'profile';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  coverImage?: string;
}

export interface Banner {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  accent: 'green' | 'yellow' | 'mint';
  icon: string;
  imageUrl?: string;
}

export interface Category {
  id: FoodCategory;
  label: string;
  icon: string;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  rating: number;
  totalRatings?: number;
  totalStores: number;
  categories: string[];
  sustainabilityMessage: string;
}

export interface Merchant {
  id: string;
  brandId?: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  logo: string;
  banner: string;
  rating: number;
  totalRatings: number;
  distance: number;
  status: 'active' | 'inactive';
  isOpen: boolean;
  openingHours: string;
  latitude?: number;
  longitude?: number;
}


export type BagType = 'daily' | 'shelf_life';
export type RepeatMode = 'today_only' | 'recurring';

export interface SurpriseBag {
  id: string;
  merchantId: string;
  merchantName: string;
  name: string;
  description: string;
  originalPrice: number;
  discountPrice: number;
  category: Exclude<FoodCategory, 'all'>;
  imageUrl: string;
  quantity: number;
  maxQuantity: number;
  pickupStart: string;
  pickupEnd: string;
  bagType?: BagType;
  repeatMode?: RepeatMode;
  dailyQuota?: number;
  expiryDate?: string;
  status?: string;
  isAvailable: boolean;
  expiresAt?: string;
  rating: number;
  createdAt?: string;
}

export interface CartItem {
  bag: SurpriseBag;
  quantity: number;
  merchantId: string;
}

export interface OrderItem {
  bagId: string;
  bagName: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderCode: string;
  merchantId: string;
  merchantName: string;
  items: OrderItem[];
  totalOriginalPrice: number;
  totalDiscountPrice: number;
  discountAmount: number;
  finalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  pickupTime: string;
  pickupAddress: string;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  note?: string;
  review?: {
    rating: number;
    tags?: string[];
    comment: string;
    createdAt: string;
  };
  qrCode?: string;
  pickupToken?: string;
  recipientName?: string;
  recipientPhone?: string;
  paymentExpiresAt?: string;
  paymentOrderCode?: number;
  paymentLinkId?: string;
  checkoutUrl?: string;
}

export interface NotificationItem {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  imageUrl?: string | null;
  data?: {
    orderId?: string;
    status?: string;
    [key: string]: any;
  } | null;
}

export interface CustomerReview {
  id: string;
  orderId?: string;
  storeId?: string;
  customerName: string;
  avatar?: string;
  rating: number;
  comment: string;
  tags?: string[];
  createdAt: string;
  timeAgo?: string;
}

export interface Voucher {
  id: string;
  code: string;
  description: string;
  discountValue: number;
  minOrderValue: number;
  isActive: boolean;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  distance: string;
  coordinates?: [number, number];
}

export interface CheckoutDraft {
  customerName: string;
  phone: string;
  pickupTime: string;
  voucherCode?: string;
  discountAmount: number;
  note: string;
  paymentMethod: PaymentMethod;
}

export type AppRoute =
  | { name: 'tabs'; tab: CustomerTab }
  | { name: 'search' }
  | { name: 'bags' }
  | { name: 'bag'; id: string }
  | { name: 'merchant'; id: string }
  | { name: 'merchant_reviews'; id: string }
  | { name: 'brand'; id: string }
  | { name: 'checkout'; buyNowItem?: CartItem }
  | { name: 'payment'; draft?: CheckoutDraft; order?: Order; orderId?: string; orderCode?: string; buyNowItem?: CartItem }
  | { name: 'success'; orderId: string }
  | { name: 'order'; id: string }
  | { name: 'review'; id: string }
  | { name: 'report'; id: string }
  | { name: 'notifications' }
  | { name: 'location' };
