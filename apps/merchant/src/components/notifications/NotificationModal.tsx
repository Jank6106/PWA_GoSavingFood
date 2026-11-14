import { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ShoppingBag,
  Store,
} from 'lucide-react';
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
  onNavigateToOrder?: (item: NotificationItem) => void;
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

function formatDetailTime(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '';
  }
}

export function NotificationModal({
  open,
  items,
  filter,
  onFilter,
  onClose,
  onRead,
  onReadAll,
  onNavigateToOrder,
}: NotificationModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleCard = (item: NotificationItem) => {
    if (!item.isRead) {
      onRead(item.id);
    }
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  };

  return (
    <Modal
      open={open}
      title="Thông báo"
      onClose={onClose}
      className="merchant-notification-modal"
    >
      <div className="merchant-modal-toolbar">
        <div className="merchant-segmented">
          <button
            type="button"
            className={filter === 'all' ? 'is-active' : ''}
            onClick={() => onFilter('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
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
            const rawCode = getDisplayOrderCode(item);
            const displayCode = rawCode ? (rawCode.startsWith('#') ? rawCode : `#${rawCode}`) : '';
            const cleanDesc = stripEmojis(item.message) || item.message || '';
            const isExpanded = expandedId === item.id;

            let iconTypeClass = 'is-default';
            if (item.type === 'new_order') iconTypeClass = 'is-new-order';
            else if (item.type === 'completed_order') iconTypeClass = 'is-completed';
            else if (item.type === 'cancelled_order') iconTypeClass = 'is-cancelled';

            return (
              <div
                role="button"
                tabIndex={0}
                className={`merchant-notification ${item.isRead ? '' : 'is-unread'} ${
                  isExpanded ? 'is-expanded' : ''
                }`}
                key={item.id}
                onClick={() => handleToggleCard(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleCard(item);
                  }
                }}
              >
                <div className="merchant-notification-top">
                  <div className={`merchant-notification-icon ${iconTypeClass}`}>
                    {item.type === 'new_order' ? (
                      <ShoppingBag size={18} strokeWidth={2.2} />
                    ) : item.type === 'completed_order' ? (
                      <CheckCircle2 size={18} strokeWidth={2.2} />
                    ) : item.type === 'cancelled_order' ? (
                      <AlertCircle size={18} strokeWidth={2.2} />
                    ) : (
                      <Bell size={18} strokeWidth={2.2} />
                    )}
                  </div>

                  <div className="merchant-notification-body">
                    <div className="merchant-notification-header">
                      <div className="merchant-notification-title-wrap">
                        <strong>{cleanTitle}</strong>
                        {!item.isRead && <span className="merchant-notification-dot" />}
                      </div>
                      <div className="merchant-notification-arrow">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>

                    {item.storeName && (
                      <div style={{ marginTop: 2 }}>
                        <span className="merchant-notification-store-tag">
                          <Store size={12} /> {item.storeName}
                        </span>
                      </div>
                    )}

                    {!isExpanded && (
                      <>
                        {cleanDesc && (
                          <p className="merchant-notification-desc">{cleanDesc}</p>
                        )}
                        <div className="merchant-notification-meta">
                          {displayCode && (
                            <span className="merchant-notification-code">{displayCode}</span>
                          )}
                          {displayCode && <span className="merchant-notification-sep">·</span>}
                          <span className="merchant-notification-time">{item.timeAgo}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    className="merchant-notification-expanded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="merchant-notification-full-desc">
                      {cleanDesc || 'Không có nội dung chi tiết.'}
                    </div>

                    <div className="merchant-notification-expanded-meta">
                      <span className="merchant-notification-time-detail">
                        <Clock size={12} /> {item.timeAgo} ({formatDetailTime(item.createdAt)})
                      </span>
                      {displayCode && (
                        <span className="merchant-notification-code">{displayCode}</span>
                      )}
                    </div>

                    {(displayCode || item.orderId) && (
                      <button
                        type="button"
                        className="merchant-notification-cta"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToOrder?.(item);
                        }}
                      >
                        <ShoppingBag size={16} />
                        <span>Xem chi tiết đơn hàng {displayCode}</span>
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
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
