import { CheckCheck } from 'lucide-react';
import { EmptyState } from '@gosavingfood/ui';
import { ScreenHeader } from '../../../shared/components';
import type { NotificationItem } from '../../../shared/types/customer.types';
import { optimizeImageUrl } from '../../../services/customer.service';
import logoSvg from '../../../assets/logo.svg';
import logoPng from '../../../assets/logo.png';

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
    <div className="customer-screen customer-notifications-screen">
      <ScreenHeader
        title="Thông báo"
        onBack={onBack}
        action={
          <button
            type="button"
            className="customer-read-all-btn"
            onClick={onReadAll}
            disabled={!hasUnread}
            aria-label="Đánh dấu đã đọc tất cả"
            title="Đánh dấu đã đọc tất cả"
          >
            <CheckCheck size={20} className="customer-read-all-icon" />
            <span className="customer-read-all-text">Đánh dấu Đã đọc tất cả</span>
          </button>
        }
      />
      {notifications.length ? (
        <div className="customer-notification-list">
          {notifications.map((item) => {
            const hasOrder = Boolean(
              item.data?.orderId ||
              item.data?.order_id ||
              item.data?.orderCode ||
              item.data?.order_code ||
              (item.body + ' ' + item.title).match(/GSF-[A-Z0-9-]{4,30}/i) ||
              item.icon === 'order'
            );
            const hasBag = Boolean(item.data?.bagId || item.data?.bag_id);
            const hasMerchant = Boolean(item.data?.merchantId || item.data?.merchant_id);
            const hasTarget = hasOrder || hasBag || hasMerchant;

            const handleClick = () => {
              if (hasTarget && onSelectNotification) {
                onSelectNotification(item);
              }
            };

            return (
              <article
                key={item.id}
                className={`customer-notification-card ${item.read ? 'is-read' : 'is-unread'} ${hasTarget ? 'has-target' : ''}`}
                onClick={handleClick}
              >
                {/* 1. Hình ảnh sản phẩm thật hoặc Logo App (cột trái) */}
                <div className={`customer-notification-thumb-wrap ${item.imageUrl ? 'is-product' : 'is-logo'}`}>
                  <img
                    src={optimizeImageUrl(item.imageUrl, 150, 75) || logoSvg}
                    alt=""
                    className="customer-notification-thumb-img"
                    onError={(e) => {
                      if (e.currentTarget.src !== logoPng) {
                        e.currentTarget.src = logoPng;
                      }
                    }}
                  />
                </div>

                {/* 2. Cột nội dung ở giữa */}
                <div className="customer-notification-content-col">
                  <h3 className="customer-notification-item-title">{item.title}</h3>
                  <p className="customer-notification-item-body">{item.body}</p>
                  <span className="customer-notification-item-time">{item.time}</span>
                </div>

                {/* 3. Cột nút thao tác bên phải (Chỉ hiển thị trên Desktop nếu CÓ trang tương ứng, ẩn hoàn toàn trên Mobile) */}
                {hasTarget && (
                  <div className="customer-notification-action-col">
                    <button
                      type="button"
                      className="customer-notification-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNotification?.(item);
                      }}
                    >
                      Xem Chi Tiết
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Chưa có thông báo nào" />
      )}
    </div>
  );
}
