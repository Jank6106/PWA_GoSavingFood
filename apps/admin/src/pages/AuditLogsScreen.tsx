import React, { useState } from 'react';
import { AdminAuditLog } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { ShieldCheck, Shield, Search } from 'lucide-react';

import { BackendErrorNotice } from '../components/common/BackendErrorNotice';
import { BackendErrorState, DataSourceMode } from '../types';

interface Props {
  logs: AdminAuditLog[];
  onRefresh?: () => void;
  backendError?: BackendErrorState;
  mode?: DataSourceMode;
  onSwitchToDemo?: () => void;
}

export const AuditLogsScreen: React.FC<Props> = ({
  logs,
  onRefresh,
  backendError,
  mode = 'PRODUCTION',
  onSwitchToDemo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs.filter(
    (l) =>
      l.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: Column<AdminAuditLog>[] = [
    {
      key: 'admin',
      header: 'Quản Trị Viên',
      render: (log) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', color: '#193B2C' }}>
          <Shield size={14} color="#166B4A" /> {log.admin_name}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Hành Động',
      render: (log) => (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '800',
            background: '#EEF4E4',
            color: '#166B4A',
            letterSpacing: '0.04em',
          }}
        >
          {log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Đối Tượng',
      render: (log) => (
        <span style={{ fontSize: '12px', color: '#526458', fontWeight: '600' }}>
          {log.entity_type} ({log.entity_id})
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Chi Tiết Thao Tác',
      render: (log) => (
        <span style={{ fontSize: '12.5px', color: '#193B2C', lineHeight: '1.4' }}>
          {log.details}
        </span>
      ),
    },
    {
      key: 'time',
      header: 'Thời Gian',
      render: (log) => (
        <span style={{ fontSize: '11.5px', color: '#7D8E82' }}>
          {new Date(log.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
          {new Date(log.created_at).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Nhật Ký Quản Trị & Phân Quyền (Audit Logs & RBAC)"
        subtitle="Ghi vết toàn bộ hành vi duyệt quán, hoàn tiền khiếu nại, thay đổi hoa hồng và can thiệp hệ thống"
        onRefresh={onRefresh}
        dataSourceBadge={{
          isLive: mode === 'PRODUCTION',
          label: mode === 'PRODUCTION' ? 'Supabase Live' : 'Demo Mode',
        }}
      />

      <BackendErrorNotice
        error={backendError}
        mode={mode}
        onSwitchToDemo={onSwitchToDemo}
        onRetry={onRefresh}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#fff',
          border: '1px solid #D9D5CB',
          borderRadius: '12px',
          padding: '0 14px',
          width: '360px',
          height: '42px',
        }}
      >
        <Search size={15} color="#7D8E82" />
        <input
          type="text"
          placeholder="Tìm kiếm nhật ký hành động..."
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

      <DataTable
        columns={columns}
        data={filteredLogs}
        keyExtractor={(l) => l.id}
        emptyMessage="Chưa có nhật ký hoạt động nào."
        emptyIcon={ShieldCheck}
        pageSize={10}
      />
    </div>
  );
};
