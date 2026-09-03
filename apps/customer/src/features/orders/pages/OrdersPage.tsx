import React, { useState } from 'react';
import { QrCode, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button, EmptyState, Dialog } from '@gosavingfood/ui';
import type { CustomerOrder } from '../../../shared/types/customer.types';

interface OrdersPageProps {
  orders: CustomerOrder[];
  onGoHome: () => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ orders, onGoHome }) => {
  const [filter, setFilter] = useState<'pending' | 'history'>('pending');
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);

  const displayedOrders = orders.filter((order) =>
    filter === 'pending'
      ? order.status === 'ready'
      : order.status === 'completed' || order.status === 'cancelled'
  );

  return (
    <div className="customer-page-orders">
      <div className="customer-orders-header">
        <h2 className="customer-page-title">Đơn hàng của bạn</h2>
      </div>

      {/* Tabs filter */}
      <div className="customer-orders-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'pending'}
          className={`customer-tab-btn ${filter === 'pending' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Chờ nhận món ({orders.filter(o => o.status === 'ready').length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'history'}
          className={`customer-tab-btn ${filter === 'history' ? 'customer-tab-btn--active' : ''}`}
          onClick={() => setFilter('history')}
        >
          Lịch sử đơn
        </button>
      </div>

      {displayedOrders.length === 0 ? (
        <EmptyState
          title={filter === 'pending' ? 'Không có đơn hàng chờ nhận' : 'Chưa có lịch sử đơn hàng'}
          description={
            filter === 'pending'
              ? 'Bạn chưa có suất ăn nào đang chờ lấy hôm nay. Hãy ghé trang chủ để khám phá món ngon giá tốt!'
              : 'Các đơn hàng đã hoàn tất trong quá khứ sẽ hiển thị tại đây.'
          }
          action={
            <Button variant="primary" size="md" onClick={onGoHome}>
              Đặt món ngay
            </Button>
          }
        />
      ) : (
        <div className="customer-orders-list">
          {displayedOrders.map((order) => (
            <Card key={order.id} className="customer-order-card">
              <div className="customer-order-top">
                <div>
                  <div className="customer-order-shop">{order.shopName}</div>
                  <div className="customer-order-code">Mã: #{order.orderCode}</div>
                </div>
                <Badge
                  variant={order.status === 'ready' ? 'warning' : 'success'}
                >
                  {order.status === 'ready' ? 'Chờ lấy món' : 'Đã nhận thành công'}
                </Badge>
              </div>

              <div className="customer-order-items">
                {order.items.map((it) => (
                  <div key={it.product.id} className="customer-order-item-row">
                    <span>
                      {it.quantity}x {it.product.title}
                    </span>
                    <span className="customer-order-item-price">
                      {(it.product.rescuePrice * it.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
              </div>

              <div className="customer-order-details">
                <div className="customer-order-detail-row">
                  <Clock size={15} strokeWidth={2} />
                  <span>Khung giờ lấy: <strong>{order.pickupTime}</strong></span>
                </div>
                <div className="customer-order-detail-row">
                  <MapPin size={15} strokeWidth={2} />
                  <span>{order.pickupAddress}</span>
                </div>
              </div>

              <div className="customer-order-bottom">
                <div>
                  <span className="customer-order-total-label">Tổng thanh toán: </span>
                  <strong className="customer-order-total-val">
                    {order.totalAmount.toLocaleString('vi-VN')}đ
                  </strong>
                </div>

                {order.status === 'ready' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    leftIcon={<QrCode size={16} strokeWidth={2} />}
                  >
                    Mã nhận hàng
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal hiển thị mã nhận món */}
      {selectedOrder && (
        <Dialog
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title="Mã nhận suất ăn"
          footer={
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setSelectedOrder(null)}
            >
              Đóng
            </Button>
          }
        >
          <div className="customer-qr-modal-content">
            <div className="customer-qr-icon-wrap">
              <CheckCircle2 size={40} className="customer-green-text" />
            </div>
            <p className="customer-qr-desc">
              Vui lòng đến <strong>{selectedOrder.shopName}</strong> và đưa mã này cho nhân viên khi thanh toán:
            </p>

            <div className="customer-pickup-code-box">
              <span className="customer-pickup-code-label">MÃ LẤY HÀNG CỦA BẠN</span>
              <span className="customer-pickup-code-text">{selectedOrder.orderCode}</span>
            </div>

            <div className="customer-qr-info-group">
              <div>
                <strong>Khung giờ:</strong> {selectedOrder.pickupTime}
              </div>
              <div>
                <strong>Địa chỉ:</strong> {selectedOrder.pickupAddress}
              </div>
              <div>
                <strong>Thanh toán tại quán:</strong>{' '}
                <span className="customer-highlight-price">
                  {selectedOrder.totalAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
