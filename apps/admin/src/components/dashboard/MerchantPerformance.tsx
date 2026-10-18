import React from 'react';
import { Store, ArrowRight, ExternalLink } from 'lucide-react';
import { AdminStore } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface MerchantPerformanceProps {
  stores: AdminStore[];
  onSelectStore?: (store: AdminStore) => void;
  onViewAll?: () => void;
}

export const MerchantPerformance: React.FC<MerchantPerformanceProps> = ({
  stores,
  onSelectStore,
  onViewAll,
}) => {
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
          <Store size={18} color="#166B4A" />
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#193B2C' }}>
            Hiệu Suất Cửa Hàng & Đối Tác (Top Merchants)
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
            Quản lý đối tác <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#EEF4E4', borderBottom: '1px solid #D9D5CB', color: '#193B2C' }}>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>Cửa Hàng</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>Danh Mục</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>Hoa Hồng</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>Khung Giờ Nhận</th>
              <th style={{ padding: '10px 14px', fontWeight: '700' }}>Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
            {stores.slice(0, 5).map((store) => (
              <tr key={store.id} style={{ borderBottom: '1px solid #edf4ef' }}>
                <td style={{ padding: '12px 14px', fontWeight: '700', color: '#193B2C' }}>
                  {store.name}
                  <div style={{ fontSize: '11px', color: '#7D8E82', fontWeight: '400' }}>
                    {store.address}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: '#526458' }}>
                  {store.category || 'Ẩm thực'}
                </td>
                <td style={{ padding: '12px 14px', fontWeight: '700', color: '#166B4A' }}>
                  {store.commission_rate}%
                </td>
                <td style={{ padding: '12px 14px', color: '#7D8E82' }}>
                  {store.pickup_hours || '19:00 - 21:00'}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <StatusBadge status={store.status} size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
