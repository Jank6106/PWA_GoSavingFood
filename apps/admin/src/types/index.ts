export type DataSourceMode = 'PRODUCTION' | 'DEMO';

export interface BackendErrorState {
  table: string;
  message: string;
  code?: string;
}

export interface DashboardStats {
  total_users: number;
  total_stores: number;
  pending_stores: number;
  total_orders: number;
  completed_orders: number;
  total_gmv: number;
  total_food_saved_kg: number;
  total_co2_prevented_kg: number;
  open_issues: number;
}

export type StoreStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AdminStore {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  category?: string;
  status: StoreStatus;
  commission_rate: number;
  pickup_hours?: string;
  created_at: string;
  merchant_id: string;
  avatar?: string;
  rating?: number;
}

export type BagStatus = 'active' | 'sold_out' | 'hidden';

export interface AdminBag {
  id: string;
  store_id: string;
  store_name?: string;
  name: string;
  description: string;
  category: string;
  original_price: number;
  sale_price: number;
  quantity: number;
  available_quantity: number;
  image_url: string;
  pickup_time_start: string;
  pickup_time_end: string;
  status: BagStatus;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  image_url: string;
  target_type: 'STORE' | 'BAG' | 'CATEGORY' | 'EXTERNAL_URL';
  target_id?: string;
  display_order: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface AdminOrder {
  id: string;
  order_number: string;
  final_amount: number;
  original_amount?: number;
  status: 'PENDING' | 'CONFIRMED' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  pickup_code?: string;
  pickup_time?: string;
  customer?: { full_name: string; email: string; phone?: string };
  store?: { name: string; phone?: string; address?: string };
  bag_name?: string;
  quantity?: number;
}

export type IssueStatus = 'pending' | 'resolved' | 'rejected' | 'OPEN';
export type ReporterRole = 'customer' | 'merchant';

export interface AdminIssue {
  id: string;
  order_id: string;
  reporter_id: string;
  reporter_role: ReporterRole;
  title: string;
  description: string;
  images: string[] | null;
  status: IssueStatus;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter?: { full_name?: string; email?: string };
}

export interface Settlement {
  id: string;
  store_id: string;
  store_name: string;
  period_start: string;
  period_end: string;
  total_orders: number;
  gross_sales: number;
  commission_rate: number;
  commission_amount: number;
  payment_fee: number;
  net_payout: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  paid_at?: string;
  bank_name?: string;
  bank_account?: string;
}

export interface AdminAuditLog {
  id: string;
  admin_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  created_at: string;
}
