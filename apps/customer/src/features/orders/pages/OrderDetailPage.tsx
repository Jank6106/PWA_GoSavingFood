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
  ShoppingBag,
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
import { customerService } from '../../../services/customer.service';

interface OrderDetailPageProps {
  order: Order;
  onBack: () => void;
  onReview: () => void;
  onReport: () => void;
  onPay?: (order: Order) => void;
  onUpdateOrder?: (updatedOrder: Order) => void;
  onReorder?: (order: Order) => void;
  onOpenBag?: (bagId: string) => void;
  onSaveNote?: (orderId: string, note: string) => void;
  onCancelOrder?: (
    orderId: string,
    reason: string,
    bankInfo?: { bankName: string; accountNumber: string; accountHolder: string }
  ) => void;
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

function formatPickupTimeDisplay(pickupTime?: string): string {
  if (!pickupTime) return '11:00 - 14:00';
  if (pickupTime.includes('T') || (pickupTime.includes('-') && pickupTime.includes(':'))) {
    try {
      const d = new Date(pickupTime);
      if (!isNaN(d.getTime())) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${hours}:${minutes} · ${day}/${month}/${year}`;
      }
    } catch {}
  }
  return pickupTime;
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'payos_vietqr':
    case 'banking':
      return 'Chuyển khoản VietQR (PayOS)';
    case 'momo':
      return 'Ví MoMo';
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

const VIETNAM_BANKS = [
  'Vietcombank',
  'MB Bank',
  'Techcombank',
  'BIDV',
  'VietinBank',
  'ACB',
  'VPBank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'Agribank',
  'MoMo / Khác',
];

export function OrderDetailPage({
  order,
  onBack,
  onReview,
  onReport,
  onPay,
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
  const [refundBank, setRefundBank] = useState('Vietcombank');
  const [refundAccountNumber, setRefundAccountNumber] = useState('');
  const [refundAccountHolder, setRefundAccountHolder] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentOrder(order);
    setNoteValue(order.note || '');
  }, [order]);

  useEffect(() => {
    if (currentOrder.status === 'pending_payment' || currentOrder.paymentStatus === 'pending') {
      // 1. Kiểm tra nếu đã quá hạn TTL thì chuyển sang expired
      if (
        currentOrder.paymentExpiresAt &&
        new Date(currentOrder.paymentExpiresAt).getTime() <= Date.now()
      ) {
        const expiredOrder: Order = {
          ...currentOrder,
          status: 'expired',
        };
        setCurrentOrder(expiredOrder);
        onUpdateOrder?.(expiredOrder);
        void customerService.cleanupExpiredPendingOrders();
        return;
      }

      // 2. Tra cứu PayOS xem đã thanh toán chưa
      void customerService
        .checkPayOSStatus({ orderId: currentOrder.id, orderCode: currentOrder.orderCode })
        .then((res) => {
          if (res?.paid || res?.status === 'PAID') {
            const updated: Order = {
              ...currentOrder,
              status: 'paid',
              paymentStatus: 'success',
            };
            setCurrentOrder(updated);
            onUpdateOrder?.(updated);
          }
        });
    }
  }, [currentOrder.id]);

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
    const isPaidOrder = currentOrder.paymentStatus === 'success' || currentOrder.status === 'paid';

    let bankInfo: { bankName: string; accountNumber: string; accountHolder: string } | undefined = undefined;
    if (isPaidOrder) {
      if (!refundAccountNumber.trim() || !refundAccountHolder.trim()) {
        showToast('Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản để nhận tiền hoàn.');
        return;
      }
      bankInfo = {
        bankName: refundBank,
        accountNumber: refundAccountNumber.trim(),
        accountHolder: refundAccountHolder.trim().toUpperCase(),
      };
    }

    const updated: Order = {
      ...currentOrder,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelReason: selectedCancelReason,
      paymentStatus: isPaidOrder ? 'refund_pending' : currentOrder.paymentStatus,
    };
    setCurrentOrder(updated);
    onUpdateOrder?.(updated);
    onCancelOrder?.(updated.id, updated.cancelReason ?? '', bankInfo);
    setIsCancelModalOpen(false);
    showToast(
      isPaidOrder
        ? 'Đã gửi yêu cầu hủy đơn & hoàn tiền 100% thành công!'
        : 'Đã hủy đơn hàng thành công!'
    );
  };

  const status = currentOrder.status;
  const isPendingPayment = status === 'pending_payment';
  const isPaid = status === 'paid';
  const isPreparing = status === 'preparing';
  const isReady = status === 'ready_for_pickup';
  const isPendingLegacy = status === 'pending';
  const isConfirmedLegacy = status === 'confirmed';
  const isConfirmedOrPreparing = isConfirmedLegacy || isPreparing;
  const isCompleted = status === 'completed' || (status as string) === 'picked_up';
  const isCancelled = status === 'cancelled';
  const isExpired = status === 'expired';
  const isOrderPaid =
    currentOrder.paymentStatus === 'success' ||
    isPaid ||
    isPreparing ||
    isReady ||
    isCompleted ||
    Boolean(currentOrder.paidAt);
  const isPending = isPendingPayment || isPaid || isPendingLegacy;
  // Khách CHỈ được hủy khi Chờ thanh toán (pending_payment) hoặc Chờ xác nhận (paid). Khóa chặt khi Đang xử lý hoặc Chờ lấy!
  const canCancel = isPendingPayment || isPaid || isPendingLegacy;

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

      {/* Top Status Card - Clean monochrome title & icon */}
      <section
        className={`customer-order-status-card customer-order-status-card--${status}`}
      >
        {isPendingPayment && (
          <div className="customer-status-banner-title">
            <Clock3 size={20} />
            <h1>Chờ thanh toán VietQR</h1>
          </div>
        )}

        {isPaid && (
          <div className="customer-status-banner-title">
            <CheckCircle2 size={20} />
            <h1>Đã thanh toán · Chờ quán nhận đơn</h1>
          </div>
        )}

        {isPreparing && (
          <div className="customer-status-banner-title">
            <Store size={20} />
            <h1>Quán đang chuẩn bị món</h1>
          </div>
        )}

        {isReady && (
          <div className="customer-status-banner-title">
            <ShoppingBag size={20} />
            <h1>Sẵn sàng lấy món</h1>
          </div>
        )}

        {isPendingLegacy && (
          <div className="customer-status-banner-title">
            <Clock3 size={20} />
            <h1>Đang chờ quán xác nhận đơn</h1>
          </div>
        )}

        {isConfirmedLegacy && (
          <div className="customer-status-banner-title">
            <CheckCircle2 size={20} />
            <h1>Quán đã xác nhận đơn</h1>
          </div>
        )}

        {isCompleted && (
          <div className="customer-status-banner-title">
            <CheckCircle2 size={20} />
            <h1>Đơn hàng đã hoàn thành</h1>
          </div>
        )}

        {isCancelled && (
          <div className="customer-status-banner-title">
            <AlertCircle size={20} />
            <h1>Đơn hàng đã hủy</h1>
          </div>
        )}

        {isExpired && (
          <div className="customer-status-banner-title">
            <Clock3 size={20} />
            <h1>Đơn hàng đã hết hạn</h1>
          </div>
        )}
      </section>

      {/* Pickup Code Section - For Confirmed, Preparing or Ready for pickup */}
      {(isReady || isConfirmedOrPreparing || (isPending && currentOrder.paymentStatus === 'success')) && (
        <section className="customer-pickup-code">
          <div style={{ background: '#ffffff', padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <QRCodeSVG value={currentOrder.pickupToken || currentOrder.qrCode || currentOrder.id} size={148} level="M" />
          </div>
          <span>Mã nhận hàng điện tử (Bảo mật)</span>
          <strong>{currentOrder.orderCode}</strong>
        </section>
      )}

      {/* Cancelled Details Card */}
      {isCancelled && (
        <section className="customer-cancelled-banner">
          <div className="customer-cancelled-icon">
            <AlertCircle size={20} />
          </div>
          <div>
            <strong>Lý do hủy: {currentOrder.cancelReason || 'Khách hàng yêu cầu hủy đơn'}</strong>
            {currentOrder.paymentStatus === 'refund_pending' && (
              <div className="customer-refund-status-tag" style={{ marginTop: '6px' }}>
                <CheckCircle2 size={12} />
                <span>
                  Đang xử lý hoàn tiền ({currentOrder.finalAmount.toLocaleString('vi-VN')}đ)
                </span>
              </div>
            )}
            {currentOrder.paymentStatus === 'refunded' && (
              <div className="customer-refund-status-tag" style={{ marginTop: '6px' }}>
                <CheckCircle2 size={12} />
                <span>
                  Đã hoàn tiền 100% ({currentOrder.finalAmount.toLocaleString('vi-VN')}đ)
                </span>
              </div>
            )}
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
        {isOrderPaid ? (
          <InfoRow
            icon={<CreditCard size={18} />}
            label="Thời gian thanh toán"
            value={`${formatDateTime(currentOrder.paidAt || currentOrder.createdAt)} · ${getPaymentMethodLabel(
              currentOrder.paymentMethod
            )} (Đã thanh toán)`}
          />
        ) : (
          <InfoRow
            icon={<CreditCard size={18} />}
            label="Trạng thái thanh toán"
            value={
              isPendingPayment
                ? `${getPaymentMethodLabel(currentOrder.paymentMethod)} · Chờ thanh toán`
                : currentOrder.paymentStatus === 'refund_pending'
                ? 'Đang xử lý hoàn tiền'
                : `${getPaymentMethodLabel(currentOrder.paymentMethod)} · Chưa thanh toán`
            }
          />
        )}
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
          value={formatPickupTimeDisplay(currentOrder.pickupTime)}
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
            <div className="customer-review-cta-clean">
              <Button fullWidth variant="outline" size="md" onClick={onReview}>
                <MessageSquareText size={16} /> Viết đánh giá cho đơn hàng
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Action buttons based on status */}
      <div className="customer-order-actions-container">
        {/* Nút thanh toán ngay cho đơn pending_payment */}
        {isPendingPayment && onPay && (
          <Button
            fullWidth
            variant="primary"
            size="md"
            onClick={() => onPay(currentOrder)}
          >
            <CreditCard size={16} /> Thanh toán VietQR ngay
          </Button>
        )}

        {/* Nút hủy đơn: Chỉ cho phép hủy khi đơn ở pending_payment / paid */}
        {canCancel && (
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

      {/* Modal Hủy Đơn Hàng */}
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
                  <h2 className="gsf-drawer-title text-danger">
                    {isPaid || currentOrder.paymentStatus === 'success' ? 'Hủy đơn & Hoàn tiền' : 'Hủy đơn hàng'}
                  </h2>
                  <p className="gsf-drawer-subtitle">
                    {isPaid || currentOrder.paymentStatus === 'success'
                      ? 'Đơn hàng sẽ bị hủy và hoàn tiền 100%'
                      : 'Hủy đơn hàng chưa thanh toán'}
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
                  {isPaid || currentOrder.paymentStatus === 'success'
                    ? `Quán chưa chuẩn bị món nên bạn được hủy miễn phí. Số tiền ${currentOrder.finalAmount.toLocaleString('vi-VN')}đ sẽ được hoàn 100% về tài khoản bạn cung cấp.`
                    : 'Đơn hàng chưa thanh toán sẽ được hủy ngay lập tức và không phát sinh bất kỳ khoản phí nào.'}
                </p>
              </div>

              <div className="customer-form-field">
                <label className="customer-form-label">
                  Lý do hủy đơn:
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

              {(isPaid || currentOrder.paymentStatus === 'success') && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="customer-form-label" style={{ fontWeight: 750, color: 'var(--color-text-primary)' }}>
                    Thông tin nhận tiền hoàn (100%):
                  </label>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                      Ngân hàng thụ hưởng
                    </label>
                    <select
                      value={refundBank}
                      onChange={(e) => setRefundBank(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        fontWeight: 600,
                      }}
                    >
                      {VIETNAM_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                      Số tài khoản
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập số tài khoản ngân hàng..."
                      value={refundAccountNumber}
                      onChange={(e) => setRefundAccountNumber(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
                      Tên chủ tài khoản
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: NGUYEN VAN A"
                      value={refundAccountHolder}
                      onChange={(e) => setRefundAccountHolder(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: '13.5px',
                        background: '#ffffff',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    />
                  </div>
                </div>
              )}
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
                {isPaid || currentOrder.paymentStatus === 'success' ? 'Xác nhận hủy & Hoàn tiền' : 'Xác nhận hủy đơn'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
