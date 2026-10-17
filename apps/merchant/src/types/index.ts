export type AppRoute = 'login' | 'setup' | 'bags' | 'orders' | 'inventory' | 'analytics' | 'settings';
export type TabRoute = Exclude<AppRoute, 'login' | 'setup'>;

export interface AuthUser {
  id: string;
  storeId: string;
  displayName: string;
  isFirstLogin: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface MerchantRegisterInput {
  name: string;
  storeName: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  category?: string;
}

export type BagStatus = 'active' | 'sold_out' | 'hidden';

export interface BagItem {
  id: string;
  storeId: string;
  name: string;
  description: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  quantity: number;
  availableQuantity: number;
  imageUrl: string;
  imageUrls: string[];
  pickupTimeStart: string;
  pickupTimeEnd: string;
  status: BagStatus;
  createdAt: string;
}

export type BagInput = Omit<BagItem, 'id' | 'storeId' | 'availableQuantity' | 'status' | 'createdAt'>;

export type OrderStatus = 'pending' | 'processing' | 'confirmed' | 'completed' | 'cancelled';
export type OrderStatusFilter = OrderStatus | 'all';

export interface OrderItemDetail {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface MerchantOrder {
  id: string;
  storeId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string;
  storeName: string;
  bagName: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  status: OrderStatus;
  createdAt: string;
  placedAt: string;
  paidAt?: string;
  pickupTime: string;
  qrCode: string;
  pickupToken?: string;
  note?: string;
  items?: OrderItemDetail[];
}

export interface OrderSummaryMetrics {
  pending: number;
  processing: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export type InventorySchedule = 'today' | 'tomorrow';
export type InventoryScheduleFilter = InventorySchedule;

export interface InventoryItem {
  id: string;
  bagId?: string;
  storeId: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  minQuantity: number;
  unit: string;
  schedule: InventorySchedule;
  appliesTomorrow: boolean;
  lastUpdated: string;
}

export type InventoryInput = Omit<InventoryItem, 'id' | 'storeId' | 'lastUpdated'>;

export interface StoreProfile {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverImage: string;
  logoUrl: string;
  avatar: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  category: string;
  openingHours: string;
  closingHours: string;
  pickupHours: string;
  isOpen: boolean;
  rating: number;
  totalRescuedBags: number;
  totalCo2SavedKg: number;
  createdAt: string;
  updatedAt: string;
}

export type StoreUpdateInput = Partial<Pick<StoreProfile, 'name' | 'description' | 'phone' | 'address' | 'latitude' | 'longitude' | 'openingHours' | 'closingHours' | 'category'>>;
export type StoreImageUpdate = Partial<Pick<StoreProfile, 'coverImage' | 'avatar'>>;

export interface AnalyticsMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyGrowthPercent: number;
  previousMonthRevenue: number;
  totalOrders: number;
  totalSoldBags: number;
  bagsOnShelf: number;
  averageRating: number;
  totalReviewsCount: number;
}

export interface RevenueChartPoint {
  label: string;
  value: number;
}

export interface ReviewItem {
  id: string;
  customerName: string;
  avatar: string;
  rating: number;
  comment: string;
  timeAgo: string;
}

export interface NotificationItem {
  id: string;
  orderId?: string;
  orderCode?: string;
  title: string;
  message: string;
  type: 'new_order' | 'pickup_reminder' | 'completed_order' | 'cancelled_order' | 'review_alert';
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
  avatarUrl?: string;
}
