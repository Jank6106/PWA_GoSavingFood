import type { NotificationItem } from '../types';
import { supabase } from './supabase';

const formatTimeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 'Vừa xong';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
};

const inferNotificationType = (row: any): NotificationItem['type'] => {
  const status = String(row?.data?.status ?? '');
  const title = String(row?.title ?? '').toLowerCase();
  if (status === 'ready_for_pickup') return 'pickup_reminder';
  if (status === 'completed') return 'completed_order';
  if (status === 'cancelled') return 'cancelled_order';
  if (title.includes('đánh giá') || title.includes('review')) return 'review_alert';
  return 'new_order';
};

const mapNotification = (row: any): NotificationItem => {
  const orderId = row?.data?.orderId || row?.data?.order_id || row?.data?.id;
  const orderCode =
    row?.data?.orderCode ||
    row?.data?.order_code ||
    (orderId ? `GSF-${String(orderId).slice(0, 6).toUpperCase()}` : undefined);
  const storeId = row?.data?.storeId || row?.data?.store_id;
  const storeName = row?.data?.storeName || row?.data?.store_name;
  return {
    id: row.id,
    orderId,
    orderCode,
    storeId,
    storeName,
    title: row.title || 'Thông báo',
    message: row.body || '',
    type: inferNotificationType(row),
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || new Date().toISOString(),
    timeAgo: formatTimeAgo(row.created_at),
  };
};

async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('Lấy thông báo từ Supabase lỗi:', error.message);
    return [];
  }
  return (data || []).map(mapNotification);
}

async function markAsRead(userId: string, id: string): Promise<NotificationItem[]> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) console.warn('Đánh dấu thông báo đã đọc lỗi:', error.message);
  return fetchNotifications(userId);
}

async function markAllAsRead(userId: string): Promise<NotificationItem[]> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) console.warn('Đánh dấu tất cả thông báo đã đọc lỗi:', error.message);
  return fetchNotifications(userId);
}

export function subscribeToNotifications(
  userId: string,
  onNewNotification: (payload: any) => void
) {
  return supabase
    .channel(`merchant-notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new);
      }
    )
    .subscribe();
}

export const notificationService = {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
};

