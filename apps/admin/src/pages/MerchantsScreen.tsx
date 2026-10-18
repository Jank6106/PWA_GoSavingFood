import React, { useState } from 'react';
import { AdminStore, StoreStatus } from '../types';
import { adminService } from '../services/admin.service';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { Check, X, Percent, Search, Store as StoreIcon, Phone, MapPin, Eye } from 'lucide-react';

interface Props {
  stores: AdminStore[];
  onRefresh: () => void;
}

export const MerchantsScreen: React.FC<Props> = ({ stores, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StoreStatus>('ALL');
  const [selectedStore, setSelectedStore] = useState<AdminStore | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredStores = stores.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm));
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = async (storeId: string, status: StoreStatus) => {
    try {
      setUpdatingId(storeId);
      await adminService.updateStoreStatus(storeId, status);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCommissionChange = async (store: AdminStore) => {
    const current = store.commission_rate ?? 20;
    const input = prompt(`Nhập tỉ lệ hoa hồng sàn (%) cho quán "${store.name}":`, current.toString());
    if (input === null) return;
    const val = parseFloat(input);
    if (isNaN(val) || val < 0 || val > 100) {
      alert('Tỉ lệ hoa hồng không hợp lệ (phải từ 0 đến 100).');
      return;
    }
    try {
      setUpdatingId(store.id);
      await adminService.updateStoreCommission(store.id, val);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: Column<AdminStore>[] = [
    {
      key: 'name',
      header: 'Cửa Hàng',
      render: (s) => (
        <div>
          <div style={{ fontWeight: '700', color: '#193B2C', fontSize: '13.5px' }}>{s.name}</div>
          <div style={{ fontSize: '11.5px', color: '#7D8E82', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
            <MapPin size={11} /> {s.address}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Danh Mục',
      render: (s) => (
        <span style={{ fontSize: '12.5px', color: '#526458', fontWeight: '500' }}>
          {s.category || 'Ẩm thực'}
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Liên Hệ',
      render: (s) => (
        <div style={{ fontSize: '12px', color: '#526458', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Phone size={12} color="#166B4A" /> {s.phone || 'Chưa cập nhật'}
        </div>
      ),
    },
    {
      key: 'commission',
      header: 'Hoa Hồng Sàn',
      render: (s) => (
        <button
          onClick={() => handleCommissionChange(s)}
          title="Nhấn để đổi tỉ lệ hoa hồng"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#EEF4E4',
            border: '1px solid #D8ED9B',
            padding: '4px 8px',
            borderRadius: '6px',
            color: '#166B4A',
            fontWeight: '700',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <Percent size={12} /> {s.commission_rate}%
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (s) => (
        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setSelectedStore(s)}
            style={{
              padding: '6px 10px',
              background: '#fff',
              border: '1px solid #D9D5CB',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#193B2C',
            }}
          >
            <Eye size={12} /> Xem
          </button>
          {s.status !== 'ACTIVE' ? (
            <button
              disabled={updatingId === s.id}
              onClick={() => handleStatusChange(s.id, 'ACTIVE')}
              style={{
                padding: '6px 10px',
                background: '#166B4A',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Check size={12} /> Duyệt
            </button>
          ) : (
            <button
              disabled={updatingId === s.id}
              onClick={() => handleStatusChange(s.id, 'INACTIVE')}
              style={{
                padding: '6px 10px',
                background: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '11.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <X size={12} /> Khóa
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Đối Tác & Cửa Hàng (Merchants)"
        subtitle="Xét duyệt hồ sơ KYC, kiểm soát khung giờ mở bán và chính sách hoa hồng sàn"
        onRefresh={onRefresh}
      />

      {/* Filter toolbar */}
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
            placeholder="Tìm theo tên quán, địa chỉ, SĐT..."
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
          {(['ALL', 'ACTIVE', 'PENDING', 'INACTIVE'] as const).map((st) => (
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
              {st === 'ALL' ? 'Tất cả' : st}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredStores}
        keyExtractor={(s) => s.id}
        emptyMessage="Không tìm thấy cửa hàng nào phù hợp bộ lọc."
        emptyIcon={StoreIcon}
        pageSize={8}
      />

      {/* Drawer xem chi tiết đối tác */}
      {selectedStore && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '460px', background: '#fff', height: '100%', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#166B4A', textTransform: 'uppercase' }}>Hồ sơ đối tác</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#193B2C' }}>{selectedStore.name}</h2>
              </div>
              <button onClick={() => setSelectedStore(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7D8E82' }}>✕</button>
            </div>

            <div style={{ background: '#FAF8F4', padding: '16px', borderRadius: '12px', border: '1px solid #D9D5CB', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div><strong>Địa chỉ:</strong> {selectedStore.address}</div>
              <div><strong>Số điện thoại:</strong> {selectedStore.phone || 'Chưa cập nhật'}</div>
              <div><strong>Email:</strong> {selectedStore.email || 'Chưa cập nhật'}</div>
              <div><strong>Danh mục:</strong> {selectedStore.category || 'Ẩm thực'}</div>
              <div><strong>Khung giờ nhận đồ:</strong> {selectedStore.pickup_hours || '19:00 - 21:00'}</div>
              <div><strong>Hoa hồng thỏa thuận:</strong> {selectedStore.commission_rate}%</div>
              <div><strong>Trạng thái:</strong> <StatusBadge status={selectedStore.status} size="sm" /></div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  handleCommissionChange(selectedStore);
                  setSelectedStore(null);
                }}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #D9D5CB', background: '#fff', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
              >
                Đổi Hoa Hồng
              </button>
              <button
                onClick={() => setSelectedStore(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#166B4A', color: '#fff', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
