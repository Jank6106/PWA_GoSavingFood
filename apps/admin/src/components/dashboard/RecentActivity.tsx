import React from 'react';
import { History, Shield, ArrowRight } from 'lucide-react';
import { AdminAuditLog } from '../../types';

interface RecentActivityProps {
  logs: AdminAuditLog[];
  onViewAll?: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ logs, onViewAll }) => {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#166B4A" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#193B2C' }}>
            Nhật Ký Hoạt Động Quản Trị Gần Đây
          </h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#166B4A',
              fontSize: '12.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Toàn bộ nhật ký <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {logs.slice(0, 4).map((log) => (
          <div
            key={log.id}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: '#FAF8F4',
              border: '1px solid #D9D5CB',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: '#EEF4E4',
                    color: '#166B4A',
                  }}
                >
                  {log.action}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#193B2C' }}>
                  {log.admin_name}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#526458', lineHeight: '1.4' }}>
                {log.details}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#7D8E82', whiteSpace: 'nowrap' }}>
              {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
