import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: number; // % so với kỳ trước
  changeLabel?: string;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  tooltip?: string;
  subValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  change,
  changeLabel = 'so với kỳ trước',
  icon: Icon,
  color = '#166B4A',
  bg = '#EEF4E4',
  tooltip,
  subValue,
}) => {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #D9D5CB',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 2px 10px rgba(25, 59, 44, 0.03)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12.5px', color: '#526458', fontWeight: '600' }}>{label}</span>
          {tooltip && (
            <span title={tooltip} style={{ cursor: 'help', color: '#7D8E82', display: 'flex' }}>
              <HelpCircle size={13} />
            </span>
          )}
        </div>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: bg,
            display: 'grid',
            placeItems: 'center',
            color: color,
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: '800', color: '#193B2C', letterSpacing: '-0.5px' }}>
            {value}
          </span>
          {unit && (
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#7D8E82' }}>
              {unit}
            </span>
          )}
        </div>
        {subValue && (
          <div style={{ fontSize: '11.5px', color: '#7D8E82', marginTop: '2px' }}>
            {subValue}
          </div>
        )}
      </div>

      {change !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11.5px',
            fontWeight: '600',
            borderTop: '1px solid #edf4ef',
            paddingTop: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              color: isPositive ? '#166B4A' : '#DC2626',
              fontWeight: '700',
            }}
          >
            {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {isPositive ? '+' : ''}{change}%
          </span>
          <span style={{ color: '#7D8E82' }}>{changeLabel}</span>
        </div>
      )}
    </div>
  );
};
