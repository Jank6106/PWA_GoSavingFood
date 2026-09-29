import { Clock3, Eye, EyeOff, ImagePlus, Minus, PackageOpen, Pencil, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { PRESET_BAG_CATEGORIES, PRESET_BAG_IMAGES } from '../../mocks';
import type { BagInput, BagItem } from '../../types';
import { Button, Field, Modal, SelectField, TextAreaField } from '../ui';

const readImageFiles = async (files: FileList) => Promise.all(Array.from(files).filter((file) => file.type.startsWith('image/')).map((file) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('Không thể đọc ảnh.')); reader.readAsDataURL(file); })));

export function BagFilterBar({ searchQuery, onSearchQueryChange, onOpenCreateModal }: { searchQuery: string; onSearchQueryChange: (value: string) => void; onOpenCreateModal: () => void }) {
  return <div className="merchant-filter-bar"><label className="merchant-search"><Search size={19} /><input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Tìm túi hàng hoặc danh mục..." /></label><Button onClick={onOpenCreateModal}><Plus size={18} /> Tạo túi mới</Button></div>;
}

export function BagCard({ bag, onToggleStatus, onIncreaseQuantity, onDecreaseQuantity, onOpenDetails, onEdit }: { bag: BagItem; onToggleStatus: (id: string) => void; onIncreaseQuantity: (id: string) => void; onDecreaseQuantity: (id: string) => void; onOpenDetails: (bag: BagItem) => void; onEdit: (bag: BagItem) => void }) {
  const statusLabel = bag.status === 'active' ? 'Đang bán' : bag.status === 'sold_out' ? 'Hết hàng' : 'Đã gỡ kệ';
  const isOnShelf = bag.status !== 'hidden';
  return <article className="merchant-card merchant-product-card"><img src={bag.imageUrl} alt={bag.name} /><div className="merchant-product-main"><div className="merchant-card-title-row"><div><span className="merchant-eyebrow">{bag.category}</span><h3>{bag.name}</h3></div><span className={`merchant-badge merchant-badge--${bag.status}`}>{statusLabel}</span></div><p className="merchant-clamp">{bag.description}</p><div className="merchant-product-meta"><span><Tag size={14} /><s>{bag.originalPrice.toLocaleString('vi-VN')}đ</s><strong>{bag.salePrice.toLocaleString('vi-VN')}đ</strong></span><span><Clock3 size={14} /> {bag.pickupTimeStart}–{bag.pickupTimeEnd}</span></div><footer><div className="merchant-quantity"><button type="button" onClick={() => onDecreaseQuantity(bag.id)} aria-label="Giảm số lượng"><Minus size={16} /></button><strong>{bag.availableQuantity}</strong><button type="button" onClick={() => onIncreaseQuantity(bag.id)} aria-label="Tăng số lượng"><Plus size={16} /></button><small>túi còn lại</small></div><div className="merchant-card-actions"><Button size="small" variant="secondary" onClick={() => onToggleStatus(bag.id)}>{isOnShelf ? <EyeOff size={16} /> : <Eye size={16} />}{isOnShelf ? 'Gỡ khỏi kệ' : 'Đưa lên kệ'}</Button><Button size="small" variant="outline" onClick={() => onEdit(bag)}><Pencil size={15} /> Sửa</Button><Button size="small" variant="ghost" onClick={() => onOpenDetails(bag)}>Chi tiết</Button></div></footer></div></article>;
}

export function BagEditorModal({ bag, open, saving, onClose, onSubmit }: { bag?: BagItem; open: boolean; saving: boolean; onClose: () => void; onSubmit: (input: BagInput) => void }) {
  const [name, setName] = useState(bag?.name ?? '');
  const [category, setCategory] = useState(bag?.category ?? PRESET_BAG_CATEGORIES[0]);
  const [description, setDescription] = useState(bag?.description ?? '');
  const [originalPrice, setOriginalPrice] = useState(String(bag?.originalPrice ?? 120000));
  const [pricingMode, setPricingMode] = useState<'amount' | 'discount'>('amount');
  const [salePrice, setSalePrice] = useState(String(bag?.salePrice ?? 45000));
  const [discountPercent, setDiscountPercent] = useState(String(bag ? Math.round((1 - bag.salePrice / bag.originalPrice) * 100) : 60));
  const [quantity, setQuantity] = useState(String(bag?.availableQuantity ?? bag?.quantity ?? 5));
  const [pickupTimeStart, setPickupTimeStart] = useState(bag?.pickupTimeStart ?? '18:00');
  const [pickupTimeEnd, setPickupTimeEnd] = useState(bag?.pickupTimeEnd ?? '20:00');
  const [imageUrls, setImageUrls] = useState<string[]>(bag?.imageUrls?.length ? bag.imageUrls : [bag?.imageUrl ?? PRESET_BAG_IMAGES[0]]);

  useEffect(() => {
    if (open) {
      setName(bag?.name ?? '');
      setCategory(bag?.category ?? PRESET_BAG_CATEGORIES[0]);
      setDescription(bag?.description ?? '');
      const orig = bag?.originalPrice ?? 120000;
      const sale = bag?.salePrice ?? 45000;
      setOriginalPrice(String(orig));
      setSalePrice(String(sale));
      setDiscountPercent(String(orig > 0 ? Math.round((1 - sale / orig) * 100) : 60));
      setQuantity(String(bag?.availableQuantity ?? bag?.quantity ?? 5));
      setPickupTimeStart(bag?.pickupTimeStart ?? '18:00');
      setPickupTimeEnd(bag?.pickupTimeEnd ?? '20:00');
      setImageUrls(bag?.imageUrls?.length ? bag.imageUrls : [bag?.imageUrl ?? PRESET_BAG_IMAGES[0]]);
    }
  }, [bag, open]);

  const handleOriginalPriceChange = (val: string) => {
    setOriginalPrice(val);
    const orig = Number(val);
    if (orig > 0 && pricingMode === 'discount') {
      const disc = Number(discountPercent);
      setSalePrice(String(Math.round(orig * (1 - disc / 100))));
    } else if (orig > 0) {
      setDiscountPercent(String(Math.max(0, Math.round((1 - Number(salePrice) / orig) * 100))));
    }
  };

  const handleSalePriceChange = (val: string) => {
    setSalePrice(val);
    const orig = Number(originalPrice);
    if (orig > 0) {
      setDiscountPercent(String(Math.max(0, Math.round((1 - Number(val) / orig) * 100))));
    }
  };

  const handleDiscountChange = (val: string) => {
    setDiscountPercent(val);
    const orig = Number(originalPrice);
    if (orig > 0) {
      setSalePrice(String(Math.max(0, Math.round(orig * (1 - Number(val) / 100)))));
    }
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;
    const files = await readImageFiles(event.target.files);
    setImageUrls((current) => {
      const filtered = current.filter((img) => !PRESET_BAG_IMAGES.includes(img));
      return [...files, ...filtered];
    });
    event.target.value = '';
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const original = Number(originalPrice);
    const calculatedPrice = pricingMode === 'discount' ? Math.round(original * (1 - Number(discountPercent) / 100)) : Number(salePrice);
    onSubmit({
      name,
      category,
      description,
      originalPrice: original,
      salePrice: Math.max(0, calculatedPrice),
      quantity: Number(quantity),
      imageUrl: imageUrls[0] ?? PRESET_BAG_IMAGES[0],
      imageUrls: imageUrls.length ? imageUrls : [PRESET_BAG_IMAGES[0]],
      pickupTimeStart,
      pickupTimeEnd
    });
  };

  return <Modal open={open} title={bag ? 'Chỉnh sửa túi hàng' : 'Tạo túi hàng mới'} onClose={onClose} size="large"><form className="merchant-form" onSubmit={submit}><Field label="Tên túi hàng" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Túi bánh tươi cuối ngày" required /><div className="merchant-form-grid"><SelectField label="Danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>{PRESET_BAG_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</SelectField><div className="merchant-time-fields"><Field label="Bắt đầu nhận" type="time" value={pickupTimeStart} onChange={(event) => setPickupTimeStart(event.target.value)} required /><Field label="Kết thúc nhận" type="time" value={pickupTimeEnd} onChange={(event) => setPickupTimeEnd(event.target.value)} required /></div></div><TextAreaField label="Mô tả" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Khách hàng có thể nhận được gì?" required /><div className="merchant-form-grid merchant-form-grid--three"><Field label="Giá gốc" type="number" min="0" value={originalPrice} onChange={(event) => handleOriginalPriceChange(event.target.value)} required /><div className="merchant-pricing-field"><span>Giá giải cứu</span><div className="merchant-pricing-mode"><button type="button" className={pricingMode === 'amount' ? 'is-active' : ''} onClick={() => setPricingMode('amount')}>Nhập giá</button><button type="button" className={pricingMode === 'discount' ? 'is-active' : ''} onClick={() => setPricingMode('discount')}>Chiết khấu %</button></div><Field label={pricingMode === 'amount' ? 'Giá cụ thể' : 'Giảm giá'} type="number" min="0" max={pricingMode === 'discount' ? '100' : undefined} value={pricingMode === 'amount' ? salePrice : discountPercent} onChange={(event) => pricingMode === 'amount' ? handleSalePriceChange(event.target.value) : handleDiscountChange(event.target.value)} required /></div><Field label="Số lượng" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div><label className="merchant-upload-box"><ImagePlus size={22} /><span>Chọn ảnh từ thiết bị</span><small>Có thể chọn nhiều ảnh JPG, PNG hoặc WebP</small><input type="file" accept="image/*" multiple onChange={(event) => void uploadFiles(event)} /></label><div className="merchant-upload-preview">{imageUrls.map((image, index) => <div key={`${image}-${index}`}><img src={image} alt={`Ảnh túi hàng ${index + 1}`} /><button type="button" aria-label="Xóa ảnh" onClick={() => setImageUrls((current) => current.filter((_, imageIndex) => imageIndex !== index))}><X size={14} /></button>{index === 0 && <span>Ảnh bìa</span>}</div>)}</div><div className="merchant-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Hủy</Button><Button type="submit" loading={saving}>{bag ? 'Lưu thay đổi' : 'Tạo túi hàng'}</Button></div></form></Modal>;
}

export function BagDetailsModal({ bag, open, saving, onClose, onToggleStatus, onDelete, onEdit }: { bag: BagItem | null; open: boolean; saving: boolean; onClose: () => void; onToggleStatus: (id: string) => void; onDelete: (id: string) => void; onEdit: (bag: BagItem) => void }) {
  if (!bag) return null;
  const isOnShelf = bag.status !== 'hidden';
  return <Modal open={open} title="Chi tiết túi hàng" onClose={onClose}><div className="merchant-detail-hero"><img src={bag.imageUrl} alt={bag.name} /><span className={`merchant-badge merchant-badge--${bag.status}`}>{bag.status === 'active' ? 'Đang bán' : bag.status === 'hidden' ? 'Đã gỡ kệ' : 'Hết hàng'}</span></div><div className="merchant-detail-content"><span className="merchant-eyebrow">{bag.category}</span><h3>{bag.name}</h3><p>{bag.description}</p><dl><div><dt>Giá giải cứu</dt><dd>{bag.salePrice.toLocaleString('vi-VN')}đ</dd></div><div><dt>Còn lại</dt><dd>{bag.availableQuantity} túi</dd></div><div><dt>Nhận hàng</dt><dd>{bag.pickupTimeStart}–{bag.pickupTimeEnd}</dd></div></dl></div><div className="merchant-form-actions merchant-form-actions--between"><Button variant="danger" loading={saving} onClick={() => onDelete(bag.id)}><Trash2 size={16} /> Xóa túi</Button><div><Button variant="outline" onClick={() => onEdit(bag)}><Pencil size={16} /> Chỉnh sửa</Button><Button variant="secondary" onClick={() => onToggleStatus(bag.id)}>{isOnShelf ? <EyeOff size={16} /> : <Eye size={16} />}{isOnShelf ? 'Gỡ khỏi kệ' : 'Đưa lên kệ'}</Button></div></div></Modal>;
}

export const BagEmptyIcon = PackageOpen;
