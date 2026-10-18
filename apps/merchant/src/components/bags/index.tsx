import { Clock3, Eye, EyeOff, ImagePlus, Minus, PackageOpen, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { PRESET_BAG_CATEGORIES } from '../../mocks';
import { compressImageFile, optimizeImageUrl } from '../../services/utils';
import type { BagInput, BagItem } from '../../types';
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
  allCount,
  onShelfCount,
  offShelfCount,
  onOpenCreateModal,
}: {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  statusFilter?: 'all' | 'on_shelf' | 'off_shelf';
  onStatusFilterChange?: (filter: 'all' | 'on_shelf' | 'off_shelf') => void;
  allCount?: number;
  onShelfCount?: number;
  offShelfCount?: number;
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
            className={statusFilter === 'all' ? 'is-active' : ''}
            onClick={() => onStatusFilterChange('all')}
          >
            Tất cả {allCount !== undefined ? `(${allCount})` : ''}
          </button>
          <button
            type="button"
            className={statusFilter === 'on_shelf' ? 'is-active' : ''}
            onClick={() => onStatusFilterChange('on_shelf')}
          >
            Đang lên kệ {onShelfCount !== undefined ? `(${onShelfCount})` : ''}
          </button>
          <button
            type="button"
            className={statusFilter === 'off_shelf' ? 'is-active' : ''}
            onClick={() => onStatusFilterChange('off_shelf')}
          >
            Đã gỡ kệ {offShelfCount !== undefined ? `(${offShelfCount})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}

export function BagCard({
  bag,
  onToggleStatus,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onEdit,
  onDelete,
}: {
  bag: BagItem;
  onToggleStatus: (id: string) => void;
  onIncreaseQuantity: (id: string) => void;
  onDecreaseQuantity: (id: string) => void;
  onEdit: (bag: BagItem) => void;
  onDelete: (bag: BagItem) => void;
}) {
  const isOnShelf = bag.status !== 'hidden';
  const statusLabel = isOnShelf
    ? bag.status === 'active'
      ? 'Đang lên kệ'
      : 'Hết hàng'
    : 'Đã gỡ kệ';

  return (
    <article className={`merchant-card merchant-product-card ${!isOnShelf ? 'merchant-product-card--off-shelf' : ''}`}>
      <img src={optimizeImageUrl(bag.imageUrl, 400, 75)} alt={bag.name} loading="lazy" />
      <div className="merchant-product-main">
        <div className="merchant-card-title-row">
          <div>
            <span className="merchant-eyebrow">{bag.category}</span>
            <h3>{bag.name}</h3>
          </div>
          <span className={`merchant-badge merchant-badge--${bag.status}`}>
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
            <Clock3 size={14} /> {bag.pickupTimeStart}–{bag.pickupTimeEnd}
          </span>
        </div>
        <footer>
          <div className="merchant-quantity">
            <button
              type="button"
              onClick={() => onDecreaseQuantity(bag.id)}
              aria-label="Giảm số lượng"
            >
              <Minus size={16} />
            </button>
            <strong>{bag.availableQuantity}</strong>
            <button
              type="button"
              onClick={() => onIncreaseQuantity(bag.id)}
              aria-label="Tăng số lượng"
            >
              <Plus size={16} />
            </button>
            <small>túi còn lại</small>
          </div>
          <div className="merchant-card-actions">
            <Button
              size="small"
              variant={isOnShelf ? 'secondary' : 'primary'}
              onClick={() => onToggleStatus(bag.id)}
            >
              {isOnShelf ? <EyeOff size={16} /> : <Eye size={16} />}
              {isOnShelf ? 'Gỡ khỏi kệ' : 'Đưa lên kệ'}
            </Button>
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

const TIME_OPTIONS_24H: string[] = [];
for (let h = 0; h < 24; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_OPTIONS_24H.push(`${hh}:00`, `${hh}:15`, `${hh}:30`, `${hh}:45`);
}

export function BagEditorModal({ bag, open, saving, onClose, onSubmit }: { bag?: BagItem; open: boolean; saving: boolean; onClose: () => void; onSubmit: (input: BagInput) => void }) {
  const [name, setName] = useState(bag?.name ?? '');
  const [category, setCategory] = useState(bag?.category ?? PRESET_BAG_CATEGORIES[0]);
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

  useEffect(() => {
    if (open) {
      setName(bag?.name ?? '');
      setCategory(bag?.category ?? PRESET_BAG_CATEGORIES[0]);
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
    if (imageUrls.length === 0) {
      setImageError('Vui lòng tải lên ít nhất 1 ảnh cho túi hàng.');
      return;
    }
    setImageError(null);
    const original = Number(originalPrice);
    if (!originalPrice || isNaN(original) || original <= 0) {
      return;
    }
    const calculatedPrice =
      pricingMode === 'discount'
        ? Math.round(original * (1 - Number(discountPercent || 0) / 100))
        : Number(salePrice);
    if (pricingMode === 'amount' && (!salePrice || Number(salePrice) < 0)) {
      return;
    }
    const qty = Number(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
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
    });
  };

  return (
    <Modal open={open} title={bag ? 'Chỉnh sửa túi hàng' : 'Tạo túi hàng mới'} onClose={onClose} size="large">
      <form className="merchant-form" onSubmit={submit}>
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
        <div className="merchant-form-grid">
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
          <div className="merchant-field">
            <span>
              Bắt đầu - Kết thúc <b style={{ color: 'var(--danger)' }}>*</b>
            </span>
            <div className="merchant-field-control merchant-time-range-control">
              <select
                value={pickupTimeStart}
                onChange={(event) => setPickupTimeStart(event.target.value)}
                aria-label="Giờ bắt đầu nhận (24h)"
                required
              >
                {TIME_OPTIONS_24H.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
                {!TIME_OPTIONS_24H.includes(pickupTimeStart) && (
                  <option value={pickupTimeStart}>{pickupTimeStart}</option>
                )}
              </select>
              <span className="merchant-time-dash">-</span>
              <select
                value={pickupTimeEnd}
                onChange={(event) => setPickupTimeEnd(event.target.value)}
                aria-label="Giờ kết thúc nhận (24h)"
                required
              >
                {TIME_OPTIONS_24H.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
                {!TIME_OPTIONS_24H.includes(pickupTimeEnd) && (
                  <option value={pickupTimeEnd}>{pickupTimeEnd}</option>
                )}
              </select>
            </div>
          </div>
        </div>
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
