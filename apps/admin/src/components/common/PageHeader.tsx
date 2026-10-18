import React, { useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';

export type TimeRange = '7d' | '30d' | 'this_month' | 'all';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  actionButton?: React.ReactNode;
  dataSourceBadge?: {
    isLive: boolean;
    label?: string;
  };
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  refreshing = false,
  actionButton,
  dataSourceBadge,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '800',
              margin: 0,
              color: '#193B2C',
              letterSpacing: '-0.4px',
            }}
          >
            {title}
          </h1>
          {dataSourceBadge && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: '700',
                background: dataSourceBadge.isLive ? '#EEF4E4' : '#FEF3C7',
                color: dataSourceBadge.isLive ? '#166B4A' : '#92400E',
                border: `1px solid ${dataSourceBadge.isLive ? '#D8ED9B' : '#FDE68A'}`,
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: dataSourceBadge.isLive ? '#166B4A' : '#D97706',
                }}
              />
              {dataSourceBadge.label || (dataSourceBadge.isLive ? 'Supabase Live' : 'Demo Mode')}
            </span>
          )}
        </div>
        <p style={{ margin: '4px 0 0 0', color: '#526458', fontSize: '13.5px' }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {timeRange && onTimeRangeChange && (
          <div
            style={{
              display: 'flex',
              background: '#ffffff',
              border: '1px solid #D9D5CB',
              borderRadius: '10px',
              padding: '3px',
              gap: '2px',
            }}
          >
            {(
              [
                { id: '7d', label: '7 ngày' },
                { id: '30d', label: '30 ngày' },
                { id: 'this_month', label: 'Tháng này' },
                { id: 'all', label: 'Tất cả' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => onTimeRangeChange(opt.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: timeRange === opt.id ? '#166B4A' : 'transparent',
                  color: timeRange === opt.id ? '#ffffff' : '#526458',
                  fontSize: '12px',
                  fontWeight: timeRange === opt.id ? '700' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #D9D5CB',
              background: '#ffffff',
              color: '#193B2C',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        )}

        {actionButton}
      </div>
    </div>
  );
};
