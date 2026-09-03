import React from 'react';
import { Trash2, Plus, Minus, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button, Card, EmptyState } from '@gosavingfood/ui';
import type { CartItem } from '../../../shared/types/customer.types';

interface CartPageProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  onGoHome: () => void;
  isCheckingOut?: boolean;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onGoHome,
  isCheckingOut = false,
}) => {
  const originalTotal = cart.reduce(
    (sum, item) => sum + item.product.originalPrice * item.quantity,
    0
  );
  const rescueTotal = cart.reduce(
    (sum, item) => sum + item.product.rescuePrice * item.quantity,
    0
  );
  const savedAmount = originalTotal - rescueTotal;

  if (cart.length === 0) {
    return (
      <div className="customer-page-cart">
        <EmptyState
          title="Giỏ hàng của bạn đang trống"
          description="Rất nhiều tiệm bánh và nhà hàng đang chờ bạn chung tay giải cứu thực phẩm tươi ngon hôm nay."
          action={
            <Button variant="primary" size="md" onClick={onGoHome}>
              Khám phá món ngon ngay
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="customer-page-cart">
      <div className="customer-cart-header">
        <h2 className="customer-page-title">Giỏ hàng của bạn</h2>
        <span className="customer-cart-item-count">{cart.length} món ăn</span>
      </div>

      <div className="customer-cart-list">
        {cart.map((item) => (
          <Card key={item.product.id} className="customer-cart-card">
            <div className="customer-cart-item-body">
              <div className="customer-cart-item-icon" aria-hidden="true">
                {item.product.icon}
              </div>

              <div className="customer-cart-item-info">
                <div className="customer-cart-item-shop">{item.product.shopName}</div>
                <h4 className="customer-cart-item-title">{item.product.title}</h4>
                <div className="customer-cart-item-pickup">
                  Khung giờ: {item.product.pickupTime}
                </div>
                <div className="customer-cart-item-pricing">
                  <span className="customer-cart-rescue-price">
                    {(item.product.rescuePrice * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                  <span className="customer-cart-original-price">
                    {(item.product.originalPrice * item.quantity).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <div className="customer-cart-item-actions">
                <button
                  type="button"
                  className="customer-cart-remove-btn"
                  onClick={() => onRemoveItem(item.product.id)}
                  aria-label={`Xóa ${item.product.title}`}
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>

                <div className="customer-qty-control">
                  <button
                    type="button"
                    className="customer-qty-btn"
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity - 1)
                    }
                    aria-label="Giảm số lượng"
                  >
                    <Minus size={14} strokeWidth={2.5} />
                  </button>
                  <span className="customer-qty-value">{item.quantity}</span>
                  <button
                    type="button"
                    className="customer-qty-btn"
                    disabled={item.quantity >= item.product.stock}
                    onClick={() =>
                      onUpdateQuantity(item.product.id, item.quantity + 1)
                    }
                    aria-label="Tăng số lượng"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tóm tắt thanh toán */}
      <Card className="customer-cart-summary">
        <h3 className="customer-summary-title">Tóm tắt đơn hàng</h3>
        <div className="customer-summary-row">
          <span>Giá gốc ban đầu</span>
          <span className="customer-summary-striked">
            {originalTotal.toLocaleString('vi-VN')}đ
          </span>
        </div>
        <div className="customer-summary-row customer-summary-row--green">
          <span>Tiết kiệm được</span>
          <span>-{savedAmount.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="customer-summary-divider" />
        <div className="customer-summary-row customer-summary-row--total">
          <span>Tổng thanh toán</span>
          <span className="customer-summary-price">
            {rescueTotal.toLocaleString('vi-VN')}đ
          </span>
        </div>

        <div className="customer-summary-badge">
          <ShieldCheck size={16} strokeWidth={2} />
          <span>Thanh toán trực tiếp tại quán khi nhận món ăn</span>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isCheckingOut}
          onClick={onCheckout}
          rightIcon={<ArrowRight size={18} strokeWidth={2} />}
        >
          Xác nhận đặt suất ăn
        </Button>
      </Card>
    </div>
  );
};
