import { CheckCheck } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import type { NotificationItem } from '../../../shared/types/customer.types';

interface NotificationsPageProps { notifications: NotificationItem[]; onBack: () => void; onReadAll: () => void; }

export function NotificationsPage({ notifications, onBack, onReadAll }: NotificationsPageProps) {
  return <div className="customer-screen"><ScreenHeader title="Thông báo" subtitle={`${notifications.filter((item) => !item.read).length} thông báo chưa đọc`} onBack={onBack} action={<button type="button" className="customer-text-action" onClick={onReadAll}><CheckCheck size={18} /></button>} />{notifications.length ? <div className="customer-notification-list">{notifications.map((item) => <article key={item.id} className={item.read ? '' : 'is-unread'}><span>{item.icon}</span><div><strong>{item.title}</strong><p>{item.body}</p><small>{item.time}</small></div></article>)}</div> : <EmptyState title="Chưa có thông báo" />}</div>;
}
