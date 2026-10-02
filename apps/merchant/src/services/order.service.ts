import type { MerchantOrder, OrderStatus } from '../types';
import { supabase } from './supabase';

const ORDER_STATUS_FLOW = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'picked_up',
  'completed',
];

const UI_TO_DB_TARGET: Record<Exclude<OrderStatus, 'pending'>, string> = {
  processing: 'preparing',
  confirmed: 'ready_for_pickup',
  completed: 'completed',
  cancelled: 'cancelled',
};

const mapDbStatusToUi = (status: string): OrderStatus => {
  if (status === 'confirmed') return 'confirmed';
  if (status === 'preparing') return 'processing';
  if (status === 'ready_for_pickup') return 'confirmed';
  if (status === 'completed' || status === 'picked_up') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
};

const mapTransitionError = (message: string) => {
  if (message.includes('INVALID_STATE_TRANSITION'))
    return 'Không thể chuyển sang trạng thái này ở bước hiện tại của đơn hàng.';
  if (message.includes('DUPLICATE_TRANSITION')) return 'Đơn hàng đã ở trạng thái này.';
  if (message.includes('FORBIDDEN_STORE')) return 'Bạn không phải chủ cửa hàng của đơn này.';
  if (message.includes('INVALID_CANCEL_STATE'))
    return 'Đơn hàng ở trạng thái này không thể hủy.';
  if (message.includes('ORDER_NOT_FOUND')) return 'Không tìm thấy đơn hàng.';
  return 'Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại.';
};

const mapDbOrder = (o: any): MerchantOrder => {
  const firstItem = o.order_items?.[0];
  const customer = Array.isArray(o.users) ? o.users[0] : o.users;
  return {
    id: o.id,
    storeId: o.store_id,
    orderCode: `GSF-${String(o.id).slice(0, 6).toUpperCase()}`,
    customerName: customer?.name || 'Khách hàng GoSavingFood',
    customerPhone: customer?.phone || 'Chưa cập nhật',
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
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${ORDERS_CACHE_PREFIX}${storeId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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
  '*, order_items(*, surprise_bags(image_url)), users!orders_customer_id_fkey(name, phone)';

export async function fetchMerchantOrders(storeId: string): Promise<MerchantOrder[]> {
  let { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Lấy danh sách đơn hàng có users join lỗi, thử fallback:', error.message);
    const fallbackRes = await supabase
      .from('orders')
      .select('*, order_items(*, surprise_bags(image_url))')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (fallbackRes.error) {
      console.warn('Lấy danh sách đơn hàng fallback lỗi:', fallbackRes.error.message);
      return getCachedMerchantOrders(storeId);
    }
    data = fallbackRes.data;
  }

  const orders = (data || []).map(mapDbOrder);
  setCachedMerchantOrders(storeId, orders);
  return orders;
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

const requireUserId = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập tài khoản cửa hàng.');
  return user.id;
};

const runTransition = async (orderId: string, targetStatus: string, actorId: string) => {
  const { data, error } = await supabase.rpc('transition_order_status_transaction', {
    p_order_id: orderId,
    p_target_status: targetStatus,
    p_actor_id: actorId,
    p_actor_role: 'merchant',
  });
  if (error) {
    throw new Error(mapTransitionError(`${error.message} ${error.details ?? ''}`));
  }
  return data;
};

export async function updateMerchantOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<MerchantOrder> {
  void note;
  const actorId = await requireUserId();
  const current = await fetchOrderRow(orderId);
  if (!current) throw new Error('Không tìm thấy đơn hàng.');

  const transitions: string[] = [];
  if (status === 'cancelled') {
    transitions.push('cancelled');
  } else {
    const target = UI_TO_DB_TARGET[status as Exclude<OrderStatus, 'pending'>];
    const fromIndex = ORDER_STATUS_FLOW.indexOf(String(current.status));
    const toIndex = ORDER_STATUS_FLOW.indexOf(target);
    if (!target || fromIndex === -1 || toIndex === -1) {
      throw new Error('Trạng thái đơn hàng không hợp lệ.');
    }
    for (let index = fromIndex + 1; index <= toIndex; index += 1) {
      transitions.push(ORDER_STATUS_FLOW[index]);
    }
  }

  for (const targetStatus of transitions) {
    await runTransition(orderId, targetStatus, actorId);
  }

  const updated = await fetchOrderRow(orderId);
  if (!updated) throw new Error('Không thể tải lại đơn hàng sau khi cập nhật.');
  return mapDbOrder(updated);
}

export async function verifyOrderQR(orderId: string, code: string): Promise<boolean> {
  const actorId = await requireUserId();
  const normalized = code.trim().toUpperCase();

  // 1. Ưu tiên xác thực phía server qua Edge Function verify-qr
  try {
    const { data, error } = await supabase.functions.invoke('verify-qr', {
      body: { qrToken: code, orderId },
    });
    if (!error && data?.success) return true;
    if (!error && data && data.success === false) return false;
    if (error) {
      console.warn(
        'Edge Function verify-qr lỗi, chuyển sang đối soát trực tiếp:',
        error.message
      );
    }
  } catch (err) {
    console.warn('Edge Function verify-qr lỗi, chuyển sang đối soát trực tiếp:', err);
  }

  // 2. Đối soát trực tiếp trên dữ liệu thật rồi chuyển trạng thái qua RPC
  const order = await fetchOrderRow(orderId);
  if (!order) return false;

  const qrCode = String(order.qr_code || '').toUpperCase();
  const orderCode = `GSF-${String(order.id).slice(0, 6).toUpperCase()}`;
  const matches =
    normalized === qrCode ||
    qrCode.includes(normalized) ||
    normalized.includes(orderCode) ||
    orderCode.includes(normalized) ||
    normalized.includes(String(order.id).toUpperCase());
  if (!matches) return false;

  const currentIndex = ORDER_STATUS_FLOW.indexOf(String(order.status));
  if (currentIndex === -1 || currentIndex === ORDER_STATUS_FLOW.length - 1) return true;
  for (let index = currentIndex + 1; index < ORDER_STATUS_FLOW.length; index += 1) {
    await runTransition(orderId, ORDER_STATUS_FLOW[index], actorId);
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
