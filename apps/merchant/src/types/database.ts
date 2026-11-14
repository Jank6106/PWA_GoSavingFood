import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { BagType, RepeatMode } from './index';

export interface BagRow {
  id: string; store_id: string; name: string; description?: string | null;
  category: string; original_price: number; discount_price: number; quantity: number;
  image_url?: string | null; pickup_start?: string | null; pickup_end?: string | null;
  bag_type?: BagType; repeat_mode?: RepeatMode; daily_quota?: number | null;
  expiry_date?: string | null; status?: string; is_available: boolean; created_at?: string;
}
export interface StoreRow {
  id: string; name: string; owner_user_id?: string | null; description?: string | null;
  banner_url?: string | null; logo_url?: string | null; address?: string | null;
  latitude?: number | null; longitude?: number | null; phone?: string | null;
  food_categories?: string[] | null; open_time?: string | null; close_time?: string | null;
  is_open?: boolean; is_first_login?: boolean; rating?: number; created_at?: string; updated_at?: string;
}
interface OrderCustomer { name?: string; phone?: string; avatar_url?: string }
export interface OrderItemRow {
  id: string; bag_name?: string; quantity: number; unit_price: number; total_price?: number;
  surprise_bags?: { image_url?: string } | null;
  orders?: { status: string } | { status: string }[] | null;
}
export interface OrderRow {
  id: string; store_id: string; status: string; payment_status?: string;
  final_amount: number; total_original_price?: number; created_at: string; updated_at?: string;
  paid_at?: string; pickup_time?: string; qr_code?: string; pickup_token?: string; note?: string;
  recipient_name?: string; recipient_phone?: string;
  users?: OrderCustomer | OrderCustomer[] | null; order_items?: OrderItemRow[];
}
export interface NotificationRow {
  id: string; title?: string; body?: string; is_read?: boolean; created_at?: string;
  data?: Record<string, string | undefined> | null;
}
export type OrderChange = RealtimePostgresChangesPayload<Record<string, unknown>>;
