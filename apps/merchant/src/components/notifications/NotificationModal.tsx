import { AlertCircle, Bell, CheckCheck, CheckCircle2, ChevronRight, ShoppingBag } from 'lucide-react';
import type { NotificationItem } from '../../types';
import { Button, EmptyState, Modal } from '../ui';

interface NotificationModalProps {
  open: boolean;
  items: NotificationItem[];
  filter: 'all' | 'unread';
  onFilter: (filter: 'all' | 'unread') => void;
  onClose: () => void;
  onRead: (id: string) => void;
  onReadAll: () => void;
  onSelect?: (item: NotificationItem) => void;
}

function stripEmojis(str?: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '')
    .trim();
}

function getDisplayOrderCode(item: NotificationItem): string | null {
  const code = item.orderCode || item.message || '';

  // Match GSF-XXXXXX
  const gsfMatch = code.match(/GSF-[A-Z0-9]{4,8}/i);
  if (gsfMatch) return gsfMatch[0].toUpperCase();

  // Match QR-UUID
  const qrMatch = code.match(/QR-([0-9a-fA-F]{4,8})/);
  if (qrMatch) return `GSF-${qrMatch[1].toUpperCase()}`;

  // Match GSF-ORDER-XXXXXX
  const gsfOrderMatch = code.match(/GSF-ORDER-([A-Z0-9]{4,8})/i);
  if (gsfOrderMatch) return `GSF-${gsfOrderMatch[1].toUpperCase()}`;

  if (item.orderId) {
    return `GSF-${item.orderId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  }
  return null;
}

export function NotificationModal({
  open,
  items,
  filter,
  onFilter,
  onClose,
  onRead,
  onReadAll,
  onSelect,
}: NotificationModalProps) {
  return (
    <Modal
      open={open}
      title="Thông báo"
      onClose={onClose}
      className="merchant-notification-modal"
    >
      <div className="merchant-modal-toolbar">
        <div className="merchant-segmented">
          <button className={filter === 'all' ? 'is-active' : ''} onClick={() => onFilter('all')}>
            Tất cả
          </button>
          <button
            className={filter === 'unread' ? 'is-active' : ''}
            onClick={() => onFilter('unread')}
          >
            Chưa đọc
          </button>
        </div>
        <Button size="small" variant="ghost" onClick={onReadAll}>
          <CheckCheck size={16} /> Đọc tất cả
        </Button>
      </div>

      <div className="merchant-notification-list">
        {items.length ? (
          items.map((item) => {
            const cleanTitle = stripEmojis(item.title);
            const orderCode = getDisplayOrderCode(item);
            const cleanDesc = stripEmojis(item.message);

            return (
              <button
                type="button"
                className={`merchant-notification ${item.isRead ? '' : 'is-unread'}`}
                key={item.id}
                onClick={() => {
                  onRead(item.id);
                  onSelect?.(item);
                }}
              >
                <div className="merchant-notification-icon">
                  {item.type === 'new_order' ? (
                    <ShoppingBag size={17} strokeWidth={2} />
                  ) : item.type === 'completed_order' ? (
                    <CheckCircle2 size={17} strokeWidth={2} />
                  ) : item.type === 'cancelled_order' ? (
                    <AlertCircle size={17} strokeWidth={2} />
                  ) : (
                    <Bell size={17} strokeWidth={2} />
                  )}
                </div>

                <div className="merchant-notification-body">
                  <div className="merchant-notification-header">
                    <strong>{cleanTitle}</strong>
                    {!item.isRead && <span className="merchant-notification-dot" />}
                  </div>

                  <div className="merchant-notification-meta">
                    {orderCode ? (
                      <span className="merchant-notification-code">#{orderCode}</span>
                    ) : cleanDesc ? (
                      <span className="merchant-notification-desc">{cleanDesc}</span>
                    ) : null}
                    {(orderCode || cleanDesc) && <span className="merchant-notification-sep">·</span>}
                    <span className="merchant-notification-time">{item.timeAgo}</span>
                  </div>
                </div>

                {item.orderId && (
                  <div className="merchant-notification-arrow">
                    <ChevronRight size={16} />
                  </div>
                )}
              </button>
            );
          })
        ) : (
          <EmptyState
            icon={<Bell size={24} />}
            title="Không có thông báo"
            message="Các thông báo mới sẽ xuất hiện tại đây."
          />
        )}
      </div>
    </Modal>
  );
}
