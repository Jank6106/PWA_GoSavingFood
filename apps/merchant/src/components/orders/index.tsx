import { Check, Clock3, FileSearch, Phone, QrCode, Search, WalletCards, XCircle } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import type { MerchantOrder, OrderStatus, OrderStatusFilter, OrderSummaryMetrics } from '../../types';
import { Button, Field, Modal } from '../ui';

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

interface OrderActions { onConfirm: (id: string) => void; onFinishPreparation: (id: string) => void; onCancel: (id: string) => void; onOpenQR: (order: MerchantOrder) => void; onOpenDetails: (order: MerchantOrder) => void; }
export function OrderCard({ order, onConfirm, onFinishPreparation, onCancel, onOpenQR, onOpenDetails }: { order: MerchantOrder } & OrderActions) { return <article className="merchant-card merchant-order-card"><div className="merchant-order-card-head"><div><span>{order.orderCode}</span><small>{new Date(order.placedAt).toLocaleDateString('vi-VN')}</small></div><OrderStatusBadge status={order.status} /></div><div className="merchant-order-customer"><span>{order.customerName.slice(0, 1)}</span><div><strong>{order.customerName}</strong><small><Phone size={13} />{order.customerPhone}</small></div></div><div className="merchant-order-product"><img src={order.imageUrl} alt="" /><div><strong>{order.quantity}× {order.bagName}</strong><span>{order.price.toLocaleString('vi-VN')}đ</span><small><Clock3 size={13} /> {order.pickupTime}</small></div></div>{order.note && <p className="merchant-order-note">Ghi chú: {order.note}</p>}<footer><Button size="small" variant="ghost" onClick={() => onOpenDetails(order)}>Xem chi tiết</Button><div>{order.status !== 'completed' && order.status !== 'cancelled' && <Button size="small" variant="danger" onClick={() => onCancel(order.id)}><XCircle size={15} /> Hủy</Button>}{order.status === 'pending' && <Button size="small" onClick={() => onConfirm(order.id)}><Check size={15} /> Xác nhận</Button>}{order.status === 'processing' && <Button size="small" onClick={() => onFinishPreparation(order.id)}>Chuẩn bị xong</Button>}{order.status === 'confirmed' && <Button size="small" onClick={() => onOpenQR(order)}><QrCode size={15} /> Quét QR</Button>}</div></footer></article>; }

const formatDateTime = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa thanh toán';
export function OrderDetailsModal({ order, open, onClose, actions }: { order: MerchantOrder | null; open: boolean; onClose: () => void; actions: Omit<OrderActions, 'onOpenDetails'> }) { if (!order) return null; return <Modal open={open} title={`Đơn ${order.orderCode}`} description="Thông tin chi tiết đơn hàng" onClose={onClose}><div className="merchant-order-detail-head"><div><span>{order.customerName.slice(0, 1)}</span><div><strong>{order.customerName}</strong><small>{order.customerPhone}</small></div></div><OrderStatusBadge status={order.status} /></div><dl className="merchant-detail-list"><div><dt>Sản phẩm</dt><dd>{order.quantity}× {order.bagName}</dd></div><div><dt>Thời gian đặt</dt><dd><Clock3 size={14} /> {formatDateTime(order.placedAt)}</dd></div><div><dt>Thời gian thanh toán</dt><dd><WalletCards size={14} /> {formatDateTime(order.paidAt)}</dd></div><div><dt>Khung giờ nhận</dt><dd>{order.pickupTime}</dd></div><div><dt>Tổng thanh toán</dt><dd>{order.price.toLocaleString('vi-VN')}đ</dd></div>{order.note && <div><dt>Ghi chú</dt><dd>{order.note}</dd></div>}</dl><div className="merchant-form-actions">{order.status === 'pending' && <Button onClick={() => actions.onConfirm(order.id)}>Xác nhận đơn</Button>}{order.status === 'processing' && <Button onClick={() => actions.onFinishPreparation(order.id)}>Hoàn tất chuẩn bị</Button>}{order.status === 'confirmed' && <Button onClick={() => actions.onOpenQR(order)}><QrCode size={16} /> Quét QR</Button>}{!['completed', 'cancelled'].includes(order.status) && <Button variant="danger" onClick={() => actions.onCancel(order.id)}>Hủy đơn</Button>}</div></Modal>; }

export function QRScannerModal({ order, open, saving, onClose, onCompleteQR }: { order: MerchantOrder | null; open: boolean; saving: boolean; onClose: () => void; onCompleteQR: (id: string, code: string) => Promise<boolean> }) { const [code, setCode] = useState(''); const [error, setError] = useState(''); if (!order) return null; const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); if (!await onCompleteQR(order.id, code)) setError('Mã QR không khớp với đơn hàng này.'); }; return <Modal open={open} title="Xác nhận bằng QR" description={`Đơn ${order.orderCode}`} onClose={onClose} size="small"><form className="merchant-qr-form" onSubmit={submit}><div className="merchant-qr-simulator" onClick={() => setCode(order.qrCode || order.orderCode)} style={{ cursor: 'pointer' }} title="Bấm để giả lập quét mã QR này"><QrCode size={82} /><span>Đưa mã QR của khách vào vùng quét (hoặc bấm để giả lập)</span></div><div className="merchant-divider"><span>hoặc nhập mã thủ công</span></div><Field label="Mã xác nhận" value={code} onChange={(event) => setCode(event.target.value)} placeholder={order.qrCode} error={error} required /><Button type="submit" fullWidth loading={saving}>Hoàn thành đơn hàng</Button></form></Modal>; }
export const OrdersEmptyIcon = FileSearch;
