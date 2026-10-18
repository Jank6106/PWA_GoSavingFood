import React, { useState } from 'react';
import { Settlement } from '../types';
import { adminService } from '../services/admin.service';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { DollarSign, CheckCircle2, Download, Building, Percent, CreditCard, Search } from 'lucide-react';

import { BackendErrorNotice } from '../components/common/BackendErrorNotice';
import { BackendErrorState, DataSourceMode } from '../types';

interface Props {
  settlements: Settlement[];
  onRefresh: () => void;
  backendError?: BackendErrorState;
  mode?: DataSourceMode;
  onSwitchToDemo?: () => void;
}

export const FinanceScreen: React.FC<Props> = ({
  settlements,
  onRefresh,
  backendError,
  mode = 'PRODUCTION',
  onSwitchToDemo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  const filteredSettlements = settlements.filter((s) => {
    const matchSearch =
      s.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.bank_name && s.bank_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const [approvingId, setApprovingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    if (!confirm('Xác nhận đã chuyển khoản ngân hàng và hoàn tất đối soát chu kỳ này?')) return;
    try {
      setApprovingId(id);
      await adminService.approveSettlement(id);
      alert('Đã cập nhật trạng thái đối soát thành công.');
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setApprovingId(null);
    }
  };

  const totalGross = settlements.reduce((sum, s) => sum + s.gross_sales, 0);
  const totalCommission = settlements.reduce((sum, s) => sum + s.commission_amount, 0);
  const totalPayout = settlements.reduce((sum, s) => sum + s.net_payout, 0);

  const columns: Column<Settlement>[] = [
    {
      key: 'store_name',
      header: 'Cửa Hàng / Tài Khoản',
      render: (s) => (
        <div>
          <div style={{ fontWeight: '700', color: '#193B2C', fontSize: '13px' }}>{s.store_name}</div>
          {s.bank_account && (
            <div style={{ fontSize: '11px', color: '#7D8E82', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
              <Building size={11} /> {s.bank_name}: {s.bank_account}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Chu Kỳ Đối Soát',
      render: (s) => (
        <span style={{ fontSize: '12px', color: '#526458', fontWeight: '500' }}>
          {s.period_start} → {s.period_end}
        </span>
      ),
    },
    {
      key: 'orders',
      header: 'Số Đơn',
      render: (s) => (
        <span style={{ fontWeight: '700', color: '#193B2C', fontSize: '12.5px' }}>
          {s.total_orders} đơn
        </span>
      ),
    },
    {
      key: 'gross_sales',
      header: 'Doanh Thu',
      render: (s) => (
        <span style={{ fontSize: '12.5px', color: '#526458' }}>
          {s.gross_sales.toLocaleString()} đ
        </span>
      ),
    },
    {
      key: 'commission',
      header: 'Hoa Hồng Sàn',
      render: (s) => (
        <span style={{ fontWeight: '700', color: '#166B4A', fontSize: '12.5px' }}>
          -{s.commission_amount.toLocaleString()} đ ({s.commission_rate}%)
        </span>
      ),
    },
    {
      key: 'net_payout',
      header: 'Thực Trả (Net)',
      render: (s) => (
        <span style={{ fontWeight: '800', color: '#193B2C', fontSize: '13.5px' }}>
          {s.net_payout.toLocaleString()} đ
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'actions',
      header: 'Hành Động',
      align: 'right',
      render: (s) =>
        s.status !== 'PAID' ? (
          <button
            disabled={approvingId === s.id}
            onClick={() => handleApprove(s.id)}
            style={{
              padding: '6px 12px',
              background: '#166B4A',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={13} /> Duyệt Chuyển
          </button>
        ) : (
          <span style={{ fontSize: '11.5px', color: '#7D8E82', fontWeight: '600' }}>Đã chi</span>
        ),
    },
  ];

  const handleExportCSV = () => {
    if (filteredSettlements.length === 0) {
      alert('Không có dữ liệu đối soát để xuất file.');
      return;
    }
    const headers = ['Cửa hàng', 'Ngân hàng', 'Số tài khoản', 'Chu kỳ từ', 'Chu kỳ đến', 'Số đơn', 'Doanh thu (VND)', 'Tỷ lệ hoa hồng (%)', 'Tiền hoa hồng (VND)', 'Thực trả (VND)', 'Trạng thái'];
    const rows = filteredSettlements.map((s) => [
      `"${s.store_name.replace(/"/g, '""')}"`,
      `"${(s.bank_name || '').replace(/"/g, '""')}"`,
      `"'${s.bank_account || ''}"`,
      `"${s.period_start}"`,
      `"${s.period_end}"`,
      s.total_orders,
      s.gross_sales,
      s.commission_rate,
      s.commission_amount,
      s.net_payout,
      `"${s.status}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Doi_Soat_GoSavingFood_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Đối Soát Tài Chính & Lệnh Chi Trả (Finance & Payouts)"
        subtitle="Chu kỳ 15 ngày/lần. Tự động tính: Tổng tiền bán - Hoa hồng sàn - Phí thanh toán"
        onRefresh={onRefresh}
        dataSourceBadge={{
          isLive: mode === 'PRODUCTION',
          label: mode === 'PRODUCTION' ? 'Supabase Live' : 'Demo Mode',
        }}
        actionButton={
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              background: '#166B4A',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={14} /> Xuất Báo Cáo (.csv)
          </button>
        }
      />

      <BackendErrorNotice
        error={backendError}
        mode={mode}
        onSwitchToDemo={onSwitchToDemo}
        onRetry={onRefresh}
      />

      {/* 3 Thẻ thống kê tài chính */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
        <StatCard
          label="Tổng Doanh Thu Đơn Hàng"
          value={`${totalGross.toLocaleString()} đ`}
          icon={DollarSign}
          color="#166B4A"
          bg="#EEF4E4"
        />
        <StatCard
          label="Doanh Thu Hoa Hồng Sàn"
          value={`${totalCommission.toLocaleString()} đ`}
          icon={Percent}
          color="#166B4A"
          bg="#EEF4E4"
          tooltip="Doanh thu thực sàn giữ lại theo tỷ lệ thỏa thuận"
        />
        <StatCard
          label="Số Dư Phải Trả Cho Quán (Net)"
          value={`${totalPayout.toLocaleString()} đ`}
          icon={CreditCard}
          color="#B45309"
          bg="#FEF9ED"
          tooltip="Tổng số tiền cần làm lệnh chi chuyển khoản ngân hàng"
        />
      </div>

      {/* Toolbar filter */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          background: '#fff',
          padding: '14px 18px',
          borderRadius: '14px',
          border: '1px solid #D9D5CB',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FAF8F4',
            border: '1px solid #D9D5CB',
            borderRadius: '10px',
            padding: '0 12px',
            width: '320px',
            height: '40px',
          }}
        >
          <Search size={15} color="#7D8E82" />
          <input
            type="text"
            placeholder="Tìm theo quán, ngân hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: '#193B2C',
              width: '100%',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'PENDING', 'PAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #D9D5CB',
                background: statusFilter === st ? '#166B4A' : '#ffffff',
                color: statusFilter === st ? '#ffffff' : '#526458',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {st === 'ALL' ? 'Tất cả' : st === 'PAID' ? 'Đã chi' : 'Chờ duyệt chi'}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredSettlements}
        keyExtractor={(s) => s.id}
        emptyMessage="Không có bảng kê đối soát nào phù hợp."
        emptyIcon={CreditCard}
        pageSize={8}
      />
    </div>
  );
};
