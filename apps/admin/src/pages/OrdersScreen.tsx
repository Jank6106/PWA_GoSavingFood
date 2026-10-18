import React, { useState } from 'react';
import { AdminOrder } from '../types';
import { adminService } from '../services/admin.service';
import { PageHeader } from '../components/common/PageHeader';
import { DataTable, Column } from '../components/common/DataTable';
import { StatusBadge } from '../components/common/StatusBadge';
import { Search, ShoppingBag, Eye, Clock, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react';

interface OrdersScreenProps {
  orders: AdminOrder[];
  onRefresh: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ orders, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleUpdateStatus = async (orderId: string, nextStatus: string) => {
    const confirmMsg = nextStatus === 'completed'
      ? 'Bạn có chắc muốn can thiệp đánh dấu đơn này là HOÀN TẤT?'
      : 'Bạn có chắc muốn HỦY đơn hàng này?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setUpdating(true);
      await adminService.updateOrderStatus(orderId, nextStatus);
      alert(`Đã cập nhật trạng thái đơn hàng sang ${nextStatus.toUpperCase()}`);
      setSelectedOrder(null);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi khi cập nhật trạng thái đơn hàng: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.pickup_code && o.pickup_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customer?.full_name && o.customer.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.store?.name && o.store.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns: Column<AdminOrder>[] = [
    {
      key: 'order_number',
      header: 'Mã Đơn',
      render: (o) => (
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#193B2C', fontSize: '13px' }}>
            #{o.order_number}
          </span>
          <div style={{ fontSize: '11px', color: '#7D8E82' }}>
            {new Date(o.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
            {new Date(o.created_at).toLocaleDateString('vi-VN')}
          </div>
        </div>
      ),
    },
    {
      key: 'bag_name',
      header: 'Surprising Bag',
      render: (o) => (
        <div>
          <div style={{ fontWeight: '700', color: '#193B2C', fontSize: '13px' }}>
            {o.bag_name || 'Túi Bất Ngờ'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#526458' }}>
            {o.store?.name}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Khách Hàng',
      render: (o) => (
        <div>
          <div style={{ fontWeight: '600', color: '#193B2C', fontSize: '12.5px' }}>
            {o.customer?.full_name || 'Khách vãng lai'}
          </div>
          <div style={{ fontSize: '11px', color: '#7D8E82' }}>
            {o.customer?.phone || o.customer?.email}
          </div>
        </div>
      ),
    },
    {
      key: 'pickup_code',
      header: 'Mã Lấy Hàng',
      render: (o) => (
        <span
          style={{
            fontFamily: 'monospace',
            fontWeight: '800',
            color: '#0369A1',
            background: '#E0F2FE',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          {o.pickup_code || '---'}
        </span>
      ),
    },
    {
      key: 'final_amount',
      header: 'Giá Trị',
      render: (o) => (
        <span style={{ fontWeight: '800', color: '#166B4A', fontSize: '13.5px' }}>
          {Number(o.final_amount).toLocaleString()} đ
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng Thái',
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      key: 'actions',
      header: 'Chi Tiết',
      align: 'right',
      render: (o) => (
        <button
          onClick={() => setSelectedOrder(o)}
          style={{
            padding: '6px 12px',
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
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PageHeader
        title="Giám Sát Đơn Hàng & Lấy Hàng (Orders & Pickup)"
        subtitle="Theo dõi tiến độ nhận túi thời gian thực, mã QR lấy hàng và xử lý đơn quá hạn no-show"
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
            placeholder="Tìm theo mã đơn, mã nhận, khách, quán..."
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
          {(['ALL', 'CONFIRMED', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'] as const).map((st) => (
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
        data={filteredOrders}
        keyExtractor={(o) => o.id}
        emptyMessage="Không có đơn hàng nào phù hợp bộ lọc."
        emptyIcon={ShoppingBag}
        pageSize={8}
      />

      {/* Modal chi tiết đơn hàng */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'grid', placeItems: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '18px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#166B4A', textTransform: 'uppercase' }}>Chi tiết đơn hàng</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#193B2C' }}>
                  #{selectedOrder.order_number}
                </h2>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7D8E82' }}>✕</button>
            </div>

            <div style={{ background: '#FAF8F4', padding: '16px', borderRadius: '12px', border: '1px solid #D9D5CB', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div><strong>Túi cứu trợ:</strong> {selectedOrder.bag_name || 'Túi Bất Ngờ'}</div>
              <div><strong>Cửa hàng:</strong> {selectedOrder.store?.name} ({selectedOrder.store?.address})</div>
              <div><strong>Khách hàng:</strong> {selectedOrder.customer?.full_name} - {selectedOrder.customer?.phone}</div>
              <div><strong>Khung giờ lấy:</strong> {selectedOrder.pickup_time || '19:00 - 21:00'}</div>
              <div><strong>Mã nhận hàng (Pickup Code):</strong> <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#0369A1' }}>{selectedOrder.pickup_code || '---'}</span></div>
              <div><strong>Số tiền thanh toán:</strong> <span style={{ fontWeight: '800', color: '#166B4A' }}>{Number(selectedOrder.final_amount).toLocaleString()} đ</span></div>
              <div><strong>Trạng thái:</strong> <StatusBadge status={selectedOrder.status} size="sm" /></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedOrder.status !== 'COMPLETED' && selectedOrder.status !== 'CANCELLED' && (
                  <>
                    <button
                      disabled={updating}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
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
                      <CheckCircle size={13} /> Hoàn tất đơn
                    </button>
                    <button
                      disabled={updating}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #FECACA',
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
                      <XCircle size={13} /> Hủy đơn
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D9D5CB',
                  background: '#fff',
                  color: '#526458',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
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
