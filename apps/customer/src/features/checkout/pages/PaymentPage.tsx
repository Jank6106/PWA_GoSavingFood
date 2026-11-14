import { Check, Clock3, Copy, Download, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@gosavingfood/ui';
import { ScreenHeader, CancelOrderModal } from '../../../shared/components';
import { usePayment, type PaymentPageProps } from '../../../hooks/usePayment';
export function PaymentPage(props: PaymentPageProps) {
  const { isExpired, terminalMessage, onBack, timeFormatted, effectiveTotal, payosData, qrImageUrl, isImgError, setIsImgError, fallbackQrData, paymentError, handleDownloadQr, copiedField, handleCopy, isPayosLoading, bankAccount, bankName, accountHolder, isCancelling, setIsCancelModalOpen, isCancelModalOpen, effectiveOrderCode, handleCancelPayment, toastMessage } = usePayment(props);
  // Trường hợp hết hạn thời gian thanh toán
  if (isExpired) {
    return (
      <div className="customer-screen customer-payment-screen">
        <ScreenHeader title="Thanh toán đã kết thúc" onBack={onBack} />
        <section className="customer-payment-card" style={{ padding: '36px 20px 28px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-bg-muted, #f3f4f6)',
              color: 'var(--color-text-secondary, #4b5563)',
              margin: '0 auto 16px',
            }}
          >
            <Clock3 size={32} strokeWidth={2.2} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 24px' }}>
            {terminalMessage}
          </h2>
          <Button fullWidth size="lg" onClick={onBack}>
            Quay lại trang khám phá
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="customer-screen customer-payment-screen">
      {/* 1. Header "Thanh toán" */}
      <ScreenHeader title="Thanh toán" onBack={onBack} />

      {/* 2. Khung thẻ thanh toán chính */}
      <section className="customer-payment-card" style={{ position: 'relative' }}>
        {/* Thời gian nhỏ còn lại ở góc */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: '#b45309',
          }}
        >
          <Clock3 size={13} />
          <span>{timeFormatted}</span>
        </div>

        {/* Số tiền thanh toán */}
        <div style={{ marginTop: '4px', textAlign: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Số tiền thanh toán
          </span>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: 'var(--color-primary)',
              lineHeight: 1.2,
              marginTop: '2px',
            }}
          >
            {effectiveTotal.toLocaleString('vi-VN')}đ
          </div>
        </div>

        {/* Mã QR */}
        <div className="customer-payment-qr-wrap" style={{ padding: '8px', marginTop: '2px' }}>
          {payosData?.qrCode ? (
            <div style={{ padding: '6px', background: '#fff', borderRadius: '12px' }}>
              <QRCodeSVG value={payosData.qrCode} size={200} level="M" />
            </div>
          ) : qrImageUrl && !isImgError ? (
            <img
              src={qrImageUrl}
              alt="Mã VietQR"
              className="customer-payment-qr-img"
              style={{ width: '200px', height: 'auto', borderRadius: '12px' }}
              onError={() => setIsImgError(true)}
            />
          ) : fallbackQrData ? (
            <div style={{ padding: '6px', background: '#fff', borderRadius: '12px' }}>
              <QRCodeSVG value={fallbackQrData} size={200} level="M" />
            </div>
          ) : (
            <div
              style={{
                width: '200px',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f8faf9',
                borderRadius: '12px',
                color: 'var(--color-text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center',
                padding: '16px',
              }}
            >
              {paymentError || (payosData?.checkoutUrl ? (
                <a href={payosData.checkoutUrl} target="_blank" rel="noopener noreferrer">Mở link thanh toán hiện có</a>
              ) : 'Đang tải mã thanh toán...')}
            </div>
          )}
        </div>

        {/* Nút tải ảnh mã QR */}
        <button
          type="button"
          onClick={handleDownloadQr}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '7px 16px',
            borderRadius: '10px',
            border: '1px solid #dce5df',
            background: '#f8faf9',
            color: 'var(--color-text-primary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Download size={14} color="#166B4A" />
          <span>Tải ảnh mã QR</span>
        </button>

        <div className="customer-bank-info-card" style={{ width: '100%', marginTop: '14px' }}>
          <div className="customer-bank-info-header">
            <span>Chi tiết chuyển khoản thủ công</span>
          </div>
          <div className="customer-bank-info-list">
            {/* Số tiền */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Số tiền</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val" style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                  {effectiveTotal.toLocaleString('vi-VN')}đ
                </span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'amount' ? 'copied' : ''}`}
                  onClick={() => handleCopy(String(effectiveTotal), 'amount')}
                  title="Sao chép số tiền"
                  aria-label="Sao chép số tiền"
                >
                  {copiedField === 'amount' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>


            {/* Ngân hàng */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Ngân hàng</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val" style={{ textAlign: 'right' }}>
                  {bankName}
                </span>
                <div style={{ width: 28, flexShrink: 0 }} />
              </div>
            </div>

            {/* Số tài khoản */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Số tài khoản</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val">
                  {isPayosLoading ? 'Đang lấy STK PayOS...' : bankAccount}
                </span>
                <button
                  type="button"
                  className={`customer-copy-btn ${copiedField === 'stk' ? 'copied' : ''}`}
                  onClick={() => handleCopy(bankAccount, 'stk')}
                  title="Sao chép số tài khoản"
                  aria-label="Sao chép số tài khoản"
                  disabled={isPayosLoading}
                >
                  {copiedField === 'stk' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            {/* Chủ tài khoản */}
            <div className="customer-bank-info-row">
              <span className="customer-bank-info-label">Chủ tài khoản</span>
              <div className="customer-bank-info-val-wrap">
                <span className="customer-bank-info-val">{accountHolder}</span>
                <div style={{ width: 28, flexShrink: 0 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Ghi chú tự động xác nhận */}
        <div style={{ marginTop: '14px', width: '100%', textAlign: 'center' }}>
          <p
            style={{
              fontSize: '12.5px',
              color: 'var(--color-text-muted)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Hệ thống tự động xác nhận đơn ngay khi tiền vào tài khoản.
          </p>
        </div>

        {/* Nút hủy thanh toán */}
        <div style={{ marginTop: '18px', width: '100%' }}>
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            disabled={isCancelling}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              width: '100%',
              padding: '11px 16px',
              borderRadius: '12px',
              border: '1px solid #fee2e2',
              background: '#fff5f5',
              color: '#dc2626',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isCancelling ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Trash2 size={16} />
            <span>{isCancelling ? 'Đang hủy đơn...' : 'Hủy thanh toán đơn hàng'}</span>
          </button>
        </div>
      </section>

      {/* Modal xác nhận hủy dùng chung */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        orderCode={effectiveOrderCode}
        finalAmount={effectiveTotal}
        isPaid={false}
        isSubmitting={isCancelling}
        confirmLabel="Xác nhận hủy đơn"
        onConfirm={handleCancelPayment}
      />

      {/* Toast thông báo nhanh */}
      {toastMessage && (
        <div className="customer-payment-toast">
          <Check size={16} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
