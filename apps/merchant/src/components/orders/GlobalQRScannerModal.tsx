import { useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, KeyRound, QrCode, RefreshCw, ShoppingBag, User, Phone, ArrowRight } from 'lucide-react';
import type { MerchantOrder } from '../../types';
import { Button, Field, Modal } from '../ui';
import { CameraQRScanner } from './CameraQRScanner';
import { OrderStatusBadge } from './index';

interface GlobalQRScannerModalProps {
  open: boolean;
  onClose: () => void;
  allOrders: MerchantOrder[];
  onCompleteQR: (orderId: string, code: string) => Promise<boolean>;
  onOpenOrderDetails?: (order: MerchantOrder) => void;
}

export function GlobalQRScannerModal({
  open,
  onClose,
  allOrders,
  onCompleteQR,
  onOpenOrderDetails,
}: GlobalQRScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [matchedOrder, setMatchedOrder] = useState<MerchantOrder | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const resetScan = () => {
    setScannedCode('');
    setMatchedOrder(null);
    setNotFoundCode(null);
    setIsDone(false);
  };

  const handleClose = () => {
    resetScan();
    setManualCode('');
    onClose();
  };

  const handleProcessCode = (code: string) => {
    const raw = code.trim();
    if (!raw) return;

    setScannedCode(raw);
    const clean = raw.toLowerCase();

    // Look for matching order
    const match = allOrders.find((o) => {
      const oCode = o.orderCode.toLowerCase();
      const qCode = (o.qrCode || '').toLowerCase();
      const oId = o.id.toLowerCase();
      return (
        oCode === clean ||
        qCode === clean ||
        oId === clean ||
        clean.includes(oCode) ||
        (qCode && clean.includes(qCode)) ||
        (clean.length >= 4 && oCode.includes(clean))
      );
    });

    if (match) {
      setMatchedOrder(match);
      setNotFoundCode(null);
    } else {
      setMatchedOrder(null);
      setNotFoundCode(raw);
    }
  };

  const handleConfirmDeliver = async () => {
    if (!matchedOrder) return;
    setIsProcessing(true);
    try {
      const ok = await onCompleteQR(matchedOrder.id, scannedCode || matchedOrder.orderCode);
      if (ok) {
        setIsDone(true);
        setTimeout(() => {
          handleClose();
        }, 1600);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Quét mã QR nhận hàng"
      description="Quét mã QR trên điện thoại của khách hàng hoặc nhập mã đơn hàng"
      onClose={handleClose}
      size="small"
    >
      <div className="merchant-qr-modal-content">
        {!matchedOrder && !notFoundCode && (
          <div className="merchant-qr-tab-nav">
            <button
              type="button"
              className={activeTab === 'camera' ? 'is-active' : ''}
              onClick={() => setActiveTab('camera')}
            >
              <Camera size={15} /> Quét bằng Camera
            </button>
            <button
              type="button"
              className={activeTab === 'manual' ? 'is-active' : ''}
              onClick={() => setActiveTab('manual')}
            >
              <KeyRound size={15} /> Nhập mã / Giả lập
            </button>
          </div>
        )}

        {/* 1. Camera Scanning Mode */}
        {!matchedOrder && !notFoundCode && activeTab === 'camera' && (
          <div>
            <CameraQRScanner
              isScanning={open && activeTab === 'camera' && !matchedOrder && !notFoundCode}
              onScanSuccess={(decoded) => handleProcessCode(decoded)}
            />
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <small style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                * Hỗ trợ quét trực tiếp qua camera điện thoại / máy tính bảng hoặc webcam
              </small>
            </div>
          </div>
        )}

        {/* 2. Manual / Simulator Mode */}
        {!matchedOrder && !notFoundCode && activeTab === 'manual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {allOrders.filter((o) => ['confirmed', 'processing', 'pending'].includes(o.status)).length > 0 && (
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Bấm nhanh đơn đang chờ để giả lập:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {allOrders
                    .filter((o) => ['confirmed', 'processing', 'pending'].includes(o.status))
                    .slice(0, 4)
                    .map((o) => (
                      <button
                        type="button"
                        key={o.id}
                        className="merchant-quick-code-chip"
                        onClick={() => {
                          setManualCode(o.orderCode);
                          handleProcessCode(o.orderCode);
                        }}
                      >
                        <QrCode size={13} /> {o.orderCode} ({o.customerName})
                      </button>
                    ))}
                </div>
              </div>
            )}

            <Field
              label="Mã đơn hàng hoặc mã QR"
              placeholder="Ví dụ: GSF-102948"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleProcessCode(manualCode);
                }
              }}
            />
            <Button
              type="button"
              fullWidth
              disabled={!manualCode.trim()}
              onClick={() => handleProcessCode(manualCode)}
            >
              Kiểm tra & Xác thực mã
            </Button>
          </div>
        )}

        {/* 3. Not Found State */}
        {notFoundCode && !matchedOrder && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#fef2f2',
                color: '#dc2626',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 12px',
              }}
            >
              <AlertTriangle size={28} />
            </div>
            <strong style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>
              Không tìm thấy đơn hàng
            </strong>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Mã vừa quét: <code style={{ fontWeight: 800, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{notFoundCode}</code> không trùng khớp với bất kỳ đơn hàng nào của quán hôm nay.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="outline" fullWidth onClick={resetScan}>
                <RefreshCw size={15} /> Quét lại mã khác
              </Button>
            </div>
          </div>
        )}

        {/* 4. Matched Order Preview */}
        {matchedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isDone ? (
              <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                <CheckCircle2 size={54} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                <strong style={{ fontSize: 18, color: '#16a34a', display: 'block' }}>
                  Xác nhận giao hàng thành công!
                </strong>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Đơn hàng {matchedOrder.orderCode} đã hoàn tất.
                </p>
              </div>
            ) : (
              <>
                <div className="merchant-matched-order-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <QrCode size={18} color="var(--primary)" />
                      <strong style={{ fontSize: 16 }}>{matchedOrder.orderCode}</strong>
                    </div>
                    <OrderStatusBadge status={matchedOrder.status} />
                  </div>

                  <hr style={{ border: 0, borderTop: '1px dashed #e2e8f0', margin: '10px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={15} color="var(--text-secondary)" />
                      <span><b>{matchedOrder.customerName}</b></span>
                    </div>
                    {matchedOrder.customerPhone && matchedOrder.customerPhone !== 'Chưa cập nhật' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={15} color="var(--text-secondary)" />
                        <a href={`tel:${matchedOrder.customerPhone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                          {matchedOrder.customerPhone}
                        </a>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShoppingBag size={15} color="var(--text-secondary)" />
                      <span>{matchedOrder.quantity}× {matchedOrder.bagName}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 10px',
                      background: '#fff',
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tổng thu tiền:</span>
                    <span style={{ fontSize: 15, color: 'var(--primary)' }}>
                      {matchedOrder.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                {matchedOrder.status === 'completed' && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: 13 }}>
                    ✓ Đơn hàng này đã được bàn giao và hoàn tất trước đó.
                  </div>
                )}

                {matchedOrder.status === 'cancelled' && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 13 }}>
                    ✕ Đơn hàng này đã bị hủy, không thể giao món.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {['confirmed', 'processing', 'pending'].includes(matchedOrder.status) && (
                    <Button
                      type="button"
                      fullWidth
                      loading={isProcessing}
                      onClick={handleConfirmDeliver}
                    >
                      <CheckCircle2 size={17} /> Xác nhận giao món (Hoàn thành)
                    </Button>
                  )}

                  {onOpenOrderDetails && (
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      onClick={() => {
                        handleClose();
                        onOpenOrderDetails(matchedOrder);
                      }}
                    >
                      Xem chi tiết đơn hàng <ArrowRight size={14} />
                    </Button>
                  )}

                  <Button type="button" variant="secondary" fullWidth onClick={resetScan}>
                    Quét đơn khác
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
