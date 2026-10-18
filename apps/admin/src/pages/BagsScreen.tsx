import React, { useState } from 'react';
import { AdminBag } from '../types';
import { adminService } from '../services/admin.service';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { ShoppingBag, Eye, EyeOff, Search, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  bags: AdminBag[];
  onRefresh: () => void;
}

export const BagsScreen: React.FC<Props> = ({ bags, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedBag, setSelectedBag] = useState<AdminBag | null>(null);

  const categoryLabels: Record<string, string> = {
    vegetarian: 'Món chay',
    bakery: 'Bánh ngọt',
    raw_food: 'Rau củ / Tươi sống',
    beverage: 'Đồ uống',
    meat: 'Thịt / Đạm',
    other: 'Khác',
  };

  const categories = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'bakery', label: 'Bánh ngọt' },
    { id: 'vegetarian', label: 'Món chay' },
    { id: 'raw_food', label: 'Rau củ' },
    { id: 'beverage', label: 'Đồ uống' },
    { id: 'meat', label: 'Thịt' },
  ];

  const filteredBags = bags.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.store_name && b.store_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCat = categoryFilter === 'ALL' || b.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleStatus = async (bag: AdminBag) => {
    const nextStatus = bag.status === 'active' ? 'hidden' : 'active';
    try {
      setUpdatingId(bag.id);
      await adminService.updateBagStatus(bag.id, nextStatus);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái túi: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const columns: Column<AdminBag>[] = [
    {
      key: 'name',
      header: 'Surprising Bag',
      render: (b) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={b.image_url}
            alt={b.name}
            style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: '700', color: '#193B2C', fontSize: '13px' }}>{b.name}</div>
            <div style={{ fontSize: '11px', color: '#7D8E82' }}>{b.store_name}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Danh Mục',
      render: (b) => (
        <span style={{ fontSize: '12px', color: '#526458', fontWeight: '600' }}>
          {categoryLabels[b.category] || b.category}
        </span>
      ),
    },
    {
      key: 'pricing',
      header: 'Giá Gốc / Giá Bán',
      render: (b) => {
        const discountPct =
          b.original_price > b.sale_price && b.original_price > 0
            ? Math.round(((b.original_price - b.sale_price) / b.original_price) * 100)
            : 0;
        return (
          <div>
            <div style={{ fontWeight: '800', color: '#166B4A', fontSize: '13px' }}>
              {b.sale_price.toLocaleString()} đ{' '}
              {discountPct > 0 && (
                <span style={{ fontSize: '10.5px', background: '#D8ED9B', color: '#193B2C', padding: '1px 5px', borderRadius: '4px' }}>
                  -{discountPct}%
                </span>
              )}
            </div>
            {b.original_price > 0 && (
              <s style={{ fontSize: '11px', color: '#7D8E82' }}>{b.original_price.toLocaleString()} đ</s>
            )}
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Tồn Kho Mở Bán',
      render: (b) => (
        <div>
          <span style={{ fontWeight: '700', color: b.available_quantity <= 2 ? '#DC2626' : '#193B2C' }}>
            {b.available_quantity} / {b.quantity} túi
          </span>
          {b.available_quantity <= 2 && b.available_quantity > 0 && (
            <div style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <AlertTriangle size={10} /> Sắp hết
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'pickup',
      header: 'Khung Giờ Nhận',
      render: (b) => (
        <div style={{ fontSize: '12px', color: '#526458', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Clock size={11} color="#7D8E82" /> {b.pickup_time_start} - {b.pickup_time_end}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (b) => (
        <StatusBadge
          status={b.status}
          label={b.status === 'active' ? 'Đang mở bán' : b.status === 'sold_out' ? 'Hết hàng' : 'Đã ẩn'}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Thao Tác',
      align: 'right',
      render: (b) => (
        <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setSelectedBag(b)}
            style={{
              padding: '6px 10px',
              background: '#fff',
              border: '1px solid #D9D5CB',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: '600',
              cursor: 'pointer',
              color: '#193B2C',
            }}
          >
            Chi tiết
          </button>
          <button
            disabled={updatingId === b.id}
            onClick={() => handleToggleStatus(b)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #D9D5CB',
              background: b.status === 'active' ? '#FEE2E2' : '#EEF4E4',
              color: b.status === 'active' ? '#DC2626' : '#166B4A',
              fontWeight: '700',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            {b.status === 'active' ? <EyeOff size={12} /> : <Eye size={12} />}
            {b.status === 'active' ? 'Gỡ' : 'Mở'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Quản Lý Surprising Bags"
        subtitle="Giám sát tồn kho mở bán, tỷ lệ giảm giá và khung giờ nhận thực phẩm từ các cửa hàng đối tác"
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
            placeholder="Tìm theo tên túi, tên quán..."
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

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #D9D5CB',
                background: categoryFilter === cat.id ? '#166B4A' : '#ffffff',
                color: categoryFilter === cat.id ? '#ffffff' : '#526458',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredBags}
        keyExtractor={(b) => b.id}
        emptyMessage="Không có Surprising Bag nào phù hợp bộ lọc."
        emptyIcon={ShoppingBag}
        pageSize={8}
      />

      {/* Modal chi tiết túi */}
      {selectedBag && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '18px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#166B4A', textTransform: 'uppercase' }}>{selectedBag.store_name}</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#193B2C' }}>{selectedBag.name}</h2>
              </div>
              <button onClick={() => setSelectedBag(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7D8E82' }}>✕</button>
            </div>

            <img src={selectedBag.image_url} alt={selectedBag.name} style={{ width: '100%', height: '180px', borderRadius: '12px', objectFit: 'cover' }} />

            <div style={{ background: '#FAF8F4', padding: '14px', borderRadius: '12px', border: '1px solid #D9D5CB', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div><strong>Mô tả túi:</strong> {selectedBag.description}</div>
              <div><strong>Định mức giá:</strong> {selectedBag.sale_price.toLocaleString()} đ (Giá gốc: {selectedBag.original_price.toLocaleString()} đ)</div>
              <div><strong>Khung giờ pickup:</strong> {selectedBag.pickup_time_start} - {selectedBag.pickup_time_end}</div>
              <div><strong>Số lượng:</strong> Còn {selectedBag.available_quantity} trên tổng {selectedBag.quantity} túi</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                onClick={() => setSelectedBag(null)}
                style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: '#166B4A', color: '#fff', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer' }}
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
