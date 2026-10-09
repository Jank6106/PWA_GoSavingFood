import { AlertTriangle, Camera, Check, Clock3, Copy, FileSearch, KeyRound, Phone, Printer, QrCode, Search, WalletCards, XCircle } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import type { MerchantOrder, OrderStatus, OrderStatusFilter, OrderSummaryMetrics } from '../../types';
import { optimizeImageUrl } from '../../services/utils';
import { Button, Field, Modal, SelectField, TextAreaField } from '../ui';
import { CameraQRScanner } from './CameraQRScanner';

const statusMeta: Record<OrderStatus, { label: string; className: string }> = { pending: { label: 'Chờ xác nhận', className: 'pending' }, processing: { label: 'Đang xử lý', className: 'processing' }, confirmed: { label: 'Chờ lấy hàng', className: 'confirmed' }, completed: { label: 'Hoàn thành', className: 'completed' }, cancelled: { label: 'Đã hủy', className: 'cancelled' } };
export function OrderStatusBadge({ status }: { status: OrderStatus }) { const meta = statusMeta[status]; return <span className={`merchant-order-status merchant-order-status--${meta.className}`}>{meta.label}</span>; }

export function OrderFilterBar({ statusFilter, searchQuery, summary, onStatusFilterChange, onSearchQueryChange }: { statusFilter: OrderStatusFilter; searchQuery: string; summary: OrderSummaryMetrics; onStatusFilterChange: (status: OrderStatusFilter) => void; onSearchQueryChange: (value: string) => void }) {
  const chipsRef = useRef<HTMLDivElement>(null);
  const filters: Array<{ key: OrderStatusFilter; label: string; count: number }> = [
    { key: 'all', label: 'Tất cả', count: summary.pending + summary.processing + summary.confirmed },
    { key: 'pending', label: 'Chờ xác nhận', count: summary.pending },
    { key: 'processing', label: 'Đang xử lý', count: summary.processing },
    { key: 'confirmed', label: 'Chờ lấy', count: summary.confirmed },
    { key: 'completed', label: 'Hoàn thành', count: summary.completed },
    { key: 'cancelled', label: 'Đã hủy', count: summary.cancelled }
  ];
  return (
    <div className="merchant-order-filters">
      <div className="merchant-summary-strip">
        {filters.slice(0, 4).map((item) => (
          <div key={item.key}>
            <strong>{item.count}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div className="merchant-filter-row">
        <label className="merchant-search">
          <Search size={19} />
          <input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm mã đơn hoặc khách hàng..." />
        </label>
        <div ref={chipsRef} className="merchant-filter-chips">
          {filters.map((item) => (
            <button
              type="button"
              key={item.key}
              className={statusFilter === item.key ? 'is-active' : ''}
              onClick={(e) => {
                onStatusFilterChange(item.key);
                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
              }}
            >
              {item.label} <b>{item.count}</b>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface OrderActions {
  onConfirm: (id: string) => void;
  onFinishPreparation: (id: string) => void;
  onCancelRequest: (order: MerchantOrder) => void;
  onOpenQR: (order: MerchantOrder) => void;
  onOpenDetails: (order: MerchantOrder) => void;
  onCopyCode?: (code: string) => void;
}

export function OrderCard({
  order,
  onConfirm,
  onFinishPreparation,
  onCancelRequest,
  onOpenQR,
  onOpenDetails,
  onCopyCode,
}: { order: MerchantOrder } & OrderActions) {
  return (
    <article className="merchant-card merchant-order-card">
      <div className="merchant-order-card-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{order.orderCode}</span>
            {onCopyCode && (
              <button
                type="button"
                className="merchant-copy-icon-btn"
                title="Sao chép mã đơn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyCode(order.orderCode);
                }}
              >
                <Copy size={13} />
              </button>
            )}
          </div>
          <small>{new Date(order.placedAt).toLocaleDateString('vi-VN')}</small>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="merchant-order-customer">
        <span>{order.customerName.slice(0, 1)}</span>
        <div>
          <strong>{order.customerName}</strong>
          {order.customerPhone && order.customerPhone !== 'Chưa cập nhật' ? (
            <a
              href={`tel:${order.customerPhone}`}
              className="merchant-phone-link"
              title="Gọi điện cho khách hàng"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone size={12} /> {order.customerPhone}
            </a>
          ) : (
            <small><Phone size={12} /> Chưa cập nhật SĐT</small>
          )}
        </div>
      </div>
      <div className="merchant-order-product">
        <img src={optimizeImageUrl(order.imageUrl, 200, 75)} alt="" loading="lazy" />
        <div>
          <strong>{order.quantity}× {order.bagName}</strong>
          <span>{order.price.toLocaleString('vi-VN')}đ</span>
          <small><Clock3 size={13} /> {order.pickupTime}</small>
        </div>
      </div>
      {order.note && <p className="merchant-order-note">Ghi chú: {order.note}</p>}
      <footer>
        <Button size="small" variant="ghost" onClick={() => onOpenDetails(order)}>Xem chi tiết</Button>
        <div>
          {order.status !== 'completed' && order.status !== 'cancelled' && (
            <Button size="small" variant="danger" onClick={() => onCancelRequest(order)}>
              <XCircle size={15} /> Hủy
            </Button>
          )}
          {order.status === 'pending' && (
            <Button size="small" onClick={() => onConfirm(order.id)}>
              <Check size={15} /> Xác nhận
            </Button>
          )}
          {order.status === 'processing' && (
            <Button size="small" onClick={() => onFinishPreparation(order.id)}>
              Chuẩn bị xong
            </Button>
          )}
          {order.status === 'confirmed' && (
            <Button size="small" onClick={() => onOpenQR(order)}>
              <QrCode size={15} /> Quét QR
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}

const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa thanh toán';

export function OrderDetailsModal({
  order,
  open,
  onClose,
  actions,
  onCopyReceipt,
}: {
  order: MerchantOrder | null;
  open: boolean;
  onClose: () => void;
  actions: OrderActions;
  onCopyReceipt?: (text: string) => void;
}) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDetails = () => {
    const text = `--- HOÁ ĐƠN GOSAVINGFOOD ---
Mã đơn: ${order.orderCode}
Khách hàng: ${order.customerName}
SĐT: ${order.customerPhone}
Sản phẩm: ${order.quantity}x ${order.bagName}
Khung giờ nhận: ${order.pickupTime}
Tổng tiền: ${order.price.toLocaleString('vi-VN')}đ
Trạng thái: ${statusMeta[order.status]?.label || order.status}
${order.note ? `Ghi chú: ${order.note}` : ''}`;
    onCopyReceipt?.(text);
  };

  return (
    <Modal open={open} title={`Đơn ${order.orderCode}`} description="Thông tin chi tiết đơn hàng" onClose={onClose}>
      <div className="merchant-order-detail-head">
        <div>
          <span>{order.customerName.slice(0, 1)}</span>
          <div>
            <strong>{order.customerName}</strong>
            {order.customerPhone && order.customerPhone !== 'Chưa cập nhật' ? (
              <a href={`tel:${order.customerPhone}`} className="merchant-phone-link" title="Gọi khách hàng">
                <Phone size={13} /> {order.customerPhone}
              </a>
            ) : (
              <small>Chưa cập nhật SĐT</small>
            )}
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0 6px' }}>
        <Button size="small" variant="outline" onClick={handleCopyDetails}>
          <Copy size={14} /> Sao chép đơn
        </Button>
        <Button size="small" variant="outline" onClick={handlePrint}>
          <Printer size={14} /> In phiếu
        </Button>
      </div>

      <dl className="merchant-detail-list">
        <div><dt>Sản phẩm</dt><dd>{order.quantity}× {order.bagName}</dd></div>
        <div><dt>Thời gian đặt</dt><dd><Clock3 size={14} /> {formatDateTime(order.placedAt)}</dd></div>
        <div><dt>Thời gian thanh toán</dt><dd><WalletCards size={14} /> {formatDateTime(order.paidAt)}</dd></div>
        <div><dt>Khung giờ nhận</dt><dd>{order.pickupTime}</dd></div>
        <div><dt>Tổng thanh toán</dt><dd>{order.price.toLocaleString('vi-VN')}đ</dd></div>
        {order.note && <div><dt>Ghi chú</dt><dd>{order.note}</dd></div>}
      </dl>

      <div className="merchant-form-actions">
        {order.status === 'pending' && <Button onClick={() => actions.onConfirm(order.id)}>Xác nhận đơn</Button>}
        {order.status === 'processing' && <Button onClick={() => actions.onFinishPreparation(order.id)}>Hoàn tất chuẩn bị</Button>}
        {order.status === 'confirmed' && <Button onClick={() => actions.onOpenQR(order)}><QrCode size={16} /> Quét QR</Button>}
        {!['completed', 'cancelled'].includes(order.status) && (
          <Button variant="danger" onClick={() => actions.onCancelRequest(order)}>
            Hủy đơn
          </Button>
        )}
      </div>
    </Modal>
  );
}

export function CancelOrderModal({
  order,
  open,
  saving,
  onClose,
  onConfirmCancel,
}: {
  order: MerchantOrder | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirmCancel: (orderId: string, reason: string) => Promise<void>;
}) {
  const [selectedReason, setSelectedReason] = useState('Hết túi thực phẩm / hết hàng hôm nay');
  const [customReason, setCustomReason] = useState('');

  if (!order) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Khác' ? customReason.trim() || 'Lý do khác' : selectedReason;
    await onConfirmCancel(order.id, finalReason);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Xác nhận hủy đơn hàng"
      description={`Mã đơn: ${order.orderCode} · Khách hàng: ${order.customerName}`}
      onClose={onClose}
      size="small"
    >
      <form className="merchant-form" onSubmit={submit}>
        <div style={{ padding: '12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', color: '#9a3412', fontSize: '13px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Hủy đơn sẽ hoàn lại số lượng túi thực phẩm về kệ hàng và gửi thông báo hoàn tiền cho khách.
          </span>
        </div>

        <SelectField
          label="Lý do hủy đơn"
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
        >
          <option value="Hết túi thực phẩm / hết hàng hôm nay">Hết túi thực phẩm / hết hàng hôm nay</option>
          <option value="Khách hàng liên hệ nhờ hủy đơn">Khách hàng liên hệ nhờ hủy đơn</option>
          <option value="Quán gặp sự cố đóng cửa sớm">Quán gặp sự cố đóng cửa sớm</option>
          <option value="Quá giờ lấy hàng khách không đến">Quá giờ lấy hàng khách không đến</option>
          <option value="Khác">Lý do khác (nhập cụ thể)</option>
        </SelectField>

        {selectedReason === 'Khác' && (
          <TextAreaField
            label="Chi tiết lý do hủy"
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder="Nhập lý do hủy cụ thể để lưu lại hệ thống..."
            required
          />
        )}

        <div className="merchant-form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Đóng / Giữ đơn
          </Button>
          <Button type="submit" variant="danger" loading={saving}>
            <XCircle size={16} /> Xác nhận hủy đơn
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function QRScannerModal({
  order,
  open,
  saving,
  onClose,
  onCompleteQR,
}: {
  order: MerchantOrder | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onCompleteQR: (id: string, code: string) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<'camera' | 'manual'>('camera');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  if (!order) return null;

  const handleCameraScan = async (decodedText: string) => {
    setError('');
    setCode(decodedText);
    const ok = await onCompleteQR(order.id, decodedText);
    if (!ok) {
      setError(`Mã QR "${decodedText}" không khớp với đơn hàng này.`);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    const ok = await onCompleteQR(order.id, code);
    if (!ok) {
      setError('Mã QR không khớp với đơn hàng này.');
    }
  };

  const handleClose = () => {
    setError('');
    setCode('');
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Xác nhận bằng QR"
      description={`Đơn ${order.orderCode} · ${order.customerName}`}
      onClose={handleClose}
      size="small"
    >
      <div className="merchant-qr-tab-nav">
        <button
          type="button"
          className={tab === 'camera' ? 'is-active' : ''}
          onClick={() => {
            setTab('camera');
            setError('');
          }}
        >
          <Camera size={15} /> Quét bằng Camera
        </button>
        <button
          type="button"
          className={tab === 'manual' ? 'is-active' : ''}
          onClick={() => {
            setTab('manual');
            setError('');
          }}
        >
          <KeyRound size={15} /> Nhập mã & Giả lập
        </button>
      </div>

      {tab === 'camera' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <CameraQRScanner
            isScanning={open && tab === 'camera'}
            onScanSuccess={handleCameraScan}
          />
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                color: '#dc2626',
                fontSize: 13,
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
              Đưa mã QR trên ứng dụng của khách vào khung camera để hoàn tất
            </small>
          </div>
        </div>
      ) : (
        <form className="merchant-qr-form" onSubmit={submit}>
          <div
            className="merchant-qr-simulator"
            onClick={() => setCode(order.pickupToken || order.qrCode || order.orderCode)}
            style={{ cursor: 'pointer' }}
            title="Bấm để giả lập quét mã QR này"
          >
            <QrCode size={82} />
            <span>
              Đưa mã QR bảo mật của khách vào vùng quét (hoặc <b>bấm vào đây để điền mã giả lập</b>: <code>{order.pickupToken ? `${order.pickupToken.slice(0, 8)}...` : order.orderCode}</code>)
            </span>
          </div>
          <div className="merchant-divider">
            <span>hoặc nhập mã thủ công</span>
          </div>
          <Field
            label="Mã xác nhận bảo mật"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={order.pickupToken || order.orderCode}
            error={error}
            required
          />
          <Button type="submit" fullWidth loading={saving}>
            Hoàn thành đơn hàng
          </Button>
        </form>
      )}
    </Modal>
  );
}

export { GlobalQRScannerModal } from './GlobalQRScannerModal';
export { CameraQRScanner } from './CameraQRScanner';
export const OrdersEmptyIcon = FileSearch;


