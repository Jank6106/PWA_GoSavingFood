import React, { useState } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  annotation?: string;
}

interface AnalyticsChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  data: ChartDataPoint[];
  unit?: string;
  valuePrefix?: string;
  height?: number;
  type?: 'bar' | 'line' | 'area';
  emptyMessage?: string;
  highlightColor?: string;
}

export const AnalyticsChartCard: React.FC<AnalyticsChartCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  data,
  unit = 'đ',
  valuePrefix = '',
  height = 200,
  emptyMessage = 'Chưa có đủ dữ liệu chu kỳ để tạo biểu đồ.',
  highlightColor = '#166B4A',
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #D9D5CB',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: `${height + 80}px`,
          color: '#7D8E82',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: '600' }}>{emptyMessage}</span>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #D9D5CB',
        borderRadius: '16px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 2px 10px rgba(25, 59, 44, 0.02)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {Icon && <Icon size={18} color="#166B4A" />}
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#193B2C' }}>
              {title}
            </h3>
          </div>
          {subtitle && (
            <p style={{ margin: '3px 0 0 0', color: '#7D8E82', fontSize: '12px' }}>
              {subtitle}
            </p>
          )}
        </div>

        {hoveredIndex !== null && (
          <div
            style={{
              background: '#EEF4E4',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#166B4A',
              border: '1px solid #D8ED9B',
            }}
          >
            {data[hoveredIndex].label}: {valuePrefix}
            {data[hoveredIndex].value.toLocaleString()} {unit}
          </div>
        )}
      </div>

      {/* Bar Chart Container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '8px',
          height: `${height}px`,
          paddingTop: '20px',
          borderBottom: '1px solid #edf4ef',
        }}
      >
        {data.map((point, index) => {
          const barHeightPct = Math.max(8, Math.round((point.value / maxValue) * 100));
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={point.label}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '36px',
                  height: `${barHeightPct}%`,
                  background: isHovered
                    ? highlightColor
                    : 'linear-gradient(180deg, rgba(22, 107, 74, 0.7) 0%, rgba(22, 107, 74, 0.95) 100%)',
                  borderRadius: '6px 6px 2px 2px',
                  transition: 'all 0.15s ease',
                  transform: isHovered ? 'scaleY(1.02)' : 'none',
                }}
              />
              <span
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  fontWeight: isHovered ? '700' : '500',
                  color: isHovered ? '#193B2C' : '#7D8E82',
                  whiteSpace: 'nowrap',
                }}
              >
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
