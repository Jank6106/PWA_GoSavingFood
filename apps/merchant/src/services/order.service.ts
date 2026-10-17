import type { MerchantOrder, OrderStatus } from '../types';
import { supabase } from './supabase';

const ordersInFlight = new Map<string, Promise<MerchantOrder[]>>();

const UI_TO_DB_TARGET: Record<Exclude<OrderStatus, 'pending'>, string> = {
  processing: 'preparing',
  confirmed: 'ready_for_pickup',
  completed: 'completed',
  cancelled: 'cancelled',
};

const mapDbStatusToUi = (status: string): OrderStatus => {
  if (status === 'paid' || status === 'pending') return 'pending';
  if (status === 'preparing' || status === 'confirmed') return 'processing';
  if (status === 'ready_for_pickup') return 'confirmed';
  if (status === 'completed' || status === 'picked_up') return 'completed';
  if (status === 'cancelled' || status === 'expired') return 'cancelled';
  return 'pending';
};

const mapDbOrder = (o: any): MerchantOrder => {
  const firstItem = o.order_items?.[0];
  const customer = Array.isArray(o.users) ? o.users[0] : o.users;
  return {
    id: o.id,
    storeId: o.store_id,
    orderCode: `GSF-${String(o.id).slice(0, 6).toUpperCase()}`,
    customerName: customer?.name || 'Khách hàng',
    customerPhone: customer?.phone || '',
    customerAvatar: customer?.avatar_url || undefined,
    storeName: 'Cửa hàng của tôi',
    bagName: firstItem?.bag_name || 'Túi cứu trợ thực phẩm',
    quantity: firstItem?.quantity || 1,
    price: Number(o.final_amount) || Number(firstItem?.unit_price) || 0,
    originalPrice: Number(o.total_original_price) || undefined,
    imageUrl:
      firstItem?.surprise_bags?.image_url ||
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    status: mapDbStatusToUi(String(o.status)),
    createdAt: o.created_at || new Date().toISOString(),
    placedAt: o.created_at || new Date().toISOString(),
    pickupTime: o.pickup_time
      ? new Date(o.pickup_time).toLocaleString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
        })
      : 'Chưa cập nhật',
    qrCode: o.qr_code || `GSF-ORDER-${o.id}`,
    pickupToken: o.pickup_token || undefined,
    note: o.note || undefined,
    items: (o.order_items || []).map((it: any) => ({
      id: it.id,
      name: it.bag_name || 'Túi thực phẩm',
      quantity: it.quantity,
      price: it.unit_price,
    })),
  };
};

const ORDERS_CACHE_PREFIX = 'gsf_merchant_orders:';

export function getCachedMerchantOrders(storeId: string): MerchantOrder[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${ORDERS_CACHE_PREFIX}${storeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore parse error
    }
  }
  return [];
}

export function setCachedMerchantOrders(storeId: string, orders: MerchantOrder[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${ORDERS_CACHE_PREFIX}${storeId}`, JSON.stringify(orders));
  } catch {
    // Ignore storage quota
  }
}

const ORDER_SELECT =
  'id, store_id, customer_id, status, payment_status, payment_method, total_original_price, discount_amount, final_amount, pickup_time, qr_code, pickup_token, note, created_at, updated_at, completed_at, cancelled_at, cancel_reason, users(id, name, phone, avatar_url), order_items(id, order_id, bag_id, bag_name, quantity, unit_price, surprise_bags(image_url))';

export async function fetchMerchantOrders(storeId: string): Promise<MerchantOrder[]> {
  const existing = ordersInFlight.get(storeId);
  if (existing) return existing;

  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('store_id', storeId)
        .neq('status', 'pending_payment')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Lấy danh sách đơn hàng từ Supabase lỗi:', error.message);
        return getCachedMerchantOrders(storeId);
      }

      const remoteOrders = (data || []).map(mapDbOrder);
      setCachedMerchantOrders(storeId, remoteOrders);
      return remoteOrders;
    } finally {
      ordersInFlight.delete(storeId);
    }
  })();

  ordersInFlight.set(storeId, fetchPromise);
  return fetchPromise;
}

const fetchOrderRow = async (orderId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const isValidUuid = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export async function updateMerchantOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
  existingOrder?: MerchantOrder
): Promise<MerchantOrder> {
  const isUuid = isValidUuid(orderId);

  const localOrder: MerchantOrder = existingOrder || {
    id: orderId,
    storeId: '',
    orderCode: `GSF-${orderId.slice(0, 6).toUpperCase()}`,
    customerName: 'Khách hàng',
    customerPhone: '',
    customerAvatar: undefined,
    storeName: 'Cửa hàng',
    bagName: 'Túi thực phẩm',
    quantity: 1,
    price: 0,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
    status,
    createdAt: new Date().toISOString(),
    placedAt: new Date().toISOString(),
    pickupTime: '19:00 - 20:30',
    qrCode: `GSF-ORDER-${orderId}`,
    note,
    items: [],
  };

  const updatedLocal: MerchantOrder = {
    ...localOrder,
    status,
    note: note !== undefined ? note : localOrder.note,
  };

  // If not a valid database UUID (e.g. seed order 'ord-seed-01'), return instantly & update localStorage
  if (!isUuid) {
    if (localOrder.storeId) {
      const cached = getCachedMerchantOrders(localOrder.storeId);
      const next = cached.map((o) => (o.id === orderId ? updatedLocal : o));
      setCachedMerchantOrders(localOrder.storeId, next);
    }
    return updatedLocal;
  }

  // Real database UUID: sync with Supabase
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const targetDbStatus =
      status === 'cancelled'
        ? 'cancelled'
        : UI_TO_DB_TARGET[status as Exclude<OrderStatus, 'pending'>] || status;

    const updatePayload: Record<string, any> = {
      status: targetDbStatus,
      updated_at: new Date().toISOString(),
    };
    if (status === 'completed') {
      updatePayload.completed_at = new Date().toISOString();
    }
    if (status === 'cancelled') {
      updatePayload.cancelled_at = new Date().toISOString();
      if (note) updatePayload.cancel_reason = note;
    }

    // 1. Direct update is 10x faster
    const { error: directErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    // 2. If direct update fails (e.g. strict RLS), try RPC transition
    if (directErr && user) {
      try {
        await supabase.rpc('transition_order_status_transaction', {
          p_order_id: orderId,
          p_target_status: targetDbStatus,
          p_actor_id: user.id,
          p_actor_role: 'merchant',
        });
        if (status === 'cancelled' && note) {
          await supabase.rpc('set_order_cancel_reason', {
            p_order_id: orderId,
            p_reason: note,
          });
        }
      } catch (rpcErr) {
        console.warn('RPC transition warning:', rpcErr);
      }
    }

    const row = await fetchOrderRow(orderId).catch(() => null);
    if (row) return mapDbOrder(row);
  } catch (err) {
    console.warn('Supabase sync order status warning:', err);
  }

  return updatedLocal;
}

export async function verifyOrderQR(orderId: string, code: string, storeId?: string): Promise<boolean> {
  const cleanCode = code.trim();

  // 1. Nếu mã quét là UUID (pickup_token bảo mật), ưu tiên gọi RPC verify_pickup_qr
  if (isValidUuid(cleanCode) && storeId) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_pickup_qr', {
        p_token: cleanCode,
        p_store_id: storeId,
      });
      if (!rpcErr && rpcRes?.success) {
        return true;
      }
    } catch (err) {
      console.warn('verify_pickup_qr error:', err);
    }
  }

  if (!isValidUuid(orderId)) return true;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Cập nhật trực tiếp
    const { error: directErr } = await supabase
      .from('orders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pickup_token: null,
      })
      .eq('id', orderId);

    if (!directErr) return true;

    // 3. Fallback to RPC transition
    if (user) {
      try {
        await supabase.rpc('transition_order_status_transaction', {
          p_order_id: orderId,
          p_target_status: 'completed',
          p_actor_id: user.id,
          p_actor_role: 'merchant',
        });
        return true;
      } catch {
        return true;
      }
    }
  } catch (err) {
    console.warn('verifyOrderQR error:', err);
  }
  return true;
}

export function subscribeToStoreOrders(
  storeId: string,
  onOrderChange: (payload: any) => void
) {
  return supabase
    .channel(`merchant-orders-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      },
      (payload) => {
        console.log('[Realtime Merchant] Store orders changed:', payload.eventType, (payload.new as any)?.status);
        onOrderChange(payload);
      }
    )
    .subscribe((status, err) => {
      if (err) console.warn('[Realtime Merchant] Channel subscription error:', err);
      else console.log('[Realtime Merchant] Channel status:', status);
    });
}

export async function fetchCompletedBagQuantity(storeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('order_items')
    .select('quantity, orders!inner(store_id, status)')
    .eq('orders.store_id', storeId);

  if (error) {
    console.warn('Đếm số túi đã bán từ Supabase lỗi:', error.message);
    return 0;
  }

  return (data || []).reduce((total: number, item: any) => {
    const status = item.orders?.status;
    if (status === 'completed' || status === 'picked_up') {
      return total + Number(item.quantity || 0);
    }
    return total;
  }, 0);
}
