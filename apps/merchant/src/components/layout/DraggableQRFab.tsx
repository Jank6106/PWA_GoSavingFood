import { useState, useEffect, useRef } from 'react';
import { QrCode } from 'lucide-react';

interface DraggableQRFabProps {
  onClick: () => void;
}

const BUTTON_SIZE = 52; // 52px diameter circle
const MARGIN_X = 12; // 12px from left/right edge
const TOP_BOUND = 70; // 70px below top header
const BOTTOM_BOUND = 80; // 80px above bottom tab bar
const STORAGE_KEY = 'gsf_merchant_qr_fab_pos';

export function DraggableQRFab({ onClick }: DraggableQRFabProps) {
  // Tính toán vị trí mặc định góc dưới bên phải
  const getDefaultPos = () => {
    if (typeof window === 'undefined') return { x: 200, y: 500 };
    return {
      x: Math.max(MARGIN_X, window.innerWidth - BUTTON_SIZE - 16),
      y: Math.max(TOP_BOUND, window.innerHeight - BOTTOM_BOUND - 70),
    };
  };

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 200, y: 500 };
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // Clamp vị trí đã lưu vào kích thước màn hình hiện tại
          const clampedX = Math.max(MARGIN_X, Math.min(window.innerWidth - BUTTON_SIZE - MARGIN_X, parsed.x));
          const clampedY = Math.max(TOP_BOUND, Math.min(window.innerHeight - BOTTOM_BOUND, parsed.y));
          return { x: clampedX, y: clampedY };
        }
      }
    } catch  { /* Best-effort browser storage/cleanup; failure must not block the UI. */ }
    return getDefaultPos();
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);

  const startPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const isDraggingRef = useRef(false);

  // Giữ vị trí an toàn khi resize hoặc xoay màn hình thiết bị
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const isLeftSide = prev.x + BUTTON_SIZE / 2 < window.innerWidth / 2;
        const newX = isLeftSide ? MARGIN_X : Math.max(MARGIN_X, window.innerWidth - BUTTON_SIZE - MARGIN_X);
        const newY = Math.max(TOP_BOUND, Math.min(window.innerHeight - BOTTOM_BOUND, prev.y));
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Chỉ kích hoạt khi nhấn chuột trái hoặc ngón tay chạm
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { ...position };
    hasMovedRef.current = false;
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsSnapping(false);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch  { /* Best-effort browser storage/cleanup; failure must not block the UI. */ }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - startPointerRef.current.x;
    const deltaY = e.clientY - startPointerRef.current.y;
    const dist = Math.hypot(deltaX, deltaY);

    if (dist > 6) {
      hasMovedRef.current = true;
    }

    // Tính toán tọa độ mới và clamp trong vùng an toàn
    const rawX = startPosRef.current.x + deltaX;
    const rawY = startPosRef.current.y + deltaY;

    const clampedX = Math.max(MARGIN_X, Math.min(window.innerWidth - BUTTON_SIZE - MARGIN_X, rawX));
    const clampedY = Math.max(TOP_BOUND, Math.min(window.innerHeight - BOTTOM_BOUND, rawY));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch  { /* Best-effort browser storage/cleanup; failure must not block the UI. */ }

    // 1. Nếu không di chuyển (> 6px) -> Tính là TAP/CLICK -> Kích hoạt mở camera QR
    if (!hasMovedRef.current) {
      onClick();
      return;
    }

    // 2. Nếu đã kéo thả -> Tự động hít dạt về mép gần nhất (Snap to Edge - AssistiveTouch style)
    const isLeftSide = position.x + BUTTON_SIZE / 2 < window.innerWidth / 2;
    const snapX = isLeftSide ? MARGIN_X : window.innerWidth - BUTTON_SIZE - MARGIN_X;
    const snapY = Math.max(TOP_BOUND, Math.min(window.innerHeight - BOTTOM_BOUND, position.y));

    setIsSnapping(true);
    setPosition({ x: snapX, y: snapY });

    // Lưu tọa độ hít viền vào localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: snapX, y: snapY }));
    } catch  { /* Best-effort browser storage/cleanup; failure must not block the UI. */ }

    setTimeout(() => {
      setIsSnapping(false);
    }, 300);
  };

  return (
    <button
      type="button"
      className={`merchant-draggable-qr-fab ${isDragging ? 'is-dragging' : ''} ${isSnapping ? 'is-snapping' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label="Quét mã QR bàn giao đơn"
      title="Quét mã QR nhận hàng (Kéo thả tự do bằng tay)"
    >
      <QrCode size={25} strokeWidth={2.3} />
    </button>
  );
}
