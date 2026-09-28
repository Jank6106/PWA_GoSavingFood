import { INITIAL_ORDERS_MOCK } from '../mocks';
import type { MerchantOrder, OrderStatus } from '../types';
import { supabase } from './supabase';
import { clone, delay } from './utils';

const orderStore = clone(INITIAL_ORDERS_MOCK);

export async function fetchMerchantOrders(storeId: string): Promise<MerchantOrder[]> {
  try {
    const { data: dbOrders, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(dbOrders) && dbOrders.length > 0) {
      return dbOrders.map((o: any) => {
        const firstItem = o.order_items?.[0];
        let status: OrderStatus = 'pending';
        if (o.status === 'confirmed') status = 'confirmed';
        else if (o.status === 'preparing') status = 'processing';
        else if (o.status === 'ready_for_pickup') status = 'confirmed';
        else if (o.status === 'completed' || o.status === 'picked_up') status = 'completed';
        else if (o.status === 'cancelled') status = 'cancelled';

        return {
          id: o.id,
          storeId: o.store_id,
          orderCode: o.order_code || `GSF-${o.id.slice(0, 6).toUpperCase()}`,
          customerName: o.customer_name || 'Khách hàng GoSavingFood',
          customerPhone: o.customer_phone || '0901234567',
          storeName: 'Cửa hàng của tôi',
          bagName: firstItem?.bag_name || 'Túi cứu trợ thực phẩm',
          quantity: firstItem?.quantity || 1,
          price: Number(o.final_amount) || Number(firstItem?.unit_price) || 35000,
          originalPrice: Number(o.total_original_price) || 80000,
          imageUrl:
            firstItem?.image_url ||
            'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
          status,
          createdAt: o.created_at || new Date().toISOString(),
          placedAt: o.created_at ? new Date(o.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '18:30',
          pickupTime: o.pickup_time || '19:00 - 21:00',
          qrCode: o.qr_code || `GSF-ORDER-${o.id}`,
          items: (o.order_items || []).map((it: any) => ({
            id: it.id,
            name: it.bag_name || 'Túi thực phẩm',
            quantity: it.quantity,
            price: it.unit_price,
          })),
        };
      });
    }
  } catch (err) {
    console.warn('Lấy danh sách đơn hàng từ Supabase lỗi:', err);
  }

  await delay();
  return clone(orderStore.filter((order) => order.storeId === storeId || storeId === 'store-gsf-01'));
}

export async function updateMerchantOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<MerchantOrder> {
  void note;
  try {
    let dbStatus = 'pending';
    if (status === 'processing') dbStatus = 'preparing';
    else if (status === 'confirmed') dbStatus = 'ready_for_pickup';
    else if (status === 'completed') dbStatus = 'completed';
    else if (status === 'cancelled') dbStatus = 'cancelled';

    await supabase
      .from('orders')
      .update({
        status: dbStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  } catch (err) {
    console.warn('Cập nhật trạng thái đơn trên Supabase lỗi:', err);
  }

  await delay(200);
  const order = orderStore.find((item) => item.id === orderId);
  if (!order) throw new Error('Không tìm thấy đơn hàng.');
  order.status = status;
  return clone(order);
}

export async function verifyOrderQR(orderId: string, code: string): Promise<boolean> {
  // 1. Thử gọi Supabase Edge Function verify-qr
  try {
    const { data, error } = await supabase.functions.invoke('verify-qr', {
      body: { qrToken: code },
    });
    if (!error && data?.success) {
      const order = orderStore.find((item) => item.id === orderId);
      if (order) order.status = 'completed';
      return true;
    }
  } catch (err) {
    console.warn('Gọi Edge Function verify-qr lỗi, thử kiểm tra mã tại chỗ:', err);
  }

  // 2. Fallback đối soát mã tại chỗ
  await delay(300);
  const order = orderStore.find((item) => item.id === orderId);
  if (!order) return false;
  const normalized = code.trim().toUpperCase();
  if (
    normalized !== order.qrCode.toUpperCase() &&
    !normalized.includes(order.orderCode.toUpperCase()) &&
    !normalized.includes(order.id.toUpperCase())
  ) {
    return false;
  }
  order.status = 'completed';
  return true;
}

export function subscribeToStoreOrders(
  storeId: string,
  onNewOrder: (payload: any) => void
) {
  return supabase
    .channel(`merchant-orders-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      },
      (payload) => {
        onNewOrder(payload.new);
      }
    )
    .subscribe();
}

export function getCompletedBagQuantity(storeId: string): number {
  return orderStore
    .filter((order) => (order.storeId === storeId || storeId === 'store-gsf-01') && order.status === 'completed')
    .reduce((total, order) => total + order.quantity, 0);
}
