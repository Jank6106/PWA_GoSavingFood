import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit3,
  FileText,
  MapPin,
  MessageSquareText,
  RotateCcw,
  Sparkles,
  Star,
  Store,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import { QRCodeSVG } from 'qrcode.react';
import {
  FormSection,
  InfoRow,
  OrderItemRow,
  ScreenHeader,
} from '../../../shared/components';
import type { Order } from '../../../shared/types/customer.types';

interface OrderDetailPageProps {
  order: Order;
  onBack: () => void;
  onReview: () => void;
  onReport: () => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onReorder?: (order: Order) => void;
  onOpenBag?: (bagId: string) => void;
  onSaveNote?: (orderId: string, note: string) => void;
  onCancelOrder?: (orderId: string, reason: string) => void;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return 'Vừa mới đây';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} · ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'banking':
      return 'Chuyển khoản QR ngân hàng';
    case 'momo':
      return 'Ví MoMo';
    case 'cash':
      return 'Tiền mặt khi nhận';
    default:
      return method;
  }
}

const CANCEL_REASONS = [
  'Đổi ý, không muốn mua nữa',
  'Có việc bận đột xuất, không qua lấy kịp',
  'Đặt nhầm món / nhầm cửa hàng',
  'Khung giờ lấy hàng không còn phù hợp',
  'Lý do khác',
];

export function OrderDetailPage({
  order,
  onBack,
  onReview,
  onReport,
  onUpdateOrder,
  onReorder,
  onOpenBag,
  onSaveNote,
  onCancelOrder,
}: OrderDetailPageProps) {
  const [currentOrder, setCurrentOrder] = useState<Order>(order);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(order.note || '');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState(CANCEL_REASONS[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentOrder(order);
    setNoteValue(order.note || '');
  }, [order]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveNote = () => {
    const updated: Order = {
      ...currentOrder,
      note: noteValue.trim(),
    };
    setCurrentOrder(updated);
    onUpdateOrder?.(updated);
    onSaveNote?.(updated.id, updated.note ?? '');
    setIsEditingNote(false);
    showToast('Đã cập nhật ghi chú đơn hàng!');
  };

  const handleConfirmCancel = () => {
    const updated: Order = {
      ...currentOrder,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: selectedCancelReason,
    };
    setCurrentOrder(updated);
    onUpdateOrder?.(updated);
    onCancelOrder?.(updated.id, updated.cancelReason ?? '');
    setIsCancelModalOpen(false);
    showToast('Đã hủy đơn hàng và kích hoạt hoàn tiền 100%!');
  };

  const status = currentOrder.status;
  const isReady = status === 'ready_for_pickup';
  const isPending = status === 'pending';
  const isConfirmedOrPreparing = status === 'confirmed' || status === 'preparing';
  const isCompleted = status === 'completed' || (status as string) === 'picked_up';
  const isCancelled = status === 'cancelled';

  const savingsAmount = Math.max(
    0,
    currentOrder.totalOriginalPrice - currentOrder.finalAmount
  );

  return (
    <div className="customer-screen customer-order-detail-screen">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="customer-profile-toast-notice">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <ScreenHeader
        title="Chi tiết đơn hàng"
        onBack={onBack}
      />

      {/* Top Status Card - Only big text and guide note */}
      <section
        className={`customer-order-status-card customer-order-status-card--${status}`}
      >

        {isReady && (
          <>
            <h1>Hẹn gặp bạn tại cửa hàng!</h1>
            <p>
              Đơn hàng đã sẵn sàng. Vui lòng đến cửa hàng đúng khung giờ và xuất trình
              mã nhận hàng bên dưới.
            </p>
          </>
        )}

        {isPending && (
          <>
            <h1>Đang chờ quán xác nhận đơn</h1>
            <p>
              Cửa hàng đang kiểm tra thực phẩm trong ca và sẽ xác nhận trong ít
              phút. Bạn có thể thêm ghi chú hoặc hủy đơn nếu cần.
            </p>
          </>
        )}

        {isConfirmedOrPreparing && (
          <>
            <h1>Quán đã xác nhận & đang chuẩn bị</h1>
            <p>
              Cửa hàng đã xác nhận đơn và đang chuẩn bị các phần ăn cho bạn.
              Chúng tôi sẽ thông báo ngay khi đơn hàng sẵn sàng để lấy!
            </p>
          </>
        )}

        {isCompleted && (
          <>
            <h1>Đơn hàng đã hoàn thành</h1>
            <p>
              Cảm ơn bạn đã chung tay giải cứu thực phẩm xanh cùng GoSavingFood!
            </p>
          </>
        )}

        {isCancelled && (
          <>
            <h1>Đơn hàng đã được hủy</h1>
            <p>
              Đơn hàng này đã bị hủy. Toàn bộ số tiền thanh toán đã được hoàn trả
              100% về tài khoản của bạn.
            </p>
          </>
        )}
      </section>

      {/* Pickup Code Section - For Ready for pickup */}
      {isReady && (
        <section className="customer-pickup-code">
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <QRCodeSVG value={currentOrder.qrCode || currentOrder.orderCode} size={148} level="M" />
          </div>
          <span>Mã nhận hàng điện tử</span>
          <strong>{currentOrder.orderCode}</strong>
          <small>Đưa mã này hoặc mã QR cho nhân viên tại quán để lấy món</small>
        </section>
      )}

      {/* Cancelled Details Card */}
      {isCancelled && (
        <section className="customer-cancelled-banner">
          <div className="customer-cancelled-icon">
            <AlertCircle size={22} />
          </div>
          <div>
            <strong>Thông tin hoàn tiền & Hủy đơn</strong>
            <p>
              Lý do hủy: {currentOrder.cancelReason || 'Khách hàng yêu cầu hủy đơn'}
            </p>
            <div className="customer-refund-status-tag">
              <CheckCircle2 size={12} />
              <span>
                Đã hoàn tiền 100% ({currentOrder.finalAmount.toLocaleString('vi-VN')}đ)
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Lịch sử đặt, thanh toán & thời gian */}
      <FormSection title="Lịch sử đặt & thanh toán">
        <InfoRow
          icon={<Calendar size={18} />}
          label="Thời gian đặt hàng"
          value={formatDateTime(currentOrder.createdAt)}
        />
        <InfoRow
          icon={<CreditCard size={18} />}
          label="Thời gian thanh toán"
          value={`${formatDateTime(currentOrder.paidAt || currentOrder.createdAt)} · ${getPaymentMethodLabel(
            currentOrder.paymentMethod
          )} (Đã thanh toán)`}
        />
        {currentOrder.completedAt && (
          <InfoRow
            icon={<CheckCircle2 size={18} />}
            label="Thời gian nhận món"
            value={formatDateTime(currentOrder.completedAt)}
          />
        )}
        {currentOrder.cancelledAt && (
          <InfoRow
            icon={<AlertCircle size={18} />}
            label="Thời gian hủy đơn"
            value={formatDateTime(currentOrder.cancelledAt)}
          />
        )}
      </FormSection>

      {/* Thông tin nhận hàng */}
      <FormSection title="Thông tin nhận hàng">
        <InfoRow
          icon={<Clock3 size={18} />}
          label="Khung giờ nhận"
          value={currentOrder.pickupTime}
        />
        <InfoRow
          icon={<Store size={18} />}
          label="Cửa hàng"
          value={currentOrder.merchantName}
        />
        <InfoRow
          icon={<MapPin size={18} />}
          label="Địa chỉ lấy hàng"
          value={currentOrder.pickupAddress}
        />
      </FormSection>

      {/* Ghi chú đơn hàng (Note section) - Với chức năng chỉnh sửa cho Chờ xác nhận */}
      {(isPending || currentOrder.note) && (
        <FormSection title="Ghi chú cho quán">
          {!isEditingNote ? (
            <div className="customer-order-note-display">
              <div className="customer-order-note-content">
                <FileText size={17} />
                <span>
                  {currentOrder.note || 'Chưa có ghi chú nào cho đơn hàng này.'}
                </span>
              </div>
              {isPending && (
                <button
                  type="button"
                  className="customer-order-note-edit-btn"
                  onClick={() => setIsEditingNote(true)}
                >
                  <Edit3 size={14} />
                  <span>{currentOrder.note ? 'Sửa ghi chú' : 'Thêm ghi chú'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="customer-order-note-editor">
              <textarea
                className="customer-textarea"
                rows={3}
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Nhập ghi chú cho quán (VD: Lấy giúp mình phần ít cay, mình đến trễ 10 phút...)"
                autoFocus
              />
              <div className="customer-order-note-actions">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setNoteValue(currentOrder.note || '');
                    setIsEditingNote(false);
                  }}
                >
                  Hủy
                </Button>
                <Button size="sm" variant="primary" onClick={handleSaveNote}>
                  Lưu ghi chú
                </Button>
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* Chi tiết món & Giá gộp cùng một khung */}
      <FormSection title={isCompleted || isCancelled ? 'Lịch sử món đã đặt' : 'Chi tiết món'}>
        <div className="customer-order-items-group">
          {currentOrder.items.map((item) => (
            <OrderItemRow
              key={item.bagId}
              imageUrl={item.imageUrl}
              name={item.bagName}
              quantity={item.quantity}
              unitPrice={item.unitPrice}
              onClick={onOpenBag ? () => onOpenBag(item.bagId) : undefined}
            />
          ))}
        </div>

        <div className="customer-order-merged-pricing">
          <div className="customer-pricing-row">
            <span>Giá gốc thực phẩm</span>
            <strong>{currentOrder.totalOriginalPrice.toLocaleString('vi-VN')}đ</strong>
          </div>
          {savingsAmount > 0 && (
            <div className="customer-pricing-row is-saving">
              <span>Tiết kiệm từ giải cứu</span>
              <strong>-{savingsAmount.toLocaleString('vi-VN')}đ</strong>
            </div>
          )}
          <div className="customer-pricing-row is-total">
            <span>Tổng thanh toán</span>
            <strong>{currentOrder.finalAmount.toLocaleString('vi-VN')}đ</strong>
          </div>
        </div>
      </FormSection>

      {/* Section Đánh giá cho Đơn Hoàn thành */}
      {isCompleted && (
        <section className="customer-completed-review-box">
          {currentOrder.review ? (
            <div className="customer-review-exist-card">
              <div className="customer-review-exist-header">
                <div>
                  <strong>Đánh giá của bạn</strong>
                  <div className="customer-review-stars-row">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={15}
                        fill={s <= currentOrder.review!.rating ? '#e5a000' : 'none'}
                        stroke={s <= currentOrder.review!.rating ? '#e5a000' : '#d1d5db'}
                      />
                    ))}
                    <span>{currentOrder.review!.rating}/5 sao</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="customer-review-edit-link"
                  onClick={onReview}
                >
                  <Edit3 size={13} /> Sửa đánh giá
                </button>
              </div>

              {currentOrder.review.tags && currentOrder.review.tags.length > 0 && (
                <div className="customer-review-exist-tags">
                  {currentOrder.review.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              )}

              {currentOrder.review.comment && (
                <p className="customer-review-exist-comment">
                  "{currentOrder.review.comment}"
                </p>
              )}
            </div>
          ) : (
            <div className="customer-review-cta-card">
              <div className="customer-review-cta-icon">
                <Sparkles size={24} />
              </div>
              <div className="customer-review-cta-text">
                <strong>Bạn thấy món ăn hôm nay thế nào?</strong>
                <p>
                  Chia sẻ cảm nhận để giúp cộng đồng và nhận điểm thưởng cứu thực
                  phẩm nhé!
                </p>
              </div>
              <Button fullWidth variant="primary" size="md" onClick={onReview}>
                <MessageSquareText size={16} /> Viết đánh giá
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Action buttons based on status */}
      <div className="customer-order-actions-container">
        {/* If pending: Cancel Order button */}
        {isPending && (
          <Button
            fullWidth
            variant="destructive"
            size="md"
            onClick={() => setIsCancelModalOpen(true)}
          >
            <Trash2 size={16} /> Hủy đơn hàng này
          </Button>
        )}

        {/* If cancelled: Reorder button */}
        {isCancelled && (
          <Button
            fullWidth
            variant="primary"
            size="md"
            onClick={() => {
              if (onReorder) {
                onReorder(currentOrder);
              } else {
                onBack();
              }
            }}
          >
            <RotateCcw size={16} /> Đặt lại món này
          </Button>
        )}

        {/* Secondary options - Chỉ hiển thị cho mục Hoàn thành */}
        {isCompleted && (
          <div className="customer-completed-secondary-actions">
            <Button fullWidth variant="ghost" onClick={onReport}>
              <TriangleAlert size={18} /> Báo cáo sự cố
            </Button>
          </div>
        )}
      </div>

      {/* Modal Hủy Đơn Hàng cho mục Chờ xác nhận */}
      {isCancelModalOpen && (
        <div
          className="gsf-drawer-backdrop"
          onClick={() => setIsCancelModalOpen(false)}
          role="presentation"
        >
          <div
            className="gsf-drawer-bottom gsf-drawer-bottom--danger"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="gsf-drawer-handle" />

            <div className="gsf-drawer-header">
              <div className="gsf-drawer-title-group">
                <div className="gsf-drawer-icon-wrap gsf-drawer-icon-wrap--danger">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h2 className="gsf-drawer-title text-danger">Hủy đơn hàng</h2>
                  <p className="gsf-drawer-subtitle">
                    Đơn hàng sẽ bị hủy và tiền được hoàn 100%
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="gsf-drawer-close"
                onClick={() => setIsCancelModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="gsf-drawer-body">
              <div className="customer-delete-warning-card">
                <h4>Xác nhận hủy đơn #{currentOrder.orderCode}?</h4>
                <p>
                  Quán chưa chuẩn bị đơn này nên bạn được hủy hoàn toàn miễn phí.
                  Số tiền{' '}
                  <strong>{currentOrder.finalAmount.toLocaleString('vi-VN')}đ</strong>{' '}
                  sẽ được hoàn về tài khoản trong 1 - 3 ngày làm việc.
                </p>
              </div>

              <div className="customer-form-field">
                <label className="customer-form-label">
                  Vui lòng chọn lý do hủy đơn:
                </label>
                <div className="customer-cancel-reasons-list">
                  {CANCEL_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`customer-cancel-reason-item ${
                        selectedCancelReason === reason ? 'is-selected' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="cancelReason"
                        checked={selectedCancelReason === reason}
                        onChange={() => setSelectedCancelReason(reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="gsf-drawer-footer customer-delete-actions">
              <Button
                fullWidth
                variant="secondary"
                size="md"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Giữ đơn hàng
              </Button>
              <Button
                fullWidth
                variant="destructive"
                size="md"
                onClick={handleConfirmCancel}
              >
                Xác nhận hủy đơn
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
