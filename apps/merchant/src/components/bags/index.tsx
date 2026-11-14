import { Camera, ChevronDown, ImagePlus, Loader2, PackageOpen, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useAiBagDraft, type AiDraftStatus } from '../../hooks/useAiBagDraft';
import { PRESET_BAG_CATEGORIES } from '../../mocks';
import { compressImageToBlob, optimizeImageUrl } from '../../utils/browser';
import type { BagInput, BagItem } from '../../types';
import { getBagCategory, getVnTimeMinutes, parseTimeToMinutes, type BagTabCategory } from '../../utils/bagTiming';
import type { DiscountSuggestion } from '../../utils/discountSuggestion';
import { Button, Field, Modal, SelectField, TextAreaField } from '../ui';

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
            Trên kệ {onShelfCount !== undefined ? `(${onShelfCount})` : ''}
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
            Hết hạn {expiredCount !== undefined ? `(${expiredCount})` : ''}
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

  let statusLabel: string;
  let badgeVariant: string;

  if (category === 'expired') {
    statusLabel = 'Hết hạn';
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
        statusLabel = 'Hết giờ';
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
    const qty = bag.availableQuantity ?? bag.quantity ?? 0;
    if (qty <= 0) {
      statusLabel = 'Hết hàng';
      badgeVariant = 'sold_out';
    } else if (bag.bagType !== 'shelf_life') {
      const nowMinutes = getVnTimeMinutes();
      const startM = parseTimeToMinutes(bag.pickupTimeStart);
      if (nowMinutes < startM) {
        statusLabel = `Sắp mở (${bag.pickupTimeStart})`;
        badgeVariant = 'upcoming';
      } else {
        statusLabel = 'Đang bán';
        badgeVariant = 'active';
      }
    } else {
      statusLabel = 'Đang bán';
      badgeVariant = 'active';
    }
  }

  const timeDisplay = `${bag.pickupTimeStart} - ${bag.pickupTimeEnd}`;

  return (
    <article className={`merchant-bag-card ${!isOnShelf ? 'merchant-bag-card--off-shelf' : ''}`}>
      <div className="merchant-bag-card-media">
        <img src={optimizeImageUrl(bag.imageUrl, 400, 75)} alt={bag.name} loading="lazy" />
      </div>
      <div className="merchant-bag-card-content">
        {/* Hàng 1: Tên món + Status pill */}
        <div className="merchant-bag-card-header">
          <h3 className="merchant-bag-card-title" title={bag.name}>
            {bag.name}
          </h3>
          <span className={`merchant-bag-status-pill merchant-bag-status-pill--${badgeVariant}`}>
            {statusLabel}
          </span>
        </div>

        {/* Hàng 2: Giá & Giờ (bên trái) + Số lượng (bên phải) */}
        <div className="merchant-bag-card-info-row">
          <div className="merchant-bag-card-pricing-time">
            <span className="merchant-bag-original-price">
              <s>{bag.originalPrice.toLocaleString('vi-VN')}đ</s>
            </span>
            <span className="merchant-bag-sale-price">
              {bag.salePrice.toLocaleString('vi-VN')}đ
            </span>
            <span className="merchant-bag-time-range" title={timeDisplay}>
              {timeDisplay}
            </span>
          </div>
          <div className="merchant-bag-card-qty-wrap">
            <span
              className="merchant-bag-qty-pill"
              style={(bag.availableQuantity ?? bag.quantity ?? 0) <= 0 ? { background: '#ef4444', boxShadow: 'none' } : undefined}
            >
              Số lượng: {bag.availableQuantity ?? bag.quantity ?? 0}
            </span>
          </div>
        </div>

        {/* Cụm nút hành động */}
        <div className="merchant-bag-card-actions">
          {category !== 'expired' ? (
            <button
              type="button"
              className={`merchant-bag-btn-toggle ${isOnShelf ? 'is-on-shelf' : ''}`}
              onClick={() => {
                const qty = bag.availableQuantity ?? bag.quantity ?? 0;
                if (qty <= 0) {
                  onEdit(bag);
                  return;
                }
                if (!isOnShelf) {
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
              {isOnShelf
                ? (bag.availableQuantity ?? bag.quantity ?? 0) <= 0
                  ? 'Nạp thêm túi'
                  : 'Gỡ khỏi kệ'
                : (bag.availableQuantity ?? bag.quantity ?? 0) <= 0
                ? 'Nạp thêm túi'
                : bag.bagType !== 'shelf_life' && getVnTimeMinutes() > parseTimeToMinutes(bag.pickupTimeEnd)
                ? 'Chỉnh giờ mở'
                : 'Đưa lên kệ'}
            </button>
          ) : (
            <div className="merchant-bag-expired-bar">Đã hết hạn</div>
          )}

          <div className="merchant-bag-card-action-subrow">
            <button
              type="button"
              className="merchant-bag-btn-delete"
              onClick={() => onDelete(bag)}
              title="Xóa túi hàng này"
            >
              Xóa túi
            </button>
            <button
              type="button"
              className="merchant-bag-btn-edit"
              onClick={() => onEdit(bag)}
            >
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

const HOURS_24: string[] = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60: string[] = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function TimeUnitPicker({
  value,
  options,
  title,
  ariaLabel,
  onCommit,
}: {
  value: string;
  options: string[];
  title: string;
  ariaLabel: string;
  onCommit: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [valueInputs, setValueInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (valueInputs === null || [value].some((value, index) => !Object.is(value, valueInputs[index]))) {
    setValueInputs([value]);

    setInputValue(value);

  }

  // Đóng dropdown khi click/chạm ra ngoài
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Tự động cuộn đến mục đang chọn khi vừa mở
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedEl = listRef.current.querySelector('.is-selected') as HTMLElement | null;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'center' });
      }
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setInputValue(raw);
    if (raw.length === 2) {
      onCommit(raw);
    }
  };

  const handleInputBlur = () => {
    onCommit(inputValue);
  };

  const handleSelectOption = (opt: string) => {
    setInputValue(opt);
    onCommit(opt);
    setIsOpen(false);
  };

  return (
    <div className="merchant-time-unit" ref={containerRef}>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => setIsOpen(false)}
        className="merchant-time-num-input"
        title={title}
        aria-label={ariaLabel}
      />
      <button
        type="button"
        className="merchant-time-dropdown-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Mở danh sách ${ariaLabel}`}
        aria-expanded={isOpen}
      >
        <ChevronDown
          size={12}
          className={`merchant-time-select-icon ${isOpen ? 'is-open' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="merchant-time-dropdown-popover" ref={listRef} role="listbox">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`merchant-time-dropdown-item ${opt === value ? 'is-selected' : ''}`}
              onClick={() => handleSelectOption(opt)}
              role="option"
              aria-selected={opt === value}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const safeH = h?.padStart(2, '0') || '18';
  const safeM = m?.padStart(2, '0') || '00';

  const commitHour = (newH: string) => {
    let parsedH = parseInt(newH, 10);
    if (isNaN(parsedH) || parsedH < 0) parsedH = 0;
    if (parsedH > 24) parsedH = 24;
    const formattedH = String(parsedH).padStart(2, '0');
    onChange(`${formattedH}:${safeM}`);
  };

  const commitMinute = (newM: string) => {
    let parsedM = parseInt(newM, 10);
    if (isNaN(parsedM) || parsedM < 0) parsedM = 0;
    if (parsedM > 59) parsedM = 59;
    const formattedM = String(parsedM).padStart(2, '0');
    onChange(`${safeH}:${formattedM}`);
  };

  return (
    <div className="merchant-time-picker-group" aria-label={ariaLabel}>
      <TimeUnitPicker
        value={safeH}
        options={HOURS_24}
        title="Nhập giờ (00-24)"
        ariaLabel="Giờ"
        onCommit={commitHour}
      />
      <span className="merchant-time-colon">:</span>
      <TimeUnitPicker
        value={safeM}
        options={MINUTES_60}
        title="Nhập phút (00-59)"
        ariaLabel="Phút"
        onCommit={commitMinute}
      />
    </div>
  );
}

/**
 * Khối "AI Đăng Hàng" — chụp 1 ảnh, AI điền sẵn form. Chỉ hiển thị khi TẠO túi mới.
 * Hoàn toàn tùy chọn: chủ quán vẫn có thể bỏ qua và nhập tay như cũ.
 */
function AiQuickFillPanel({
  status,
  error,
  discount,
  onPickFile,
}: {
  status: AiDraftStatus;
  error: string | null;
  discount: DiscountSuggestion | null;
  onPickFile: (file: File) => void;
}) {
  const analyzing = status === 'analyzing';
  return (
    <div
      style={{
        border: '1.5px dashed #86efac',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', fontWeight: 800, fontSize: 14 }}>
        <Sparkles size={18} />
        <span>AI Đăng Hàng</span>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.45 }}>
        Chụp 1 ảnh món còn dư — AI tự điền tên, loại, mô tả, hạn dùng và gợi ý mức giảm giá. Bạn chỉ cần kiểm tra rồi bấm tạo.
      </p>
      <label
        aria-disabled={analyzing}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 46,
          borderRadius: 12,
          background: analyzing ? '#94a3b8' : 'var(--primary)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          cursor: analyzing ? 'wait' : 'pointer',
          pointerEvents: analyzing ? 'none' : 'auto',
        }}
      >
        {analyzing ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
        <span>{analyzing ? 'AI đang đọc ảnh…' : status === 'done' ? 'Chụp lại ảnh khác' : 'Chụp ảnh để AI điền giúp'}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          disabled={analyzing}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPickFile(file);
          }}
        />
      </label>
      {status === 'done' && discount && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '9px 12px',
            fontSize: 12.5,
            color: '#14532d',
            lineHeight: 1.45,
          }}
        >
          <strong>💡 Gợi ý giảm {discount.percent}%</strong> — {discount.reason}
          <div style={{ color: '#64748b', marginTop: 4 }}>AI đã điền sẵn form bên dưới. Hãy kiểm tra giá gốc & số lượng rồi bấm “Tạo túi hàng”.</div>
        </div>
      )}
      {status === 'error' && error && (
        <div style={{ fontSize: 12.5, color: '#b91c1c', fontWeight: 600 }}>
          ⚠️ {error} <span style={{ color: '#64748b', fontWeight: 500 }}>Bạn vẫn có thể nhập tay bên dưới.</span>
        </div>
      )}
    </div>
  );
}

export function BagEditorModal({ bag, open, saving, onClose, onSubmit, storeId }: { bag?: BagItem; open: boolean; saving: boolean; onClose: () => void; onSubmit: (input: BagInput) => void; storeId?: string }) {
  const [minimumExpiryDate, setMinimumExpiryDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  useEffect(() => {
    const timer = window.setInterval(() => setMinimumExpiryDate(new Date(Date.now() + 86400000).toISOString().split('T')[0]), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const aiDraft = useAiBagDraft(storeId);
  const showAiPanel = !bag && Boolean(storeId);
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
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [draftInputs, setDraftInputs] = useState<readonly unknown[] | null>(null);
  // Reset the draft/cache when its inputs change, before committing stale UI.
  if (draftInputs === null || [bag, open].some((value, index) => !Object.is(value, draftInputs[index]))) {
    setDraftInputs([bag, open]);

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
      setImageBlob(null);
      setImageError(null);
      setFormError(null);
      aiDraft.reset();
      if (!bag && storeId) aiDraft.warmUp();
    }
  }

  const applyAiPhoto = async (file: File) => {
    const draft = await aiDraft.analyze(file);
    if (!draft) return;
    setFormError(null);
    setImageError(null);
    setName(draft.name);
    setCategory(draft.category);
    setDescription(draft.description);
    setBagType(draft.bagType);
    if (draft.bagType === 'shelf_life') setExpiryDate(draft.expiryDate);
    setPickupTimeStart(draft.pickupTimeStart);
    setPickupTimeEnd(draft.pickupTimeEnd);
    setImageBlob(draft.imageBlob);
    setImageUrls([draft.previewUrl]);
    setPricingMode('discount');
    setDiscountPercent(String(draft.discount.percent));
    if (draft.originalPrice && draft.salePrice) {
      setOriginalPrice(String(draft.originalPrice));
      setSalePrice(String(draft.salePrice));
    } else if (Number(originalPrice) > 0) {
      setSalePrice(String(Math.max(0, Math.round(Number(originalPrice) * (1 - draft.discount.percent / 100)))));
    }
    setQuantity((q) => q || '1');
  };

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
    const file = event.target.files[0];
    const compressed = await compressImageToBlob(file, 640, 0.8);
    if (compressed) {
      setImageBlob(compressed.blob);
      setImageUrls([compressed.previewUrl]);
      setImageError(null);
    }
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
      imageBlob: imageBlob || undefined,
      pickupTimeStart,
      pickupTimeEnd,
      bagType,
      repeatMode: bagType === 'daily' ? repeatMode : undefined,
      dailyQuota: bagType === 'daily' && repeatMode === 'recurring' ? (Number(dailyQuota) || qty) : undefined,
      expiryDate: bagType === 'shelf_life' ? expiryDate : undefined,
    });
  };

  return (
    <Modal open={open} title={bag ? 'Chỉnh sửa túi hàng' : 'Tạo túi hàng mới'} onClose={onClose}>
      <form className="merchant-form" onSubmit={submit}>
        {showAiPanel && (
          <AiQuickFillPanel
            status={aiDraft.status}
            error={aiDraft.error}
            discount={aiDraft.lastDraft?.discount ?? null}
            onPickFile={(file) => void applyAiPhoto(file)}
          />
        )}
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

        <TextAreaField
          label={
            <>
              Mô tả chi tiết <b style={{ color: 'var(--danger)' }}>*</b>
            </>
          }
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Khách hàng có thể nhận được gì trong túi hàng này?"
          required
        />

        <div className="merchant-field">
          <span>
            Loại mặt hàng <b style={{ color: 'var(--danger)' }}>*</b>
          </span>
          <div className="merchant-segmented-control">
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

        {bagType === 'daily' ? (
          <div className="merchant-field">
            <span>Chế độ lặp</span>
            <div className="merchant-segmented-control">
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
          </div>
        ) : (
          <Field
            label={
              <>
                Hạn sử dụng <b style={{ color: 'var(--danger)' }}>*</b>
              </>
            }
            type="date"
            value={expiryDate}
            min={minimumExpiryDate}
            onChange={(event) => setExpiryDate(event.target.value)}
            required
          />
        )}

        {/* Khung giờ nhận hàng - Chỉ 1 lớp viền ngoài */}
        <div className="merchant-field">
          <span>
            {bagType === 'daily' ? 'Khung giờ nhận túi hôm nay' : 'Giờ nhận hàng'}{' '}
            <b style={{ color: 'var(--danger)' }}>*</b>
          </span>
          <div className="merchant-field-control merchant-time-range-control">
            <MerchantTimePicker
              value={pickupTimeStart}
              onChange={setPickupTimeStart}
              ariaLabel="Giờ bắt đầu nhận"
            />
            <span className="merchant-time-dash">—</span>
            <MerchantTimePicker
              value={pickupTimeEnd}
              onChange={setPickupTimeEnd}
              ariaLabel="Giờ kết thúc nhận"
            />
          </div>
        </div>

        <div className="merchant-field">
          <div style={{ display: 'flex', alignItems: 'center', height: 24 }}>
            <span>
              Giá gốc <b style={{ color: 'var(--danger)' }}>*</b>
            </span>
          </div>
          <div className="merchant-field-control">
            <input
              type="number"
              min="1"
              placeholder="Ví dụ: 120000"
              value={originalPrice}
              onChange={(event) => handleOriginalPriceChange(event.target.value)}
              required
            />
            <span className="merchant-field-suffix" style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
              đ
            </span>
          </div>
        </div>

        <div className="merchant-field">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 24 }}>
            <span>
              Giá giải cứu <b style={{ color: 'var(--danger)' }}>*</b>
            </span>
            <div className="merchant-pricing-mode-inline">
              <button
                type="button"
                className={pricingMode === 'amount' ? 'is-active' : ''}
                onClick={() => setPricingMode('amount')}
                title="Nhập số tiền VNĐ"
              >
                VNĐ
              </button>
              <button
                type="button"
                className={pricingMode === 'discount' ? 'is-active' : ''}
                onClick={() => setPricingMode('discount')}
                title="Nhập phần trăm %"
              >
                % Giảm
              </button>
            </div>
          </div>
          <div className="merchant-field-control">
            <input
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
            <span className="merchant-field-suffix" style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
              {pricingMode === 'amount' ? 'đ' : '%'}
            </span>
          </div>
        </div>

        <div className="merchant-field">
          <div style={{ display: 'flex', alignItems: 'center', height: 24 }}>
            <span>
              Số lượng <b style={{ color: 'var(--danger)' }}>*</b>
            </span>
          </div>
          <div className="merchant-field-control">
            <input
              type="number"
              min="1"
              placeholder="Ví dụ: 5"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
            <span className="merchant-field-suffix" style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
              túi
            </span>
          </div>
        </div>

        {/* Hiển thị mức tiết kiệm trực quan nếu có giá hợp lệ */}
        {Number(originalPrice) > 0 && Number(salePrice) > 0 && Number(originalPrice) > Number(salePrice) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 10,
              fontSize: 12.5,
              color: 'var(--primary)',
              fontWeight: 600,
              marginTop: -6,
            }}
          >
            <span>💡 Khách hàng tiết kiệm:</span>
            <strong>{(Number(originalPrice) - Number(salePrice)).toLocaleString('vi-VN')} đ</strong>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>
              (-{Math.round(((Number(originalPrice) - Number(salePrice)) / Number(originalPrice)) * 100)}%)
            </span>
          </div>
        )}

        {/* Nhóm 4: Hình ảnh túi hàng */}
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
