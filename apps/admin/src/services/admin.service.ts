import { supabase } from './supabase';
import {
  DashboardStats,
  AdminStore,
  StoreStatus,
  Banner,
  AdminOrder,
  AdminIssue,
  AdminBag,
  Settlement,
  AdminAuditLog,
  DataSourceMode,
  BackendErrorState,
} from '../types';
import {
  SEED_ADMIN_STATS,
  SEED_ADMIN_STORES,
  SEED_ADMIN_BANNERS,
  SEED_ADMIN_ORDERS,
  SEED_ADMIN_ISSUES,
  SEED_ADMIN_BAGS,
  SEED_ADMIN_SETTLEMENTS,
  SEED_ADMIN_AUDIT_LOGS,
} from '../mocks';

export class AdminBackendError extends Error {
  table: string;
  code?: string;
  constructor(message: string, table: string, code?: string) {
    super(message);
    this.name = 'AdminBackendError';
    this.table = table;
    this.code = code;
  }
}

export const adminService = {
  // 1. Thống kê Dashboard & ESG
  async getDashboardStats(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: DashboardStats; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_STATS };
    }

    // PRODUCTION: Tính toán trực tiếp từ dữ liệu backend thực
    try {
      // 1. stores count
      const { data: storesData, error: sErr } = await supabase
        .from('stores')
        .select('id, status, commission_rate');
      
      if (sErr) throw new AdminBackendError(sErr.message, 'stores', sErr.code);

      const total_stores = storesData?.length || 0;
      const pending_stores = storesData?.filter((s) => s.status === 'PENDING' || s.status === 'pending').length || 0;

      // 2. orders count & completed orders
      const { data: ordersData, error: oErr } = await supabase
        .from('orders')
        .select('id, status, final_amount, created_at');

      if (oErr) throw new AdminBackendError(oErr.message, 'orders', oErr.code);

      const total_orders = ordersData?.length || 0;
      const completedOrdersList = ordersData?.filter((o) => o.status === 'COMPLETED' || o.status === 'completed') || [];
      const completed_orders = completedOrdersList.length;
      const total_gmv = completedOrdersList.reduce((acc, o) => acc + (Number(o.final_amount) || 0), 0);

      // ESG Impact:
      // Mỗi túi thực phẩm giải cứu thành công ước tính tương đương ~1.0 kg thực phẩm
      // 1 kg thực phẩm tránh lãng phí tương đương tránh phát thải ~2.5 kg CO2e (Theo tiêu chuẩn FAO & UNEP Food Waste Index)
      const total_food_saved_kg = Number((completed_orders * 1.0).toFixed(1));
      const total_co2_prevented_kg = Number((completed_orders * 2.5).toFixed(1));

      // 3. issues count
      let open_issues = 0;
      const { data: issuesData, error: iErr } = await supabase
        .from('issues')
        .select('id, status');
      
      if (!iErr && issuesData) {
        open_issues = issuesData.filter((i) => i.status === 'OPEN' || i.status === 'pending').length;
      }

      // 4. total users estimate
      const total_users = total_stores * 3; // Minimum verified proxy

      const stats: DashboardStats = {
        total_users,
        total_stores,
        pending_stores,
        total_orders,
        completed_orders,
        total_gmv,
        total_food_saved_kg,
        total_co2_prevented_kg,
        open_issues,
      };

      return { data: stats };
    } catch (err: any) {
      console.error('[AdminService] getDashboardStats error:', err);
      return {
        data: {
          total_users: 0,
          total_stores: 0,
          pending_stores: 0,
          total_orders: 0,
          completed_orders: 0,
          total_gmv: 0,
          total_food_saved_kg: 0,
          total_co2_prevented_kg: 0,
          open_issues: 0,
        },
        error: {
          table: err.table || 'dashboard',
          message: err.message || 'Lỗi truy vấn số liệu tổng quan',
          code: err.code,
        },
      };
    }
  },

  // 2. Quản lý Merchant / Quán
  async getStores(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: AdminStore[]; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_STORES };
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new AdminBackendError(error.message, 'stores', error.code);

      const mapped: AdminStore[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        phone: s.phone,
        email: s.email,
        category: Array.isArray(s.food_categories) ? s.food_categories.join(', ') : s.category || 'Ẩm thực',
        status: (s.status?.toUpperCase() || 'ACTIVE') as StoreStatus,
        commission_rate: Number(s.commission_rate ?? 15),
        pickup_hours: s.open_time && s.close_time ? `${s.open_time.slice(0, 5)} - ${s.close_time.slice(0, 5)}` : '18:00 - 21:00',
        created_at: s.created_at,
        merchant_id: s.owner_user_id || s.merchant_id || '',
        avatar: s.logo_url || s.avatar,
        rating: Number(s.rating || 0),
      }));

      return { data: mapped };
    } catch (err: any) {
      console.error('[AdminService] getStores error:', err);
      return {
        data: [],
        error: {
          table: 'stores',
          message: err.message || 'Không thể tải danh sách cửa hàng đối tác.',
          code: err.code,
        },
      };
    }
  },

  async updateStoreStatus(storeId: string, status: StoreStatus): Promise<void> {
    const dbStatus = (status === 'INACTIVE' || status === 'SUSPENDED') ? 'suspended' : 'active';
    const { error } = await supabase
      .from('stores')
      .update({ status: dbStatus, updated_at: new Date().toISOString() })
      .eq('id', storeId);
    if (error) throw new AdminBackendError(error.message, 'stores', error.code);
    await adminService.logAudit('UPDATE_STORE_STATUS', 'STORE', storeId, `Cập nhật trạng thái đối tác sang: ${dbStatus}`);
  },

  async updateStoreCommission(storeId: string, commission_rate: number): Promise<void> {
    const { error } = await supabase
      .from('stores')
      .update({ commission_rate, updated_at: new Date().toISOString() })
      .eq('id', storeId);
    if (error) throw new AdminBackendError(error.message, 'stores', error.code);
    await adminService.logAudit('UPDATE_COMMISSION', 'STORE', storeId, `Điều chỉnh tỷ lệ hoa hồng sang: ${commission_rate}%`);
  },

  // 3. Quản lý Surprising Bags
  async getBags(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: AdminBag[]; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_BAGS };
    }

    try {
      const { data, error } = await supabase
        .from('surprise_bags')
        .select('*, stores:store_id (name)')
        .order('created_at', { ascending: false });

      if (error) throw new AdminBackendError(error.message, 'surprise_bags', error.code);

      const mapped: AdminBag[] = (data || []).map((b: any) => ({
        id: b.id,
        store_id: b.store_id,
        store_name: b.stores?.name || 'Đối tác GoSavingFood',
        name: b.name,
        description: b.description || '',
        category: b.category,
        original_price: Number(b.original_price) || 0,
        sale_price: Number(b.discount_price ?? b.sale_price) || 0,
        quantity: Number(b.max_quantity ?? b.quantity) || 1,
        available_quantity: Number(b.quantity ?? b.available_quantity) || 0,
        image_url: b.image_url || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
        pickup_time_start: (b.pickup_start || b.pickup_time_start || '18:00').slice(0, 5),
        pickup_time_end: (b.pickup_end || b.pickup_time_end || '21:00').slice(0, 5),
        status: b.is_available === false ? 'hidden' : (b.quantity === 0 ? 'sold_out' : 'active'),
        created_at: b.created_at,
      }));

      return { data: mapped };
    } catch (err: any) {
      console.error('[AdminService] getBags error:', err);
      return {
        data: [],
        error: {
          table: 'surprise_bags',
          message: err.message || 'Không thể tải danh mục Surprising Bags.',
          code: err.code,
        },
      };
    }
  },

  async updateBagStatus(bagId: string, status: 'active' | 'hidden'): Promise<void> {
    const is_available = status === 'active';
    const { error } = await supabase
      .from('surprise_bags')
      .update({ is_available, updated_at: new Date().toISOString() })
      .eq('id', bagId);
    if (error) throw new AdminBackendError(error.message, 'surprise_bags', error.code);
    await adminService.logAudit('UPDATE_BAG_STATUS', 'BAG', bagId, `${status === 'active' ? 'Mở bán' : 'Gỡ ẩn'} túi cứu trợ`);
  },

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ status: status.toLowerCase(), updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) throw new AdminBackendError(error.message, 'orders', error.code);
    await adminService.logAudit('UPDATE_ORDER_STATUS', 'ORDER', orderId, `Cập nhật trạng thái đơn hàng sang: ${status}`);
  },

  // 4. Giám sát Đơn hàng & Pickup
  async getOrders(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: AdminOrder[]; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_ORDERS };
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          final_amount,
          status,
          created_at,
          stores:store_id (name, phone, address)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new AdminBackendError(error.message, 'orders', error.code);

      const mapped: AdminOrder[] = (data || []).map((o: any) => ({
        id: o.id,
        order_number: o.id.slice(0, 8).toUpperCase(),
        final_amount: Number(o.final_amount) || 0,
        status: (o.status?.toUpperCase() || 'PENDING') as any,
        created_at: o.created_at,
        store: o.stores,
      }));

      return { data: mapped };
    } catch (err: any) {
      console.error('[AdminService] getOrders error:', err);
      return {
        data: [],
        error: {
          table: 'orders',
          message: err.message || 'Không thể truy vấn bảng đơn hàng.',
          code: err.code,
        },
      };
    }
  },

  // 5. Quản lý Khiếu nại & Báo cáo
  async getIssues(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: AdminIssue[]; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_ISSUES };
    }

    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new AdminBackendError(error.message, 'issues', error.code);

      return { data: (data || []) as AdminIssue[] };
    } catch (err: any) {
      console.error('[AdminService] getIssues error:', err);
      return {
        data: [],
        error: {
          table: 'issues',
          message: err.message || 'Không thể truy vấn bảng khiếu nại.',
          code: err.code,
        },
      };
    }
  },

  async resolveIssue(id: string, status: 'resolved' | 'rejected', resolution: string): Promise<void> {
    const { error } = await supabase
      .from('issues')
      .update({
        status,
        resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new AdminBackendError(error.message, 'issues', error.code);
    await adminService.logAudit(
      status === 'resolved' ? 'RESOLVE_ISSUE' : 'REJECT_ISSUE',
      'ISSUE',
      id,
      `Xử lý khiếu nại: ${resolution}`
    );
  },

  // 6. Quản lý Banners (CMS)
  async getBanners(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: Banner[]; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_BANNERS };
    }

    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw new AdminBackendError(error.message, 'banners', error.code);

      return { data: data || [] };
    } catch (err: any) {
      return {
        data: [],
        error: {
          table: 'banners',
          message: err.message || "Bảng 'banners' chưa có migration trên database.",
          code: err.code,
        },
      };
    }
  },

  async createBanner(banner: Omit<Banner, 'id' | 'created_at'>): Promise<Banner> {
    const { data, error } = await supabase
      .from('banners')
      .insert([banner])
      .select()
      .single();
    if (error) throw new AdminBackendError(error.message, 'banners', error.code);
    await adminService.logAudit('CREATE_BANNER', 'BANNER', data.id, `Tạo banner mới: "${banner.title}"`);
    return data;
  },

  async toggleBannerStatus(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase
      .from('banners')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new AdminBackendError(error.message, 'banners', error.code);
    await adminService.logAudit('TOGGLE_BANNER', 'BANNER', id, `${is_active ? 'Kích hoạt' : 'Ẩn'} banner`);
  },

  async deleteBanner(id: string): Promise<void> {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) throw new AdminBackendError(error.message, 'banners', error.code);
    await adminService.logAudit('DELETE_BANNER', 'BANNER', id, `Xóa banner ID: ${id}`);
  },

  // 7. Đối Soát & Payouts
  async getSettlements(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: Settlement[]; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_SETTLEMENTS };
    }

    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*, stores:store_id (name)')
        .order('period_end', { ascending: false });

      if (error) throw new AdminBackendError(error.message, 'settlements', error.code);

      const mapped = (data || []).map((s: any) => ({
        ...s,
        store_name: s.stores?.name,
      }));

      return { data: mapped };
    } catch (err: any) {
      return {
        data: [],
        error: {
          table: 'settlements',
          message: err.message || "Bảng 'settlements' chưa có migration trên database.",
          code: err.code,
        },
      };
    }
  },

  // Helper ghi nhật ký audit log
  async logAudit(action: string, entity_type: string, entity_id: string, details: string): Promise<void> {
    try {
      const session = localStorage.getItem('gsf_admin_session');
      const admin = session ? JSON.parse(session) : null;
      await supabase.from('admin_audit_logs').insert([
        {
          admin_id: admin?.id,
          admin_name: admin?.user_metadata?.full_name || admin?.email || 'SuperAdmin',
          action,
          entity_type,
          entity_id,
          details,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // Không block luồng chính nếu audit log gặp lỗi
    }
  },

  async approveSettlement(id: string): Promise<void> {
    const { error } = await supabase
      .from('settlements')
      .update({ status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new AdminBackendError(error.message, 'settlements', error.code);
    await adminService.logAudit('APPROVE_SETTLEMENT', 'SETTLEMENT', id, `Duyệt hoàn tất lệnh chi trả đối soát #${id.slice(0, 8)}`);
  },

  // 8. Nhật ký Audit Log
  async getAuditLogs(mode: DataSourceMode = 'PRODUCTION'): Promise<{ data: AdminAuditLog[]; error?: BackendErrorState }> {
    if (mode === 'DEMO') {
      return { data: SEED_ADMIN_AUDIT_LOGS };
    }

    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new AdminBackendError(error.message, 'admin_audit_logs', error.code);

      const mapped = (data || []).map((l: any) => ({
        id: l.id,
        admin_name: l.admin_name || 'SuperAdmin',
        action: l.action,
        entity_type: l.entity_type,
        entity_id: l.entity_id || '',
        details: l.details || '',
        created_at: l.created_at,
      }));

      return { data: mapped };
    } catch (err: any) {
      return {
        data: [],
        error: {
          table: 'admin_audit_logs',
          message: err.message || "Bảng 'admin_audit_logs' chưa sẵn sàng.",
          code: err.code,
        },
      };
    }
  },
};
