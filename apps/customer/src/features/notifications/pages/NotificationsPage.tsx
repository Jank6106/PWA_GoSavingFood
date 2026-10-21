import { CheckCheck } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import type { NotificationItem } from '../../../shared/types/customer.types';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  onBack: () => void;
  onReadAll: () => void;
  onSelectNotification?: (item: NotificationItem) => void;
}

export function NotificationsPage({
  notifications,
  onBack,
  onReadAll,
  onSelectNotification,
}: NotificationsPageProps) {
  const hasUnread = notifications.some((item) => !item.read);

  return (
    <div className="customer-screen">
      <ScreenHeader
        title="Thông báo"
        onBack={onBack}
        action={
          <button
            type="button"
            className="customer-read-all-btn"
            onClick={onReadAll}
            disabled={!hasUnread}
            aria-label="Đọc tất cả"
          >
            <CheckCheck size={15} />
            <span>Đọc tất cả</span>
          </button>
        }
      />
      {notifications.length ? (
        <div className="customer-notification-list">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`${item.read ? '' : 'is-unread'} ${onSelectNotification ? 'is-clickable' : ''}`}
              onClick={() => onSelectNotification?.(item)}
              style={onSelectNotification ? { cursor: 'pointer' } : undefined}
            >
              <div className="customer-notification-content">
                <div className="customer-notification-top-row">
                  <strong>{item.title}</strong>
                  <small>{item.time}</small>
                </div>
                <p>{item.body}</p>
                {item.data?.orderId && (
                  <span style={{ fontSize: '12px', color: '#005639', fontWeight: 700, marginTop: '2px' }}>
                    Xem chi tiết đơn hàng →
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Chưa có thông báo" />
      )}
    </div>
  );
}
