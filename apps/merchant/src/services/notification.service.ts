import { NOTIFICATIONS_MOCK } from '../mocks';
import type { NotificationItem } from '../types';
import { clone, delay } from './utils';

let notifications: NotificationItem[] = clone(NOTIFICATIONS_MOCK);
export const notificationService = {
  async fetchNotifications() { await delay(180); return clone(notifications); },
  async markAsRead(id: string) { await delay(100); notifications = notifications.map((item) => item.id === id ? { ...item, isRead: true } : item); return clone(notifications); },
  async markAllAsRead() { await delay(120); notifications = notifications.map((item) => ({ ...item, isRead: true })); return clone(notifications); },
};
