import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationService } from '../services/notification.service';
import type { NotificationItem } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const loadNotifications = useCallback(async () => setNotifications(await notificationService.fetchNotifications()), []);
  useEffect(() => { const timer = window.setTimeout(() => { void loadNotifications(); }, 0); return () => window.clearTimeout(timer); }, [loadNotifications]);
  const visibleNotifications = useMemo(() => filter === 'unread' ? notifications.filter((item) => !item.isRead) : notifications, [notifications, filter]);
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const markAsRead = async (id: string) => setNotifications(await notificationService.markAsRead(id));
  const markAllAsRead = async () => setNotifications(await notificationService.markAllAsRead());
  return { notifications: visibleNotifications, unreadCount, filter, isOpen, setFilter, setIsOpen, markAsRead, markAllAsRead };
}
