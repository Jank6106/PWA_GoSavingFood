import React from 'react';
import { AlertTriangle, Database, RefreshCw, Sparkles } from 'lucide-react';
import { BackendErrorState, DataSourceMode } from '../../types';

interface Props {
  error?: BackendErrorState;
  mode: DataSourceMode;
  onSwitchToDemo?: () => void;
  onRetry?: () => void;
}

export const BackendErrorNotice: React.FC<Props> = ({
  error,
  mode,
  onSwitchToDemo,
  onRetry,
}) => {
  if (!error) return null;

  return (
    <div
      style={{
        background: '#FFFBEB',
        border: '1.5px solid #F4C95D',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(244, 201, 93, 0.12)',
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#FEF3C7',
            display: 'grid',
            placeItems: 'center',
            color: '#B45309',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <AlertTriangle size={18} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#92400E' }}>
              Thông báo Backend: {error.table ? `Bảng '${error.table}'` : 'Dữ liệu'} chưa sẵn sàng trên Supabase Live
            </h4>
            {error.code && (
              <span style={{ fontSize: '10.5px', background: '#FDE68A', color: '#78350F', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                Mã lỗi: {error.code}
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#78350F', lineHeight: '1.4' }}>
            {error.message}
          </p>
          <div style={{ marginTop: '6px', fontSize: '11px', color: '#92400E', fontWeight: '600' }}>
            Hệ thống tuân thủ nguyên tắc không tự ý chèn dữ liệu ảo khi đang ở chế độ <strong>PRODUCTION</strong>.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #D9D5CB',
              background: '#fff',
              color: '#193B2C',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={12} /> Thử lại
          </button>
        )}
        {mode === 'PRODUCTION' && onSwitchToDemo && (
          <button
            onClick={onSwitchToDemo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: 'none',
              background: '#166B4A',
              color: '#fff',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={12} /> Chuyển sang Demo
          </button>
        )}
      </div>
    </div>
  );
};
