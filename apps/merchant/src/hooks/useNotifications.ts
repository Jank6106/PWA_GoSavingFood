import type { NotificationRow } from '../types/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationService } from '../services/notification.service';
import type { NotificationItem } from '../types';

export function useNotifications(userId: string, onNewNotification?: (item: NotificationRow) => void) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setNotifications(await notificationService.fetchNotifications(userId));
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    if (!userId) return () => window.clearTimeout(timer);

    const channel = notificationService.subscribeToNotifications(userId, (payload) => {
      onNewNotification?.(payload);
      void loadNotifications();
    });

    const handleFocus = () => {
      void loadNotifications();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      void channel.unsubscribe();
    };
  }, [loadNotifications, onNewNotification, userId]);

  const visibleNotifications = useMemo(
    () => (filter === 'unread' ? notifications.filter((item) => !item.isRead) : notifications),
    [notifications, filter]
  );
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const markAsRead = async (id: string) =>
    setNotifications(await notificationService.markAsRead(userId, id));
  const markAllAsRead = async () =>
    setNotifications(await notificationService.markAllAsRead(userId));

  return {
    notifications: visibleNotifications,
    unreadCount,
    filter,
    isOpen,
    setFilter,
    setIsOpen,
    markAsRead,
    markAllAsRead,
  };
}
