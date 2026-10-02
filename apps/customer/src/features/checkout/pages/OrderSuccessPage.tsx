import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@gosavingfood/ui';
import type { Order } from '../../../shared/types/customer.types';

interface OrderSuccessPageProps {
  order: Order;
  onOrders: () => void;
  onHome: () => void;
}

export function OrderSuccessPage({ order, onOrders, onHome }: OrderSuccessPageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!order?.orderCode) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(order.orderCode);
    } else {
      const el = document.createElement('textarea');
      el.value = order.orderCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div
      className="customer-screen customer-success-screen"
      style={{
        minHeight: '100vh',
        padding: '20px 16px 36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'center',
      }}
    >
      {/* Spacer trên để đẩy nội dung nằm ở 2/3 phía trên */}
      <div style={{ flex: '1 1 0', maxHeight: '10vh', minHeight: '16px' }} />

      {/* Khung lớn màu xanh bao quanh toàn bộ thông tin thanh toán */}
      <section
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--color-primary-soft)',
          border: '2px solid var(--color-primary)',
          borderRadius: '24px',
          padding: '40px 24px 32px',
          marginBottom: '28px',
          boxShadow: '0 12px 32px rgba(0, 108, 64, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Biểu tượng dấu tích xanh trên nền tròn trắng */}
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: '#ffffff',
            color: 'var(--color-primary)',
            display: 'grid',
            placeItems: 'center',
            marginBottom: '20px',
            boxShadow: '0 6px 18px rgba(0, 108, 64, 0.14)',
          }}
        >
          <Check size={40} strokeWidth={3} />
        </div>

        {/* Tiêu đề & Số tiền */}
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            margin: '0 0 6px',
          }}
        >
          Thanh toán thành công!
        </h1>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 800,
            color: 'var(--color-primary)',
            margin: '6px 0 24px',
          }}
        >
          {order.finalAmount.toLocaleString('vi-VN')}đ
        </div>

        {/* Thông tin chỉ hiện mã đơn - căn giữa kèm nút sao chép */}
        <div
          style={{
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '1px solid var(--color-border-subtle)',
            fontSize: '15px',
            textAlign: 'center',
          }}
        >
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Mã đơn hàng:
          </span>
          <strong
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '16px',
              letterSpacing: '0.04em',
            }}
          >
            {order.orderCode}
          </strong>
          <button
            type="button"
            className={`customer-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            title="Sao chép mã đơn hàng"
            aria-label="Sao chép mã đơn hàng"
            style={{ marginLeft: '4px' }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </section>

      {/* Nút điều hướng */}
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Nút 1: Xem đơn hàng - màu trắng trong suốt mờ */}
        <Button
          fullWidth
          size="lg"
          className="customer-btn-translucent-white"
          onClick={onOrders}
        >
          Xem đơn hàng
        </Button>

        {/* Nút 2: Tiếp tục khám phá - màu xanh đậm */}
        <Button fullWidth size="lg" onClick={onHome}>
          Tiếp tục khám phá
        </Button>
      </div>

      {/* Spacer dưới để giữ nội dung ở 2/3 phía trên */}
      <div style={{ flex: '2 1 0', minHeight: '36px' }} />
    </div>
  );
}
