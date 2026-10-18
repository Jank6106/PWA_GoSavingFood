import React, { useState } from 'react';
import { Banner } from '../types';
import { adminService } from '../services/admin.service';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { Plus, Trash2, Eye, EyeOff, ExternalLink, Image as ImageIcon, Search } from 'lucide-react';

import { BackendErrorNotice } from '../components/common/BackendErrorNotice';
import { BackendErrorState, DataSourceMode } from '../types';

interface Props {
  banners: Banner[];
  onRefresh: () => void;
  backendError?: BackendErrorState;
  mode?: DataSourceMode;
  onSwitchToDemo?: () => void;
}

export const BannersScreen: React.FC<Props> = ({
  banners,
  onRefresh,
  backendError,
  mode = 'PRODUCTION',
  onSwitchToDemo,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetType, setTargetType] = useState<'STORE' | 'BAG' | 'CATEGORY' | 'EXTERNAL_URL'>('STORE');
  const [targetId, setTargetId] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      alert('Vui lòng nhập tiêu đề và link ảnh banner.');
      return;
    }
    try {
      setSaving(true);
      await adminService.createBanner({
        title,
        image_url: imageUrl,
        target_type: targetType,
        target_id: targetId || undefined,
        display_order: Number(displayOrder),
        is_active: true,
      });
      setShowAddModal(false);
      setTitle('');
      setImageUrl('');
      setTargetId('');
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi tạo banner: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const [operatingId, setOperatingId] = useState<string | null>(null);

  const handleToggle = async (id: string, current: boolean) => {
    try {
      setOperatingId(id);
      await adminService.toggleBannerStatus(id, !current);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setOperatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa banner này?')) return;
    try {
      setOperatingId(id);
      await adminService.deleteBanner(id);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setOperatingId(null);
    }
  };

  const columns: Column<Banner>[] = [
    {
      key: 'banner',
      header: 'Hình Ảnh / Tiêu Đề',
      render: (b) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src={b.image_url}
            alt={b.title}
            style={{ width: '88px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: '700', color: '#193B2C', fontSize: '13px' }}>{b.title}</div>
            <div style={{ fontSize: '11px', color: '#7D8E82', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ExternalLink size={10} /> Đích đến: {b.target_type} ({b.target_id || 'Mặc định'})
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'display_order',
      header: 'Thứ Tự',
      render: (b) => (
        <span style={{ fontWeight: '700', color: '#193B2C', fontSize: '13px' }}>
          #{b.display_order}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (b) => <StatusBadge status={b.is_active ? 'ACTIVE' : 'INACTIVE'} label={b.is_active ? 'ĐANG HIỆN' : 'TẮT'} />,
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (b) => (
        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            disabled={operatingId === b.id}
            onClick={() => handleToggle(b.id, b.is_active)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #D9D5CB',
              background: '#fff',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#193B2C',
            }}
          >
            {b.is_active ? <EyeOff size={12} /> : <Eye size={12} />} {b.is_active ? 'Ẩn' : 'Bật'}
          </button>
          <button
            disabled={operatingId === b.id}
            onClick={() => handleDelete(b.id)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #FECACA',
              background: '#FEE2E2',
              color: '#DC2626',
              fontSize: '11.5px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Trash2 size={12} /> Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Banner & Nội Dung Trang Chủ (CMS)"
        subtitle="Quản lý các banner chiến dịch flash sale giờ vàng hiển thị trên Customer PWA"
        onRefresh={onRefresh}
        dataSourceBadge={{
          isLive: mode === 'PRODUCTION',
          label: mode === 'PRODUCTION' ? 'Supabase Live' : 'Demo Mode',
        }}
        actionButton={
          <button
            onClick={() => setShowAddModal(true)}
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
            <Plus size={14} /> Thêm Banner Mới
          </button>
        }
      />

      <BackendErrorNotice
        error={backendError}
        mode={mode}
        onSwitchToDemo={onSwitchToDemo}
        onRetry={onRefresh}
      />

      <DataTable
        columns={columns}
        data={banners}
        keyExtractor={(b) => b.id}
        emptyMessage="Chưa có banner chiến dịch nào. Nhấn Thêm Banner Mới."
        emptyIcon={ImageIcon}
      />

      {/* Modal Thêm Banner */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', padding: '26px', width: '100%', maxWidth: '460px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#193B2C' }}>Thêm Banner Chiến Dịch Mới</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Tiêu đề chiến dịch</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Giờ Vàng Cứu Bánh 20h"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D5CB', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>URL Hình ảnh Banner</label>
                <input
                  required
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... ảnh banner"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D5CB', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Loại điều hướng</label>
                  <select
                    value={targetType}
                    onChange={(e: any) => setTargetType(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D5CB', boxSizing: 'border-box' }}
                  >
                    <option value="STORE">Cửa hàng</option>
                    <option value="BAG">Túi cụ thể</option>
                    <option value="CATEGORY">Danh mục</option>
                    <option value="EXTERNAL_URL">Link ngoài</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Thứ tự hiển thị</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D5CB', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>Target ID / Link (tùy chọn)</label>
                <input
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="ID Quán hoặc Link web"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D9D5CB', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #D9D5CB', background: '#fff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#166B4A', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
