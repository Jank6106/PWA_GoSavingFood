import type { BagType, RepeatMode, Order, Banner, Brand, Category, Merchant, SurpriseBag } from './customer.types';
export interface CatalogSnapshot { banners: Banner[]; brands: Brand[]; categories: Category[]; merchants: Merchant[]; bags: SurpriseBag[] }
export interface StoreRow {
  id: string; name: string; description?: string; phone?: string; address?: string;
  logo_url?: string; banner_url?: string; rating?: number; total_ratings?: number;
  is_open?: boolean; open_time?: string; close_time?: string; latitude?: number; longitude?: number;
}
export interface BagRow {
  id: string; store_id: string; name: string; description?: string; original_price: number;
  discount_price: number; category: string; image_url?: string; quantity: number;
  max_quantity?: number; pickup_start?: string; pickup_end?: string; is_available?: boolean;
  expires_at?: string; created_at?: string; bag_type?: BagType; repeat_mode?: RepeatMode;
  daily_quota?: number; expiry_date?: string; status?: string; store_name?: string;
  stores?: StoreRow; rating?: number;
}
export interface OrderItemRow {
  bag_id: string; bag_name?: string; image_url?: string; quantity: number;
  unit_price: number; total_price?: number; surprise_bags?: { image_url?: string };
}
export interface ReviewRow { id: string; customer_id?: string; rating: number; comment?: string; tags?: string[]; created_at?: string; order_id?: string; store_id?: string }
export interface OrderRow {
  id: string; order_code?: string; store_id: string; stores?: {name?: string; address?: string};
  reviews?: ReviewRow | ReviewRow[]; order_items?: OrderItemRow[];
  status: Order['status']; payment_expires_at?: string; total_original_price: number;
  total_discount_price: number; discount_amount: number; final_amount: number;
  payment_method?: Order['paymentMethod'] | 'cash'; payment_status?: Order['paymentStatus'];
  pickup_time?: string; created_at: string; updated_at?: string; paid_at?: string; completed_at?: string;
  cancelled_at?: string; cancel_reason?: string; note?: string; qr_code?: string;
  pickup_token?: string; recipient_name?: string; recipient_phone?: string;
}
export interface RealtimeRow extends Partial<Omit<OrderRow, 'stores' | 'reviews' | 'order_items'>> {
  title?: string; body?: string; data?: import('./customer.types').NotificationItem['data'];
}
export interface RowChange { eventType: string; new: RealtimeRow; old: RealtimeRow }
