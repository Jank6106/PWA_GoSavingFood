import { playScanBeep, triggerHaptic } from '../../utils/feedback';
import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Flashlight, RefreshCw } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '../ui';

interface CameraQRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isScanning?: boolean;
}

export function CameraQRScanner({
  onScanSuccess,
  isScanning = true,
}: CameraQRScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasDetectedRef = useRef(false);
  const containerId = 'merchant-qr-camera-feed';

  useEffect(() => {
    let isMounted = true;
    hasDetectedRef.current = false;

    const startScanner = async () => {
      try {
        setCameraError(null);
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(containerId, {
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            verbose: false,
          });
        }

        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          await scanner.stop();
        }

        const config = {
          fps: 12,
          qrbox: { width: 230, height: 230 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode },
          config,
          (decodedText) => {
            if (!isMounted || hasDetectedRef.current) return;
            hasDetectedRef.current = true;
            playScanBeep();
            triggerHaptic();
            onScanSuccess(decodedText);
          },
          () => {
            // Frame scanned, no QR found in this frame
          }
        );

        if (isMounted) {
          setIsStarted(true);
          try {
            // Check torch capability
            const capabilities = scanner.getRunningTrackCapabilities?.() as MediaTrackCapabilities | undefined;
            if (capabilities && 'torch' in capabilities) {
              setHasTorch(true);
            }
          } catch {
            setHasTorch(false);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setCameraError('Chưa cấp quyền truy cập Camera. Vui lòng cho phép quyền Camera trong cài đặt trình duyệt.');
        } else if (msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')) {
          setCameraError('Không tìm thấy Camera trên thiết bị.');
        } else {
          setCameraError('Không thể khởi động Camera. Bạn có thể sử dụng tab Nhập mã thủ công.');
        }
        setIsStarted(false);
      }
    };

    if (isScanning) {
      void startScanner();
    }

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
      }
    };
  }, [facingMode, isScanning, onScanSuccess]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as MediaTrackConstraintSet],
      });
      setIsTorchOn(nextTorch);
    } catch {
      // Torch toggle failed
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="merchant-camera-scanner-wrapper">
      <div className="merchant-camera-viewport">
        <div id={containerId} className="merchant-camera-feed" />
        {isStarted && !cameraError && (
          <div className="merchant-camera-overlay">
            <div className="merchant-camera-reticle">
              <div className="merchant-scan-line" />
            </div>
            <p className="merchant-camera-hint">Căn chỉnh mã QR của khách vào khung</p>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="merchant-camera-error">
          <CameraOff size={32} />
          <p>{cameraError}</p>
          <Button
            size="small"
            variant="outline"
            onClick={() => {
              setCameraError(null);
              setFacingMode((f) => f);
            }}
          >
            <RefreshCw size={15} /> Thử lại Camera
          </Button>
        </div>
      )}

      {isStarted && !cameraError && (
        <div className="merchant-camera-controls">
          <button
            type="button"
            className="merchant-camera-btn"
            onClick={switchCamera}
            title="Đổi camera trước/sau"
          >
            <Camera size={17} />
            <span>Đổi camera</span>
          </button>
          {hasTorch && (
            <button
              type="button"
              className={`merchant-camera-btn ${isTorchOn ? 'is-active' : ''}`}
              onClick={toggleTorch}
              title="Bật/tắt đèn flash"
            >
              <Flashlight size={17} />
              <span>{isTorchOn ? 'Tắt Flash' : 'Bật Flash'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
