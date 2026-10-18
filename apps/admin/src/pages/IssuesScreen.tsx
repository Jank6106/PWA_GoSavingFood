import React, { useState } from 'react';
import { AdminIssue } from '../types';
import { adminService } from '../services/admin.service';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { AlertTriangle, CheckCircle, XCircle, User, Store, MessageSquare, Search } from 'lucide-react';

interface Props {
  issues: AdminIssue[];
  onRefresh: () => void;
}

export const IssuesScreen: React.FC<Props> = ({ issues, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIssue, setSelectedIssue] = useState<AdminIssue | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [resolving, setResolving] = useState(false);

  const filteredIssues = issues.filter((i) => {
    const matchSearch =
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.order_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || i.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const handleResolve = async (status: 'resolved' | 'rejected') => {
    if (!selectedIssue) return;
    if (!resolutionText) {
      alert('Vui lòng nhập phương án xử lý (ví dụ: Đồng ý hoàn 100% qua PayOS hoặc Từ chối khiếu nại).');
      return;
    }
    try {
      setResolving(true);
      await adminService.resolveIssue(selectedIssue.id, status, resolutionText);
      alert(`Đã ${status === 'resolved' ? 'giải quyết hoàn tất' : 'từ chối'} khiếu nại!`);
      setSelectedIssue(null);
      setResolutionText('');
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi xử lý: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  const columns: Column<AdminIssue>[] = [
    {
      key: 'reporter_role',
      header: 'Đối Tượng',
      render: (item) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            background: item.reporter_role === 'customer' ? '#E0F2FE' : '#FEF3C7',
            color: item.reporter_role === 'customer' ? '#0369A1' : '#92400E',
          }}
        >
          {item.reporter_role === 'customer' ? <User size={12} /> : <Store size={12} />}
          {item.reporter_role === 'customer' ? 'Khách Hàng' : 'Cửa Hàng'}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Tiêu Đề Phản Ánh',
      render: (item) => (
        <div>
          <div style={{ fontWeight: '700', color: '#193B2C', fontSize: '13px' }}>{item.title}</div>
          <div style={{ fontSize: '11.5px', color: '#526458', marginTop: '2px', maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.description}
          </div>
        </div>
      ),
    },
    {
      key: 'order_id',
      header: 'Mã Đơn',
      render: (item) => (
        <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#193B2C', fontSize: '12px' }}>
          #{item.order_id ? item.order_id.slice(0, 8).toUpperCase() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Thời Gian',
      render: (item) => (
        <span style={{ fontSize: '11.5px', color: '#7D8E82' }}>
          {new Date(item.created_at).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (item) => (
        <button
          onClick={() => {
            setSelectedIssue(item);
            setResolutionText(item.resolution || '');
          }}
          style={{
            padding: '6px 12px',
            background: '#EEF4E4',
            color: '#166B4A',
            border: '1px solid #D8ED9B',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '11.5px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <MessageSquare size={12} /> Xử lý
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Trung Tâm Khiếu Nại & Xử Lý Sự Cố (Disputes & Resolution)"
        subtitle="Giải quyết phản ánh chất lượng thực phẩm từ khách và tranh chấp no-show từ quán"
        onRefresh={onRefresh}
      />

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
            placeholder="Tìm theo nội dung, mã đơn..."
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
          {(['ALL', 'pending', 'resolved', 'rejected'] as const).map((st) => (
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
              {st === 'ALL' ? 'Tất cả' : st.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredIssues}
        keyExtractor={(i) => i.id}
        emptyMessage="Hiện không có khiếu nại hoặc sự cố nào tồn đọng."
        emptyIcon={AlertTriangle}
        pageSize={8}
      />

      {/* Modal Xử Lý Khiếu Nại */}
      {selectedIssue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '26px', width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#166B4A', textTransform: 'uppercase' }}>
                  Báo cáo từ: {selectedIssue.reporter_role === 'customer' ? 'Khách Hàng' : 'Chủ Cửa Hàng'}
                </span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#193B2C' }}>
                  {selectedIssue.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7D8E82' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#FAF8F4', padding: '14px', borderRadius: '12px', border: '1px solid #D9D5CB', fontSize: '13px', color: '#193B2C' }}>
              <strong>Nội dung phản ánh:</strong>
              <p style={{ margin: '6px 0 0 0', lineHeight: '1.5' }}>{selectedIssue.description}</p>
            </div>

            {selectedIssue.images && selectedIssue.images.length > 0 && (
              <div>
                <strong style={{ fontSize: '12px', color: '#7D8E82' }}>Hình ảnh bằng chứng đính kèm:</strong>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', overflowX: 'auto' }}>
                  {selectedIssue.images.map((img, idx) => (
                    <img key={idx} src={img} alt="Evidence" style={{ width: '84px', height: '84px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #D9D5CB' }} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#193B2C' }}>
                Phương án giải quyết của Admin (ghi chú hoàn tiền / từ chối):
              </label>
              <textarea
                rows={3}
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                placeholder="Ví dụ: Đồng ý hoàn lại 100% qua PayOS do đồ ăn hỏng; hoặc Cảnh cáo quán và tặng voucher 30k..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D5CB', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={resolving}
                onClick={() => handleResolve('rejected')}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid #FCA5A5',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <XCircle size={14} /> Từ chối
              </button>
              <button
                type="button"
                disabled={resolving}
                onClick={() => handleResolve('resolved')}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#166B4A',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle size={14} /> Chấp thuận & Giải quyết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
