import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Package,
} from 'lucide-react';
import type { SurpriseBag } from '../../../shared/types/customer.types';
import type { FinderResult } from '../../../shared/types/finder.types';
import { CATEGORY_LABELS, NEUTRAL_BAG_PLACEHOLDER } from '../constants';

interface FinderResultCardProps {
  result: FinderResult;
  onOpenBag: (bag: SurpriseBag) => void;
}

export const FinderResultCard: React.FC<FinderResultCardProps> = ({
  result,
  onOpenBag,
}) => {
  const { bag, merchant, quantity, totalPrice, distanceKm, reasons } = result;
  const [imgError, setImgError] = useState(false);

  // Tính toán mức giảm giá an toàn, kiểm tra tính hữu hạn và trường hợp miễn phí 0đ
  const isOriginalValid = Number.isFinite(bag.originalPrice) && bag.originalPrice > 0;
  const isDiscountValid = Number.isFinite(bag.discountPrice) && bag.discountPrice >= 0;
  const hasDiscount = isOriginalValid && isDiscountValid && bag.originalPrice > bag.discountPrice;
  const isFree = isDiscountValid && bag.discountPrice === 0;
  const discountPercent = hasDiscount
    ? isFree
      ? 100
      : Math.round((1 - bag.discountPrice / bag.originalPrice) * 100)
    : 0;

  // Xử lý khoảng cách: Tuyệt đối không bịa khoảng cách (NO fake distance)
  const distanceLabel =
    distanceKm !== null && distanceKm !== undefined && Number.isFinite(distanceKm)
      ? distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(1)} km`
      : 'Chưa có khoảng cách';

  // Giờ nhận: Không default bừa bãi, nếu thiếu phải ghi rõ chưa xác nhận
  const pickupLabel =
    bag.pickupStart && bag.pickupEnd
      ? `Hôm nay ${bag.pickupStart.slice(0, 5)} - ${bag.pickupEnd.slice(0, 5)}`
      : 'Khung giờ nhận: Chưa xác nhận';

  // HSD: Chỉ field expiryDate mới là HSD xác nhận; không suy đoán từ expiresAt hay trong ngày
  const expiryLabel = bag.expiryDate
    ? `HSD: ${bag.expiryDate}`
    : 'Hạn sử dụng: Chưa được cửa hàng xác nhận';

  const storeName = merchant?.name || bag.merchantName;
  const isOutOfStock = bag.quantity <= 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Không kích hoạt nếu bấm vào button (tránh duplicate calls)
    const isButton = (e.target as HTMLElement).closest('button');
    if (!isButton) {
      onOpenBag(bag);
    }
  };

  const hasPhoto = !imgError && Boolean(bag.imageUrl);

  return (
    <div
      className={`gsf-finder-card ${isOutOfStock ? 'is-out-of-stock' : ''}`}
      onClick={handleCardClick}
    >
      {/* Khối hình ảnh: Ảnh thật từ bag.imageUrl hoặc placeholder trung tính */}
      <div className="gsf-finder-card-media">
        <img
          src={hasPhoto ? bag.imageUrl : NEUTRAL_BAG_PLACEHOLDER}
          alt={hasPhoto ? bag.name : 'Chưa có ảnh món'}
          className="gsf-finder-card-image"
          loading="lazy"
          onError={() => setImgError(true)}
        />
        {discountPercent > 0 && (
          <span className="gsf-finder-card-discount-badge" aria-label={`Giảm ${discountPercent}%`}>
            {isFree ? 'Miễn phí' : `-${discountPercent}%`}
          </span>
        )}
        {bag.catalogSource === 'demo' && (
          <span className="gsf-finder-card-demo-badge" title="Dữ liệu thử nghiệm, không đại diện đối tác thật">
            Dữ liệu demo
          </span>
        )}
        <span
          className={`gsf-finder-card-stock-badge ${isOutOfStock ? 'is-empty' : ''}`}
          aria-label={`Tồn kho: ${isOutOfStock ? 'Hết suất' : `Còn ${bag.quantity} túi`}`}
        >
          <Package size={12} className="gsf-finder-inline-icon" aria-hidden="true" />
          <span>{isOutOfStock ? 'Hết suất' : `Còn ${bag.quantity} túi`}</span>
        </span>
      </div>

      {/* Khối thông tin chi tiết */}
      <div className="gsf-finder-card-content">
        {/* Tên quán và khoảng cách */}
        <div className="gsf-finder-card-header">
          <span className="gsf-finder-card-store" title={storeName}>
            {storeName}
          </span>
          <span
            className="gsf-finder-card-distance"
            title={`Khoảng cách: ${distanceLabel}`}
          >
            <MapPin size={12} className="gsf-finder-inline-icon" aria-hidden="true" />
            <span>{distanceLabel}</span>
          </span>
        </div>

        {/* Tên túi & phân loại */}
        <div className="gsf-finder-card-title-row">
          <h4 className="gsf-finder-card-title">{bag.name}</h4>
          <div className="gsf-finder-card-tags">
            {bag.category && (
              <span className="gsf-finder-card-category-tag">
                {CATEGORY_LABELS[bag.category] || bag.category}
              </span>
            )}
            {bag.bagType === 'daily' && (
              <span className="gsf-finder-card-category-tag gsf-finder-card-category-tag--daily" title="Túi thực phẩm dư trong ngày">
                Túi dùng trong ngày
              </span>
            )}
          </div>
        </div>

        {/* Giá đơn vị & Tổng tiền theo số lượng */}
        <div className="gsf-finder-card-pricing-row">
          <div className="gsf-finder-card-price-block">
            <span className="gsf-finder-card-current-price">
              {Number.isFinite(bag.discountPrice) ? `${bag.discountPrice.toLocaleString('vi-VN')}đ` : 'Chưa có giá'}
            </span>
            {hasDiscount && (
              <span className="gsf-finder-card-original-price">
                {bag.originalPrice.toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>
          <div className="gsf-finder-card-total-badge">
            {quantity > 1 ? (
              <span>
                Gợi ý <strong>{quantity} túi</strong> • Tổng:{' '}
                <strong>{totalPrice.toLocaleString('vi-VN')}đ</strong>
              </span>
            ) : (
              <span>
                Tổng: <strong>{totalPrice.toLocaleString('vi-VN')}đ</strong> (1 túi)
              </span>
            )}
          </div>
        </div>

        {/* Giờ nhận và HSD tách riêng biệt (Strict Hackathon Requirement) */}
        <div className="gsf-finder-card-time-row">
          <div className="gsf-finder-time-item gsf-finder-time-item--pickup">
            <Clock size={13} className="gsf-finder-inline-icon" aria-hidden="true" />
            <span>
              <strong>Nhận hàng:</strong> {pickupLabel}
            </span>
          </div>
          <div className="gsf-finder-time-item gsf-finder-time-item--expiry">
            <Calendar size={13} className="gsf-finder-inline-icon" aria-hidden="true" />
            <span>{expiryLabel}</span>
          </div>
        </div>

        {/* Lý do phù hợp (reasons) */}
        {reasons && reasons.length > 0 && (
          <div className="gsf-finder-card-reasons" aria-label="Lý do phù hợp">
            {reasons.map((reason, idx) => (
              <span key={idx} className="gsf-finder-reason-pill">
                <CheckCircle2 size={12} className="gsf-finder-reason-icon" aria-hidden="true" />
                <span>{reason}</span>
              </span>
            ))}
          </div>
        )}

        {/* Nút Xem chi tiết: Điểm tương tác duy nhất qua bàn phím (tránh duplicate events) */}
        <div className="gsf-finder-card-actions">
          <button
            type="button"
            className="gsf-finder-card-cta-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenBag(bag);
            }}
            aria-label={`Xem chi tiết túi ${bag.name}`}
          >
            <span>Xem chi tiết</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};
