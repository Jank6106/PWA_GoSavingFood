import { ChevronDown, Clock3, Eye, EyeOff, ImagePlus, Package, PackageOpen, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { PRESET_BAG_CATEGORIES } from '../../mocks';
import { compressImageFile, optimizeImageUrl } from '../../services/utils';
import type { BagInput, BagItem } from '../../types';
import { getBagCategory, getVnTimeMinutes, parseTimeToMinutes, type BagTabCategory } from '../../utils/bagTiming';
import { Button, Field, Modal, SelectField, TextAreaField } from '../ui';

const readImageFiles = async (files: FileList) => {
  const list = Array.from(files).filter((file) => file.type.startsWith('image/'));
  const results = await Promise.all(list.map((file) => compressImageFile(file, 800, 0.75)));
  return results.filter((url): url is string => Boolean(url));
};

export function BagFilterBar({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  onShelfCount,
  inStorageCount,
  expiredCount,
  onOpenCreateModal,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  statusFilter?: BagTabCategory;
  onStatusFilterChange?: (filter: BagTabCategory) => void;
  onShelfCount?: number;
  inStorageCount?: number;
  expiredCount?: number;
  onOpenCreateModal: () => void;
}) {
  return (
    <div className="merchant-bag-filter-container">
      <div className="merchant-filter-bar">
        <label className="merchant-search">
          <Search size={19} />
          <input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Tìm túi hàng hoặc danh mục..."
          />
        </label>
        <Button onClick={onOpenCreateModal}>
          <Plus size={18} /> Tạo túi mới
        </Button>
      </div>
      {statusFilter && onStatusFilterChange && (
        <div className="merchant-status-tabs">
          <button
            type="button"
            className={statusFilter === 'on_shelf' ? 'is-active' : ''}
            onClick={() => onStatusFilterChange('on_shelf')}
          >
            Trên kệ hàng {onShelfCount !== undefined ? `(${onShelfCount})` : ''}
          </button>
          <button
            type="button"
            className={statusFilter === 'in_storage' ? 'is-active' : ''}
            onClick={() => onStatusFilterChange('in_storage')}
          >
            Trong kho {inStorageCount !== undefined ? `(${inStorageCount})` : ''}
          </button>
          <button
            type="button"
            className={statusFilter === 'expired' ? 'is-active' : ''}
            onClick={() => onStatusFilterChange('expired')}
          >
            Hàng hết hạn {expiredCount !== undefined ? `(${expiredCount})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export function BagCard({
  bag,
  onToggleStatus,
  onEdit,
  onDelete,
}: {
  bag: BagItem;
  onToggleStatus: (id: string) => void;
  onIncreaseQuantity?: (id: string) => void;
  onDecreaseQuantity?: (id: string) => void;
  onEdit: (bag: BagItem) => void;
  onDelete: (bag: BagItem) => void;
}) {
  const category = getBagCategory(bag);
  const isOnShelf = category === 'on_shelf';

  let statusLabel = 'Đang mở bán';
  let badgeVariant = 'active';

  if (category === 'expired') {
    statusLabel = 'Hết hạn sử dụng';
    badgeVariant = 'expired';
  } else if (category === 'in_storage') {
    if (bag.status === 'hidden') {
      statusLabel = 'Đã gỡ kệ';
      badgeVariant = 'hidden';
    } else if ((bag.availableQuantity ?? bag.quantity ?? 0) <= 0) {
      statusLabel = 'Hết hàng';
      badgeVariant = 'sold_out';
    } else if (bag.bagType !== 'shelf_life') {
      const nowMinutes = getVnTimeMinutes();
      const endM = parseTimeToMinutes(bag.pickupTimeEnd);
      if (nowMinutes > endM) {
        statusLabel = 'Hết giờ hôm nay';
        badgeVariant = 'closed';
      } else {
        statusLabel = 'Trong kho';
        badgeVariant = 'hidden';
      }
    } else {
      statusLabel = 'Trong kho';
      badgeVariant = 'hidden';
    }
  } else {
    // Trên kệ hàng (on_shelf)
    if (bag.bagType !== 'shelf_life') {
      const nowMinutes = getVnTimeMinutes();
      const startM = parseTimeToMinutes(bag.pickupTimeStart);
      if (nowMinutes < startM) {
        statusLabel = `Sắp mở (${bag.pickupTimeStart})`;
        badgeVariant = 'upcoming';
      } else {
        statusLabel = 'Đang mở bán';
        badgeVariant = 'active';
      }
    } else {
      statusLabel = 'Đang mở bán';
      badgeVariant = 'active';
    }
  }

  return (
    <article className={`merchant-card merchant-product-card ${!isOnShelf ? 'merchant-product-card--off-shelf' : ''}`}>
      <img src={optimizeImageUrl(bag.imageUrl, 400, 75)} alt={bag.name} loading="lazy" />
      <div className="merchant-product-main">
        <div className="merchant-card-title-row">
          <div>
            <span className="merchant-eyebrow">{bag.category}</span>
            <h3>{bag.name}</h3>
          </div>
          <span className={`merchant-badge merchant-badge--${badgeVariant}`}>
            {statusLabel}
          </span>
        </div>
        <p className="merchant-clamp">{bag.description}</p>
        <div className="merchant-product-meta">
          <span>
            <Tag size={14} />
            <s>{bag.originalPrice.toLocaleString('vi-VN')}đ</s>
            <strong>{bag.salePrice.toLocaleString('vi-VN')}đ</strong>
          </span>
          <span>
            <Clock3 size={14} />{' '}
            {bag.bagType === 'shelf_life'
              ? `HSD: ${bag.expiryDate ? bag.expiryDate.split('-').reverse().slice(0, 2).join('/') : 'Nhiều ngày'} (${bag.pickupTimeStart}–${bag.pickupTimeEnd})`
              : `${bag.repeatMode === 'recurring' ? 'Hàng ngày' : 'Hôm nay'}: ${bag.pickupTimeStart}–${bag.pickupTimeEnd}`}
          </span>
        </div>
        <footer>
          <div
            className="merchant-quantity"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              background: (bag.availableQuantity ?? bag.quantity ?? 0) > 0 ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${(bag.availableQuantity ?? bag.quantity ?? 0) > 0 ? '#a7f3d0' : '#fecaca'}`,
            }}
          >
            <Package
              size={15}
              style={{
                color: (bag.availableQuantity ?? bag.quantity ?? 0) > 0 ? '#059669' : '#dc2626',
              }}
            />
            <strong
              style={{
                fontSize: '15px',
                color: (bag.availableQuantity ?? bag.quantity ?? 0) > 0 ? '#065f46' : '#b91c1c',
              }}
            >
              {bag.availableQuantity ?? bag.quantity ?? 0}
            </strong>
            <small
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: (bag.availableQuantity ?? bag.quantity ?? 0) > 0 ? '#047857' : '#dc2626',
              }}
            >
              túi còn lại
            </small>
          </div>
          <div className="merchant-card-actions">
            {category !== 'expired' && (
              <Button
                size="small"
                variant={isOnShelf ? 'secondary' : 'primary'}
                onClick={() => {
                  if (!isOnShelf) {
                    const qty = bag.availableQuantity ?? bag.quantity ?? 0;
                    if (qty <= 0) {
                      onEdit(bag);
                      return;
                    }
                    if (bag.bagType !== 'shelf_life') {
                      const nowMinutes = getVnTimeMinutes();
                      const endM = parseTimeToMinutes(bag.pickupTimeEnd);
                      if (nowMinutes > endM) {
                        onEdit(bag);
                        return;
                      }
                    }
                  }
                  onToggleStatus(bag.id);
                }}
              >
                {isOnShelf ? <EyeOff size={16} /> : <Eye size={16} />}
                {isOnShelf
                  ? 'Gỡ khỏi kệ'
                  : (bag.availableQuantity ?? bag.quantity ?? 0) <= 0
                  ? 'Nạp thêm túi'
                  : bag.bagType !== 'shelf_life' && getVnTimeMinutes() > parseTimeToMinutes(bag.pickupTimeEnd)
                  ? 'Chỉnh giờ mở'
                  : 'Đưa lên kệ'}
              </Button>
            )}
            <Button size="small" variant="outline" onClick={() => onEdit(bag)}>
              <Pencil size={15} /> Sửa
            </Button>
            <Button
              size="small"
              variant="danger"
              onClick={() => onDelete(bag)}
              title="Xóa hoàn toàn túi này"
            >
              <Trash2 size={15} /> Xóa túi
            </Button>
          </div>
        </footer>
      </div>
    </article>
  );
}

const HOURS_24: string[] = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60: string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function MerchantTimePicker({
  value,
  onChange,
  ariaLabel = 'Thời gian',
}: {
  value: string;
  onChange: (val: string) => void;
  ariaLabel?: string;
}) {
  const [h, m] = (value || '18:00').split(':');
  const [hourInput, setHourInput] = useState(h?.padStart(2, '0') || '18');
  const [minuteInput, setMinuteInput] = useState(m?.padStart(2, '0') || '00');

  useEffect(() => {
    const [curH, curM] = (value || '18:00').split(':');
    setHourInput(curH?.padStart(2, '0') || '18');
    setMinuteInput(curM?.padStart(2, '0') || '00');
  }, [value]);

  const commitTime = (nextH: string, nextM: string) => {
    let parsedH = parseInt(nextH, 10);
    if (isNaN(parsedH) || parsedH < 0) parsedH = 0;
    if (parsedH > 24) parsedH = 24;

    let parsedM = parseInt(nextM, 10);
    if (isNaN(parsedM) || parsedM < 0) parsedM = 0;
    if (parsedM > 59) parsedM = 59;

    const formattedH = String(parsedH).padStart(2, '0');
    const formattedM = String(parsedM).padStart(2, '0');

    setHourInput(formattedH);
    setMinuteInput(formattedM);
    onChange(`${formattedH}:${formattedM}`);
  };

  const handleHourChange = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    setHourInput(clean);
    if (clean.length === 2) {
      commitTime(clean, minuteInput);
    }
  };

  const handleHourBlur = () => {
    commitTime(hourInput, minuteInput);
  };

  const handleMinuteChange = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 2);
    setMinuteInput(clean);
    if (clean.length === 2) {
      commitTime(hourInput, clean);
    }
  };

  const handleMinuteBlur = () => {
    commitTime(hourInput, minuteInput);
  };

  return (
    <div className="merchant-time-picker-group" aria-label={ariaLabel}>
      <div className="merchant-time-unit">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hourInput}
          onChange={(e) => handleHourChange(e.target.value)}
          onBlur={handleHourBlur}
          className="merchant-time-num-input"
          title="Nhập giờ (00-24)"
          aria-label="Nhập giờ"
        />
        <div className="merchant-time-select-wrap">
          <ChevronDown size={11} className="merchant-time-select-icon" />
          <select
            value={hourInput.padStart(2, '0')}
            onChange={(e) => commitTime(e.target.value, minuteInput)}
            className="merchant-time-native-select"
            aria-label="Chọn giờ"
          >
            {HOURS_24.map((hour) => (
              <option key={hour} value={hour}>
                {hour}
              </option>
            ))}
          </select>
        </div>
      </div>

      <span className="merchant-time-colon">:</span>

      <div className="merchant-time-unit">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={minuteInput}
          onChange={(e) => handleMinuteChange(e.target.value)}
          onBlur={handleMinuteBlur}
          className="merchant-time-num-input"
          title="Nhập phút (00-59)"
          aria-label="Nhập phút"
        />
        <div className="merchant-time-select-wrap">
          <ChevronDown size={11} className="merchant-time-select-icon" />
          <select
            value={minuteInput.padStart(2, '0')}
            onChange={(e) => commitTime(hourInput, e.target.value)}
            className="merchant-time-native-select"
            aria-label="Chọn phút"
          >
            {MINUTES_60.map((minute) => (
              <option key={minute} value={minute}>
                {minute}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export function BagEditorModal({ bag, open, saving, onClose, onSubmit }: { bag?: BagItem; open: boolean; saving: boolean; onClose: () => void; onSubmit: (input: BagInput) => void }) {
  const [name, setName] = useState(bag?.name ?? '');
  const [category, setCategory] = useState(bag?.category ?? PRESET_BAG_CATEGORIES[0]);
  const [bagType, setBagType] = useState<'daily' | 'shelf_life'>(bag?.bagType ?? 'daily');
  const [repeatMode, setRepeatMode] = useState<'today_only' | 'recurring'>(bag?.repeatMode ?? 'today_only');
  const [dailyQuota, setDailyQuota] = useState(bag?.dailyQuota ? String(bag.dailyQuota) : '');
  const [expiryDate, setExpiryDate] = useState(bag?.expiryDate ?? '');
  const [description, setDescription] = useState(bag?.description ?? '');
  const [originalPrice, setOriginalPrice] = useState(bag ? String(bag.originalPrice) : '');
  const [pricingMode, setPricingMode] = useState<'amount' | 'discount'>('amount');
  const [salePrice, setSalePrice] = useState(bag ? String(bag.salePrice) : '');
  const [discountPercent, setDiscountPercent] = useState(
    bag ? String(bag.originalPrice > 0 ? Math.round((1 - bag.salePrice / bag.originalPrice) * 100) : 60) : ''
  );
  const [quantity, setQuantity] = useState(bag ? String(bag.availableQuantity ?? bag.quantity) : '');
  const [pickupTimeStart, setPickupTimeStart] = useState(bag?.pickupTimeStart ?? '18:00');
  const [pickupTimeEnd, setPickupTimeEnd] = useState(bag?.pickupTimeEnd ?? '20:00');
  const [imageUrls, setImageUrls] = useState<string[]>(bag?.imageUrls?.length ? bag.imageUrls : (bag?.imageUrl ? [bag.imageUrl] : []));
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(bag?.name ?? '');
      setCategory(bag?.category ?? PRESET_BAG_CATEGORIES[0]);
      setBagType(bag?.bagType ?? 'daily');
      setRepeatMode(bag?.repeatMode ?? 'today_only');
      setDailyQuota(bag?.dailyQuota ? String(bag.dailyQuota) : '');
      setExpiryDate(bag?.expiryDate ?? '');
      setDescription(bag?.description ?? '');
      setOriginalPrice(bag ? String(bag.originalPrice) : '');
      setSalePrice(bag ? String(bag.salePrice) : '');
      setDiscountPercent(
        bag ? String(bag.originalPrice > 0 ? Math.round((1 - bag.salePrice / bag.originalPrice) * 100) : 60) : ''
      );
      setQuantity(bag ? String(bag.availableQuantity ?? bag.quantity) : '');
      setPickupTimeStart(bag?.pickupTimeStart ?? '18:00');
      setPickupTimeEnd(bag?.pickupTimeEnd ?? '20:00');
      setImageUrls(bag?.imageUrls?.length ? bag.imageUrls : (bag?.imageUrl ? [bag.imageUrl] : []));
      setImageError(null);
      setFormError(null);
    }
  }, [bag, open]);

  const handleOriginalPriceChange = (val: string) => {
    setOriginalPrice(val);
    const orig = Number(val);
    if (orig > 0 && pricingMode === 'discount' && discountPercent) {
      const disc = Number(discountPercent);
      setSalePrice(String(Math.round(orig * (1 - disc / 100))));
    } else if (orig > 0 && salePrice) {
      setDiscountPercent(String(Math.max(0, Math.round((1 - Number(salePrice) / orig) * 100))));
    }
  };

  const handleSalePriceChange = (val: string) => {
    setSalePrice(val);
    const orig = Number(originalPrice);
    if (orig > 0 && val) {
      setDiscountPercent(String(Math.max(0, Math.round((1 - Number(val) / orig) * 100))));
    }
  };

  const handleDiscountChange = (val: string) => {
    setDiscountPercent(val);
    const orig = Number(originalPrice);
    if (orig > 0 && val) {
      setSalePrice(String(Math.max(0, Math.round(orig * (1 - Number(val) / 100)))));
    }
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const files = await readImageFiles(event.target.files);
    setImageUrls((current) => [...current, ...files]);
    setImageError(null);
    event.target.value = '';
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setImageError(null);

    if (imageUrls.length === 0) {
      setImageError('Vui lòng tải lên ít nhất 1 ảnh cho túi hàng.');
      return;
    }

    const original = Number(originalPrice);
    if (!originalPrice || isNaN(original) || original <= 0) {
      setFormError('Giá gốc phải là số dương lớn hơn 0.');
      return;
    }

    const calculatedPrice =
      pricingMode === 'discount'
        ? Math.round(original * (1 - Number(discountPercent || 0) / 100))
        : Number(salePrice);

    if (isNaN(calculatedPrice) || calculatedPrice <= 0) {
      setFormError('Vui lòng nhập giá giải cứu hợp lệ.');
      return;
    }

    if (calculatedPrice >= original) {
      setFormError('Giá giải cứu phải nhỏ hơn giá gốc (ít nhất 1.000đ).');
      return;
    }

    const qty = Number(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      setFormError('Số lượng túi phải lớn hơn 0.');
      return;
    }

    if (pickupTimeStart >= pickupTimeEnd) {
      setFormError('Giờ kết thúc nhận hàng phải sau giờ bắt đầu (Ví dụ: 18:00 - 20:00).');
      return;
    }

    if (bagType === 'shelf_life' && !expiryDate) {
      setFormError('Vui lòng chọn ngày hết hạn sử dụng cho sản phẩm.');
      return;
    }

    onSubmit({
      name,
      category,
      description,
      originalPrice: original,
      salePrice: Math.max(0, calculatedPrice),
      quantity: qty,
      imageUrl: imageUrls[0],
      imageUrls: imageUrls,
      pickupTimeStart,
      pickupTimeEnd,
      bagType,
      repeatMode: bagType === 'daily' ? repeatMode : undefined,
      dailyQuota: bagType === 'daily' && repeatMode === 'recurring' ? (Number(dailyQuota) || qty) : undefined,
      expiryDate: bagType === 'shelf_life' ? expiryDate : undefined,
    });
  };

  return (
    <Modal open={open} title={bag ? 'Chỉnh sửa túi hàng' : 'Tạo túi hàng mới'} onClose={onClose} size="large">
      <form className="merchant-form" onSubmit={submit}>
        {formError && (
          <div
            style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: 10,
              color: '#b91c1c',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            ⚠️ {formError}
          </div>
        )}
        <div className="merchant-form-grid">
          <Field
            label={
              <>
                Tên túi hàng <b style={{ color: 'var(--danger)' }}>*</b>
              </>
            }
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ví dụ: Túi bánh tươi cuối ngày"
            required
          />
          <SelectField
            label={
              <>
                Danh mục <b style={{ color: 'var(--danger)' }}>*</b>
              </>
            }
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {PRESET_BAG_CATEGORIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </SelectField>
        </div>

        {/* 1. Chọn loại mặt hàng */}
        <div className="merchant-field">
          <span>
            Loại mặt hàng <b style={{ color: 'var(--danger)' }}>*</b>
          </span>
          <div className="merchant-pricing-mode" style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={bagType === 'daily' ? 'is-active' : ''}
              onClick={() => setBagType('daily')}
            >
              Dùng trong ngày
            </button>
            <button
              type="button"
              className={bagType === 'shelf_life' ? 'is-active' : ''}
              onClick={() => setBagType('shelf_life')}
            >
              Có hạn sử dụng
            </button>
          </div>
        </div>

        {/* 2. Cấu hình thời gian theo loại mặt hàng */}
        {bagType === 'daily' ? (
          <div className="merchant-form-grid" style={{ marginTop: 6 }}>
            <div className="merchant-field">
              <span>
                Khung giờ nhận túi hôm nay <b style={{ color: 'var(--danger)' }}>*</b>
              </span>
              <div className="merchant-field-control merchant-time-range-control">
                <MerchantTimePicker
                  value={pickupTimeStart}
                  onChange={setPickupTimeStart}
                  ariaLabel="Giờ bắt đầu nhận"
                />
                <span className="merchant-time-dash">-</span>
                <MerchantTimePicker
                  value={pickupTimeEnd}
                  onChange={setPickupTimeEnd}
                  ariaLabel="Giờ kết thúc nhận"
                />
              </div>
            </div>

            <div className="merchant-field">
              <span>Chế độ lặp</span>
              <div className="merchant-pricing-mode" style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={repeatMode === 'today_only' ? 'is-active' : ''}
                  onClick={() => setRepeatMode('today_only')}
                >
                  Chỉ hôm nay
                </button>
                <button
                  type="button"
                  className={repeatMode === 'recurring' ? 'is-active' : ''}
                  onClick={() => setRepeatMode('recurring')}
                >
                  Mọi ngày
                </button>
              </div>
              <small style={{ color: '#64748b', marginTop: 4, display: 'block', fontSize: 11 }}>
                {repeatMode === 'today_only'
                  ? '*Hết giờ nhận sẽ tự chuyển vào lưu trữ.'
                  : '*Cố định khung giờ, tự nạp lại kho vào 00h01 mỗi ngày.'}
              </small>
            </div>
          </div>
        ) : (
          <div className="merchant-form-grid" style={{ marginTop: 6 }}>
            <Field
              label={
                <>
                  Hạn sử dụng <b style={{ color: 'var(--danger)' }}>*</b>
                </>
              }
              type="date"
              value={expiryDate}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              onChange={(event) => setExpiryDate(event.target.value)}
              required
            />
            <div className="merchant-field">
              <span>
                Khung giờ khách lấy hàng mỗi ngày <b style={{ color: 'var(--danger)' }}>*</b>
              </span>
              <div className="merchant-field-control merchant-time-range-control">
                <MerchantTimePicker
                  value={pickupTimeStart}
                  onChange={setPickupTimeStart}
                  ariaLabel="Giờ bắt đầu nhận"
                />
                <span className="merchant-time-dash">-</span>
                <MerchantTimePicker
                  value={pickupTimeEnd}
                  onChange={setPickupTimeEnd}
                  ariaLabel="Giờ kết thúc nhận"
                />
              </div>
              <small style={{ color: '#64748b', marginTop: 4, display: 'block', fontSize: 11 }}>
                *Mở bán liên tục đến hết ngày HSD (23:59:59).
              </small>
            </div>
          </div>
        )}
        <TextAreaField
          label={
            <>
              Mô tả <b style={{ color: 'var(--danger)' }}>*</b>
            </>
          }
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Khách hàng có thể nhận được gì?"
          required
        />
        <div className="merchant-form-grid merchant-form-grid--three">
          <Field
            label={
              <>
                Giá gốc <b style={{ color: 'var(--danger)' }}>*</b>
              </>
            }
            type="number"
            min="1"
            placeholder="Ví dụ: 120000"
            value={originalPrice}
            onChange={(event) => handleOriginalPriceChange(event.target.value)}
            required
          />
          <div className="merchant-pricing-field">
            <span>
              Giá giải cứu <b style={{ color: 'var(--danger)' }}>*</b>
            </span>
            <div className="merchant-pricing-mode">
              <button
                type="button"
                className={pricingMode === 'amount' ? 'is-active' : ''}
                onClick={() => setPricingMode('amount')}
              >
                Nhập giá
              </button>
              <button
                type="button"
                className={pricingMode === 'discount' ? 'is-active' : ''}
                onClick={() => setPricingMode('discount')}
              >
                Chiết khấu %
              </button>
            </div>
            <Field
              label={
                <>
                  {pricingMode === 'amount' ? 'Giá cụ thể' : 'Giảm giá'}{' '}
                  <b style={{ color: 'var(--danger)' }}>*</b>
                </>
              }
              type="number"
              min="0"
              max={pricingMode === 'discount' ? '100' : undefined}
              placeholder={pricingMode === 'amount' ? 'Ví dụ: 45000' : 'Ví dụ: 60'}
              value={pricingMode === 'amount' ? salePrice : discountPercent}
              onChange={(event) =>
                pricingMode === 'amount'
                  ? handleSalePriceChange(event.target.value)
                  : handleDiscountChange(event.target.value)
              }
              required
            />
          </div>
          <Field
            label={
              <>
                Số lượng <b style={{ color: 'var(--danger)' }}>*</b>
              </>
            }
            type="number"
            min="1"
            placeholder="Ví dụ: 5"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </div>
        <div className="merchant-field">
          <span>
            Hình ảnh túi hàng <b style={{ color: 'var(--danger)' }}>*</b>
          </span>
          <label className={`merchant-upload-box ${imageError ? 'has-error' : ''}`}>
            <ImagePlus size={22} />
            <span>Chọn ảnh từ thiết bị</span>
            <small>Bắt buộc tải lên ít nhất 1 ảnh (JPG, PNG, WebP)</small>
            <input type="file" accept="image/*" multiple onChange={(event) => void uploadFiles(event)} />
          </label>
          {imageError && <small>{imageError}</small>}
        </div>
        {imageUrls.length > 0 && (
          <div className="merchant-upload-preview">
            {imageUrls.map((image, index) => (
              <div key={`${image}-${index}`}>
                <img src={optimizeImageUrl(image, 200, 75)} alt={`Ảnh túi hàng ${index + 1}`} loading="lazy" />
                <button
                  type="button"
                  aria-label="Xóa ảnh"
                  onClick={() => {
                    const next = imageUrls.filter((_, imageIndex) => imageIndex !== index);
                    setImageUrls(next);
                    if (next.length === 0) {
                      setImageError('Vui lòng tải lên ít nhất 1 ảnh cho túi hàng.');
                    }
                  }}
                >
                  <X size={14} />
                </button>
                {index === 0 && <span>Ảnh bìa</span>}
              </div>
            ))}
          </div>
        )}
        <div className="merchant-form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            {bag ? 'Lưu thay đổi' : 'Tạo túi hàng'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteBagConfirmModal({
  bag,
  open,
  saving,
  onClose,
  onConfirm,
}: {
  bag: BagItem | null;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void> | void;
}) {
  if (!bag) return null;

  return (
    <Modal
      open={open}
      title="Xóa túi hàng"
      description={`Túi hàng: ${bag.name}`}
      onClose={onClose}
      size="small"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            padding: '12px',
            background: 'var(--danger-soft)',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            color: 'var(--danger)',
            fontSize: '13px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <Trash2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            Bạn có chắc chắn muốn xóa hoàn toàn túi <strong>{bag.name}</strong> không? Hành động này sẽ xóa vĩnh viễn túi hàng khỏi hệ thống và không thể khôi phục.
          </span>
        </div>
        <div className="merchant-form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={saving}
            onClick={() => onConfirm(bag.id)}
          >
            <Trash2 size={15} /> Xác nhận xóa
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const BagEmptyIcon = PackageOpen;
