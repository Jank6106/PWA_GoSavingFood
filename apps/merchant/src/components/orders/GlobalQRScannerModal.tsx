import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Flashlight,
  Keyboard,
  RefreshCw,
  ShoppingBag,
  X,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { MerchantOrder } from '../../types';
import { Button, Field } from '../ui';

interface GlobalQRScannerModalProps {
  open: boolean;
  onClose: () => void;
  allOrders: MerchantOrder[];
  onCompleteQR: (orderId: string, code: string) => Promise<boolean>;
  onOpenOrderDetails?: (order: MerchantOrder) => void;
}

function playScanBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function GlobalQRScannerModal({
  open,
  onClose,
  allOrders,
  onCompleteQR,
  onOpenOrderDetails,
}: GlobalQRScannerModalProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [matchedOrder, setMatchedOrder] = useState<MerchantOrder | null>(null);
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Camera states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isStoppingRef = useRef(false);
  const containerId = 'merchant-banking-scanner-viewport';

  // Dừng camera và giải phóng MediaStreamTrack triệt để
  const stopScanner = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      // 1. Tắt trực tiếp tất cả MediaStreamTrack của video element để đèn camera tắt ngay lập tức
      const container = document.getElementById(containerId);
      if (container) {
        const videos = container.querySelectorAll('video');
        videos.forEach((video) => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
              track.stop();
            });
            video.srcObject = null;
          }
        });
      }

      // 2. Dừng scanner instance
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.warn('Lỗi khi dừng camera:', err);
    } finally {
      setIsStarted(false);
      setIsTorchOn(false);
      isStoppingRef.current = false;
    }
  };

  const resetScan = () => {
    setScannedCode('');
    setMatchedOrder(null);
    setNotFoundCode(null);
    setIsDone(false);
  };

  const handleClose = async () => {
    await stopScanner();
    resetScan();
    setManualCode('');
    setMode('camera');
    onClose();
  };

  const handleProcessCode = (code: string) => {
    const raw = code.trim();
    if (!raw) return;

    setScannedCode(raw);
    const clean = raw.toLowerCase();

    // Tìm đơn hàng trùng khớp
    const match = allOrders.find((o) => {
      const oCode = o.orderCode.toLowerCase();
      const qCode = (o.qrCode || '').toLowerCase();
      const oId = o.id.toLowerCase();
      const pToken = (o.pickupToken || '').toLowerCase();
      return (
        (pToken && pToken === clean) ||
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

  // Khởi động Camera khi modal mở và chưa có đơn quét trúng
  useEffect(() => {
    if (!open || mode !== 'camera' || matchedOrder || notFoundCode) {
      void stopScanner();
      return;
    }

    let isMounted = true;
    const startScanner = async () => {
      try {
        setCameraError(null);
        await stopScanner();

        // Tạo instance mới
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 270, height: 270 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode },
          config,
          (decodedText) => {
            if (!isMounted || !decodedText) return;

            // Rung nhẹ 200ms chuẩn app ngân hàng
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try {
                navigator.vibrate(200);
              } catch (err) {
                void err;
              }
            }
            playScanBeep();

            // Tạm dừng camera ngay lập tức để tránh quét lặp lại
            void stopScanner();

            // Xử lý mã
            handleProcessCode(decodedText);
          },
          () => {
            // Frame không chứa mã
          }
        );

        if (isMounted) {
          setIsStarted(true);
          try {
            const capabilities = scanner.getRunningTrackCapabilities?.() as
              | MediaTrackCapabilities
              | undefined;
            if (capabilities && 'torch' in capabilities) {
              setHasTorch(true);
            } else {
              setHasTorch(false);
            }
          } catch {
            setHasTorch(false);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setCameraError(
            'Chưa cấp quyền truy cập Camera. Vui lòng cấp quyền trong cài đặt trình duyệt để quét mã.'
          );
        } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
          setCameraError('Không tìm thấy Camera trên thiết bị của bạn.');
        } else {
          setCameraError(
            'Không thể kết nối Camera. Bạn có thể sử dụng nút "Nhập mã đơn thủ công" bên dưới.'
          );
        }
        setIsStarted(false);
      }
    };

    const timer = setTimeout(() => {
      void startScanner();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      void stopScanner();
    };
  }, [open, mode, facingMode, matchedOrder, notFoundCode]);

  // Bật/tắt đèn Flash
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setIsTorchOn(nextTorch);
    } catch {
      // Flashlight không hỗ trợ ở chế độ hiện tại
    }
  };

  // Đổi camera trước/sau
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleConfirmDeliver = async () => {
    if (!matchedOrder) return;
    setIsProcessing(true);
    try {
      const ok = await onCompleteQR(matchedOrder.id, scannedCode || matchedOrder.orderCode);
      if (ok) {
        setIsDone(true);
        setTimeout(() => {
          void handleClose();
        }, 1500);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="merchant-banking-scanner-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Quét mã QR nhận hàng"
    >
      {/* 1. LỚP VIDEO NỀN (Camera Feed phủ toàn màn hình) */}
      <div id={containerId} className="merchant-banking-video-feed" />

      {/* 2. LỚP OVERLAY KHUNG NGẮM (Viewfinder chuẩn phong cách App Ngân hàng) */}
      {!matchedOrder && !notFoundCode && mode === 'camera' && !cameraError && (
        <div className="merchant-banking-viewfinder-layer">
          <div className="merchant-banking-reticle">
            {/* 4 góc bo viền neon định vị */}
            <span className="reticle-corner reticle-corner--tl" />
            <span className="reticle-corner reticle-corner--tr" />
            <span className="reticle-corner reticle-corner--bl" />
            <span className="reticle-corner reticle-corner--br" />
            {/* Tia quét laser chuyển động */}
            {isStarted && <div className="merchant-banking-laser" />}
          </div>
        </div>
      )}

      {/* 3. THANH CÔNG CỤ TRÊN CÙNG (Top Bar trong suốt) */}
      <header className="merchant-banking-top-bar">
        <button
          type="button"
          onClick={handleClose}
          className="merchant-banking-round-btn"
          aria-label="Đóng camera"
          title="Đóng camera (Esc)"
        >
          <X size={20} />
        </button>

        <h1 className="merchant-banking-header-title">Quét mã nhận hàng</h1>

        <div className="merchant-banking-top-actions">
          {hasTorch && mode === 'camera' && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`merchant-banking-round-btn ${isTorchOn ? 'is-active' : ''}`}
              aria-label={isTorchOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'}
              title="Đèn Flash"
            >
              <Flashlight size={19} />
            </button>
          )}

          {mode === 'camera' && (
            <button
              type="button"
              onClick={toggleFacingMode}
              className="merchant-banking-round-btn"
              aria-label="Đổi camera"
              title="Đổi camera trước/sau"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Lỗi Camera */}
      {cameraError && !matchedOrder && !notFoundCode && (
        <div className="merchant-banking-error-banner">
          <AlertTriangle size={32} />
          <p>{cameraError}</p>
          <div className="merchant-banking-error-actions">
            <Button
              size="small"
              variant="outline"
              onClick={() => {
                setCameraError(null);
                setFacingMode((f) => f);
              }}
            >
              <RefreshCw size={14} /> Thử lại Camera
            </Button>
            <Button size="small" variant="primary" onClick={() => setMode('manual')}>
              <Keyboard size={14} /> Nhập mã thủ công
            </Button>
          </div>
        </div>
      )}

      {/* Chế độ nhập mã đơn thủ công / Giả lập */}
      {mode === 'manual' && !matchedOrder && !notFoundCode && (
        <div className="merchant-banking-manual-card">
          <h3 style={{ margin: '0 0 14px' }}>Nhập mã đơn hàng</h3>

          <Field
            label="Mã đơn hàng"
            placeholder="Ví dụ: GSF-102948"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleProcessCode(manualCode);
              }
            }}
            autoFocus
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Button
              type="button"
              fullWidth
              disabled={!manualCode.trim()}
              onClick={() => handleProcessCode(manualCode)}
            >
              Kiểm tra & Xác thực mã
            </Button>
          </div>
        </div>
      )}

      {/* 4. KHU VỰC HƯỚNG DẪN DƯỚI ĐÁY (Bottom Bar) */}
      {!matchedOrder && !notFoundCode && (
        <footer className="merchant-banking-bottom-bar">
          <p className="merchant-banking-guidance">
            Di chuyển camera đến mã QR của khách hàng để nhận diện
          </p>
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === 'camera' ? 'manual' : 'camera'));
              setCameraError(null);
            }}
            className="merchant-banking-switch-mode-btn"
          >
            <Keyboard size={15} />
            <span>{mode === 'camera' ? 'Nhập mã đơn thủ công' : 'Chuyển sang Quét Camera'}</span>
          </button>
        </footer>
      )}

      {/* 5. BOTTOM SHEET XÁC NHẬN ĐƠN HÀNG (Khi quét trúng mã) */}
      {matchedOrder && (
        <div className="merchant-banking-sheet-backdrop">
          <div className="merchant-banking-bottom-sheet">
            {isDone ? (
              <div className="merchant-banking-success-view">
                <div className="success-icon-ring">
                  <CheckCircle2 size={54} color="#00e676" />
                </div>
                <h2>Xác nhận bàn giao thành công!</h2>
                <p>Đơn hàng #{matchedOrder.orderCode} đã hoàn tất trao món cho khách.</p>
              </div>
            ) : (
              <>
                <div className="merchant-banking-sheet-header">
                  <h2 className="order-code-title">Đơn hàng #{matchedOrder.orderCode}</h2>
                </div>

                <div className="merchant-banking-sheet-details">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <ShoppingBag size={18} className="detail-icon" style={{ marginTop: 0 }} />
                      <strong
                        style={{
                          fontSize: 15.5,
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                        }}
                      >
                        {matchedOrder.quantity}× {matchedOrder.bagName}
                      </strong>
                    </div>
                    <span
                      className="price-tag"
                      style={{
                        fontSize: 16.5,
                        fontWeight: 800,
                        color: '#008751',
                        flexShrink: 0,
                        marginTop: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {matchedOrder.price.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>

                <div className="merchant-banking-sheet-actions">
                  <Button
                    type="button"
                    variant="primary"
                    size="large"
                    fullWidth
                    loading={isProcessing}
                    onClick={handleConfirmDeliver}
                    style={{
                      background: 'linear-gradient(135deg, #008751 0%, #005639 100%)',
                      fontSize: 15,
                      fontWeight: 800,
                      padding: '14px 20px',
                    }}
                  >
                    <Check size={18} /> Bàn giao món cho khách
                  </Button>

                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <Button
                      type="button"
                      variant="outline"
                      style={{ flex: 1 }}
                      onClick={() => {
                        resetScan();
                        setMode('camera');
                      }}
                    >
                      Quét mã khác
                    </Button>
                    {onOpenOrderDetails && (
                      <Button
                        type="button"
                        variant="outline"
                        style={{ flex: 1 }}
                        onClick={() => {
                          onOpenOrderDetails(matchedOrder);
                          void handleClose();
                        }}
                      >
                        Chi tiết
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 6. BOTTOM SHEET BÁO LỖI KHÔNG TÌM THẤY ĐƠN HÀNG */}
      {notFoundCode && !matchedOrder && (
        <div className="merchant-banking-sheet-backdrop">
          <div className="merchant-banking-bottom-sheet merchant-banking-bottom-sheet--error">
            <div className="error-icon-circle">
              <AlertTriangle size={32} />
            </div>
            <h2>Không tìm thấy đơn hàng</h2>
            <p>
              Mã vừa nhận: <code>{notFoundCode}</code> không trùng khớp với bất kỳ đơn hàng nào của
              quán hôm nay.
            </p>

            <div className="merchant-banking-sheet-actions">
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() => {
                  resetScan();
                  setMode('camera');
                }}
              >
                <RefreshCw size={15} /> Quét lại mã khác
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => {
                  resetScan();
                  setMode('manual');
                }}
              >
                <Keyboard size={15} /> Thử nhập mã tay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
