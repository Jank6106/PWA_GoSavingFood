import React from 'react';
import {
  AlertTriangle,
  Store,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  PackageX,
  CreditCard,
} from 'lucide-react';
import { AdminStore, AdminIssue, AdminOrder, AdminBag, Settlement } from '../../types';

interface OperationsOverviewProps {
  pendingStores: AdminStore[];
  unresolvedIssues: AdminIssue[];
  pendingOrders: AdminOrder[];
  lowStockBags: AdminBag[];
  pendingSettlements: Settlement[];
  onNavigate: (tab: string) => void;
}

export const OperationsOverview: React.FC<OperationsOverviewProps> = ({
  pendingStores,
  unresolvedIssues,
  pendingOrders,
  lowStockBags,
  pendingSettlements,
  onNavigate,
}) => {
  const attentionItems = [
    {
      id: 'issues',
      title: 'Khiếu nại chưa xử lý',
      count: unresolvedIssues.length,
      desc: unresolvedIssues.length > 0 ? `${unresolvedIssues[0].title}` : 'Không có khiếu nại tồn đọng',
      severity: unresolvedIssues.length > 0 ? 'danger' : 'neutral',
      icon: AlertTriangle,
      tab: 'issues',
    },
    {
      id: 'stores',
      title: 'Cửa hàng chờ duyệt (KYC)',
      count: pendingStores.length,
      desc: pendingStores.length > 0 ? `${pendingStores[0].name}` : 'Tất cả đối tác đã được duyệt',
      severity: pendingStores.length > 0 ? 'warning' : 'neutral',
      icon: Store,
      tab: 'merchants',
    },
    {
      id: 'orders',
      title: 'Đơn hàng chờ xác nhận / nhận',
      count: pendingOrders.length,
      desc: pendingOrders.length > 0 ? `Đơn mới nhất #${pendingOrders[0].order_number}` : 'Vận hành đúng tiến độ',
      severity: pendingOrders.length > 0 ? 'info' : 'neutral',
      icon: Clock,
      tab: 'orders',
    },
    {
      id: 'finance',
      title: 'Đối soát Payout chờ duyệt',
      count: pendingSettlements.length,
      desc: pendingSettlements.length > 0 ? `${pendingSettlements[0].store_name}` : 'Đã thanh toán đối soát chu kỳ',
      severity: pendingSettlements.length > 0 ? 'warning' : 'neutral',
      icon: CreditCard,
      tab: 'finance',
    },
  ];

  const totalUrgent = attentionItems.filter((i) => i.count > 0).length;

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
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} color="#166B4A" />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#193B2C' }}>
              Trung Tâm Giám Sát Vận Hành (Live Operations Alert)
            </h3>
          </div>
          <p style={{ margin: '3px 0 0 0', color: '#7D8E82', fontSize: '12px' }}>
            Các sự vụ thực tế từ Marketplace cần đội ngũ Admin can thiệp xử lý ngay
          </p>
        </div>

        <span
          style={{
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '700',
            background: totalUrgent > 0 ? '#FEE2E2' : '#EEF4E4',
            color: totalUrgent > 0 ? '#DC2626' : '#166B4A',
            border: `1px solid ${totalUrgent > 0 ? '#FECACA' : '#D8ED9B'}`,
          }}
        >
          {totalUrgent > 0 ? `${totalUrgent} nhóm sự vụ cần xử lý` : 'Hệ thống ổn định'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
        {attentionItems.map((item) => {
          const Icon = item.icon;
          const hasCount = item.count > 0;
          const bg =
            item.severity === 'danger'
              ? '#FEF2F2'
              : item.severity === 'warning'
              ? '#FEF9ED'
              : item.severity === 'info'
              ? '#F0F9FF'
              : '#FAF8F4';
          const borderColor =
            item.severity === 'danger'
              ? '#FCA5A5'
              : item.severity === 'warning'
              ? '#F4C95D'
              : item.severity === 'info'
              ? '#BAE6FD'
              : '#D9D5CB';
          const textColor =
            item.severity === 'danger'
              ? '#991B1B'
              : item.severity === 'warning'
              ? '#92400E'
              : item.severity === 'info'
              ? '#0369A1'
              : '#526458';

          return (
            <div
              key={item.id}
              onClick={() => onNavigate(item.tab)}
              style={{
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: textColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon size={14} /> {item.title}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '800',
                    background: hasCount ? textColor : '#CBD5E1',
                    color: '#ffffff',
                  }}
                >
                  {item.count}
                </span>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#526458',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.desc}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#166B4A',
                  marginTop: 'auto',
                }}
              >
                Xử lý ngay <ArrowRight size={12} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
