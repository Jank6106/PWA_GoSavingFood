import type { BagInput, BagItem, BagStatus } from '../types';
import { supabase } from './supabase';
import { optimizeImageUrl } from './utils';

const DEFAULT_BAG_IMAGE = optimizeImageUrl(
  'https://images.unsplash.com/photo-1509440159596-0249088772ff',
  400,
  75
);

const BAGS_CACHE_PREFIX = 'gsf_merchant_bags:';
const bagsInFlight = new Map<string, Promise<BagItem[]>>();

export function getCachedBagItems(storeId: string): BagItem[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${BAGS_CACHE_PREFIX}${storeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse error
    }
  }
  return [];
}

export function setCachedBagItems(storeId: string, bags: BagItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${BAGS_CACHE_PREFIX}${storeId}`, JSON.stringify(bags));
  } catch {
    // Ignore storage quota
  }
}

const mapDbBag = (b: any): BagItem => ({
  id: b.id,
  storeId: b.store_id,
  name: b.name,
  description: b.description || '',
  category: normalizeCategoryToUi(b.category),
  originalPrice: Number(b.original_price),
  salePrice: Number(b.discount_price),
  quantity: Number(b.quantity),
  availableQuantity: Number(b.quantity),
  imageUrl: optimizeImageUrl(b.image_url || DEFAULT_BAG_IMAGE, 400, 75),
  imageUrls: [optimizeImageUrl(b.image_url || DEFAULT_BAG_IMAGE, 400, 75)],
  pickupTimeStart: b.pickup_start?.slice(0, 5) || '18:00',
  pickupTimeEnd: b.pickup_end?.slice(0, 5) || '21:00',
  bagType: b.bag_type || 'daily',
  repeatMode: b.repeat_mode || 'today_only',
  dailyQuota: b.daily_quota != null ? Number(b.daily_quota) : undefined,
  expiryDate: b.expiry_date || undefined,
  status: (b.status === 'archived' || b.status === 'expired'
    ? 'hidden'
    : b.is_available
    ? b.quantity > 0
      ? 'active'
      : 'sold_out'
    : 'hidden') as BagStatus,
  createdAt: b.created_at || new Date().toISOString(),
});

const fetchBagRow = async (bagId: string): Promise<BagItem | null> => {
  const { data, error } = await supabase
    .from('surprise_bags')
    .select('id, store_id, name, description, category, original_price, discount_price, quantity, image_url, pickup_start, pickup_end, is_available, created_at, bag_type, repeat_mode, daily_quota, expiry_date, status')
    .eq('id', bagId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) {
    console.warn('Lấy túi hàng từ Supabase lỗi:', error.message);
    return null;
  }
  return data ? mapDbBag(data) : null;
};

export const CATEGORY_MAP_TO_DB: Record<string, 'bakery' | 'beverage' | 'raw_food' | 'vegetarian' | 'other'> = {
  'Bánh ngọt': 'bakery',
  'Đồ uống': 'beverage',
  'Rau củ': 'raw_food',
  'Rau củ & Trái cây': 'raw_food',
  'Món Chay': 'vegetarian',
  'Món chay': 'vegetarian',
  'Món Việt': 'other',
  'Combo bất ngờ': 'other',
  'Khác': 'other',
  bakery: 'bakery',
  beverage: 'beverage',
  raw_food: 'raw_food',
  vegetarian: 'vegetarian',
  other: 'other',
};

export const CATEGORY_MAP_TO_UI: Record<string, string> = {
  bakery: 'Bánh ngọt',
  beverage: 'Đồ uống',
  raw_food: 'Rau củ',
  vegetarian: 'Món Chay',
  other: 'Món Việt',
};

export function normalizeCategoryToDb(category?: string): 'bakery' | 'beverage' | 'raw_food' | 'vegetarian' | 'other' {
  if (!category) return 'bakery';
  const trimmed = category.trim();
  if (CATEGORY_MAP_TO_DB[trimmed]) {
    return CATEGORY_MAP_TO_DB[trimmed];
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('bánh') || lower.includes('bakery')) return 'bakery';
  if (lower.includes('uống') || lower.includes('nước') || lower.includes('beverage') || lower.includes('drink')) return 'beverage';
  if (lower.includes('rau') || lower.includes('củ') || lower.includes('trái cây') || lower.includes('quả') || lower.includes('raw')) return 'raw_food';
  if (lower.includes('chay') || lower.includes('vege')) return 'vegetarian';
  return 'other';
}

export function normalizeCategoryToUi(category?: string): string {
  if (!category) return 'Bánh ngọt';
  return CATEGORY_MAP_TO_UI[category] || category;
}

export async function fetchBagItems(storeId: string): Promise<BagItem[]> {
  const existing = bagsInFlight.get(storeId);
  if (existing) return existing;

  const fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('surprise_bags')
        .select('id, store_id, name, description, category, original_price, discount_price, quantity, image_url, pickup_start, pickup_end, is_available, created_at, bag_type, repeat_mode, daily_quota, expiry_date, status')
        .eq('store_id', storeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Lấy danh sách bags từ Supabase lỗi:', error.message);
        return getCachedBagItems(storeId);
      }
      const remoteBags = (data || []).map(mapDbBag);
      setCachedBagItems(storeId, remoteBags);
      return remoteBags;
    } finally {
      bagsInFlight.delete(storeId);
    }
  })();

  bagsInFlight.set(storeId, fetchPromise);
  return fetchPromise;
}

export function invalidateBagInFlight(storeId?: string): void {
  if (storeId) {
    bagsInFlight.delete(storeId);
  } else {
    bagsInFlight.clear();
  }
}

export async function updateBagStatus(bagId: string, status: BagStatus): Promise<BagItem> {
  invalidateBagInFlight();
  const isAvailable = status !== 'hidden';
  const existing = await fetchBagRow(bagId);

  const updates: Record<string, any> = {
    is_available: isAvailable,
    updated_at: new Date().toISOString(),
  };

  if (isAvailable && existing) {
    const [endH, endM] = (existing.pickupTimeEnd || '21:00').split(':').map(Number);
    const exp = new Date();
    exp.setHours(endH || 21, endM || 0, 0, 0);
    if (exp.getTime() <= Date.now()) {
      exp.setDate(exp.getDate() + 1);
    }
    updates.expires_at = exp.toISOString();
  }

  const { error } = await supabase
    .from('surprise_bags')
    .update(updates)
    .eq('id', bagId);
  if (error) {
    console.warn('Cập nhật trạng thái túi trên Supabase lỗi:', error.message);
    throw new Error('Không thể cập nhật trạng thái túi hàng.');
  }

  const bag = await fetchBagRow(bagId);
  if (!bag) throw new Error('Không tìm thấy túi hàng.');
  return bag;
}

export async function updateBagQuantity(bagId: string, quantity: number): Promise<BagItem> {
  invalidateBagInFlight();
  const safeQty = Math.max(0, quantity);
  const existing = await fetchBagRow(bagId);

  const updates: Record<string, any> = {
    quantity: safeQty,
    updated_at: new Date().toISOString(),
  };

  if (safeQty > 0 && existing && existing.status !== 'hidden') {
    const [endH, endM] = (existing.pickupTimeEnd || '21:00').split(':').map(Number);
    const exp = new Date();
    exp.setHours(endH || 21, endM || 0, 0, 0);
    if (exp.getTime() <= Date.now()) {
      exp.setDate(exp.getDate() + 1);
    }
    updates.expires_at = exp.toISOString();
    updates.is_available = true;
  }

  const { error } = await supabase
    .from('surprise_bags')
    .update(updates)
    .eq('id', bagId);
  if (error) {
    console.warn('Cập nhật số lượng túi trên Supabase lỗi:', error.message);
    throw new Error('Không thể cập nhật số lượng túi hàng.');
  }

  const bag = await fetchBagRow(bagId);
  if (!bag) throw new Error('Không tìm thấy túi hàng.');
  return bag;
}

export async function createBagItem(storeId: string, input: BagInput): Promise<BagItem> {
  let targetStoreId = storeId;

  // Đảm bảo targetStoreId là store thuộc quyền sở hữu của user đang đăng nhập để RLS cho phép
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 1. Kiểm tra xem storeId truyền vào có thuộc về user này không
      if (storeId && storeId !== 'b0000000-0000-0000-0000-000000000002') {
        const { data: matchedStore } = await supabase
          .from('stores')
          .select('id')
          .eq('id', storeId)
          .eq('owner_user_id', user.id)
          .maybeSingle();

        if (matchedStore?.id) {
          targetStoreId = matchedStore.id;
        }
      }

      // 2. Nếu targetStoreId chưa khớp hoặc đang là mock store, tìm store của user (dùng limit 1 để tránh lỗi khi user sở hữu nhiều store)
      if (!targetStoreId || targetStoreId === 'b0000000-0000-0000-0000-000000000002') {
        const { data: userStores } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (userStores && userStores.length > 0) {
          targetStoreId = userStores[0].id;
        } else {
          // 3. Nếu user chưa có store nào, tự tạo store cho user qua RPC create_store
          const storeName = user.user_metadata?.store_name || user.user_metadata?.name || 'Cửa hàng của tôi';
          const { data: newStores } = await supabase.rpc('create_store', {
            p_owner_user_id: user.id,
            p_name: storeName,
            p_description: 'Cửa hàng đối tác GoSavingFood',
            p_phone: user.user_metadata?.phone || '0900000000',
            p_address: user.user_metadata?.address || 'Hà Nội',
            p_latitude: 21.0285,
            p_longitude: 105.8542,
            p_logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
            p_banner_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
            p_food_categories: ['bakery'],
            p_open_time: '07:00:00',
            p_close_time: '21:00:00',
            p_is_open: true,
          });
          if (newStores && newStores.length > 0) {
            targetStoreId = newStores[0].id;
          }
        }
      }
    } else {
      throw new Error('Chưa đăng nhập. Vui lòng đăng nhập tài khoản cửa hàng trước khi tạo túi.');
    }
  } catch (err: any) {
    if (err?.message?.includes('Chưa đăng nhập')) {
      throw err;
    }
    console.warn('Lỗi lấy thông tin user store:', err);
  }

  // Tính toán thời gian hết hạn (expires_at) luôn đảm bảo lớn hơn thời điểm hiện tại
  const calculatedExpiresAt = (() => {
    if (input.bagType === 'shelf_life' && input.expiryDate) {
      const parsed = new Date(`${input.expiryDate}T23:59:59+07:00`);
      if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        return parsed.toISOString();
      }
    }
    const [endH, endM] = (input.pickupTimeEnd || '21:00').split(':').map(Number);
    const exp = new Date();
    exp.setHours(endH || 21, endM || 0, 0, 0);
    if (exp.getTime() <= Date.now()) {
      exp.setDate(exp.getDate() + 1);
    }
    return exp.toISOString();
  })();

  const { data, error } = await supabase
    .from('surprise_bags')
    .insert({
      store_id: targetStoreId,
      name: input.name,
      description: input.description,
      original_price: input.originalPrice,
      discount_price: input.salePrice,
      category: normalizeCategoryToDb(input.category),
      image_url: input.imageUrl || input.imageUrls?.[0] || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600',
      quantity: input.quantity,
      max_quantity: 2,
      pickup_start:
        input.pickupTimeStart.length === 5
          ? `${input.pickupTimeStart}:00`
          : input.pickupTimeStart,
      pickup_end:
        input.pickupTimeEnd.length === 5
          ? `${input.pickupTimeEnd}:00`
          : input.pickupTimeEnd,
      is_daily: input.bagType !== 'shelf_life',
      bag_type: input.bagType || 'daily',
      repeat_mode: input.bagType === 'shelf_life' ? 'today_only' : (input.repeatMode || 'today_only'),
      daily_quota: input.dailyQuota ?? input.quantity,
      expiry_date: input.bagType === 'shelf_life' ? (input.expiryDate || null) : null,
      status: input.quantity > 0 ? 'active' : 'sold_out',
      is_available: true,
      expires_at: calculatedExpiresAt,
    })
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi lưu túi mù vào Database Supabase:', error);
    throw new Error(`Không thể lưu túi mù vào Database: ${error.message}`);
  }

  invalidateBagInFlight(targetStoreId);

  const newBag: BagItem = {
    ...input,
    id: data.id,
    storeId: targetStoreId,
    category: normalizeCategoryToUi(data.category),
    availableQuantity: input.quantity,
    status: input.quantity > 0 ? 'active' : 'sold_out',
    createdAt: data.created_at || new Date().toISOString(),
  };
  return newBag;
}

export async function updateBagItem(bagId: string, input: BagInput): Promise<BagItem> {
  invalidateBagInFlight();
  const { error } = await supabase
    .from('surprise_bags')
    .update({
      name: input.name,
      description: input.description,
      original_price: input.originalPrice,
      discount_price: input.salePrice,
      category: normalizeCategoryToDb(input.category),
      image_url: input.imageUrl || input.imageUrls[0],
      quantity: input.quantity,
      pickup_start:
        input.pickupTimeStart.length === 5 ? `${input.pickupTimeStart}:00` : input.pickupTimeStart,
      pickup_end:
        input.pickupTimeEnd.length === 5 ? `${input.pickupTimeEnd}:00` : input.pickupTimeEnd,
      bag_type: input.bagType || 'daily',
      repeat_mode: input.bagType === 'shelf_life' ? 'today_only' : (input.repeatMode || 'today_only'),
      daily_quota: input.dailyQuota ?? input.quantity,
      expiry_date: input.bagType === 'shelf_life' ? (input.expiryDate || null) : null,
      is_daily: input.bagType !== 'shelf_life',
      is_available: true,
      status: 'active',
      expires_at: (() => {
        if (input.bagType === 'shelf_life' && input.expiryDate) {
          return `${input.expiryDate}T23:59:59.999Z`;
        }
        const [endH, endM] = (input.pickupTimeEnd || '21:00').split(':').map(Number);
        const exp = new Date();
        exp.setHours(endH || 21, endM || 0, 0, 0);
        if (exp.getTime() <= Date.now()) {
          exp.setDate(exp.getDate() + 1);
        }
        return exp.toISOString();
      })(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bagId);
  if (error) {
    console.warn('Cập nhật túi mù trên Supabase lỗi:', error.message);
    throw new Error('Không thể cập nhật túi hàng.');
  }

  const bag = await fetchBagRow(bagId);
  if (!bag) throw new Error('Không tìm thấy túi hàng.');
  return bag;
}

export async function deleteBagItem(bagId: string): Promise<boolean> {
  invalidateBagInFlight();
  // Luôn dùng soft delete: gán deleted_at, is_available = false, status = 'archived' để bảo toàn lịch sử đơn & báo cáo
  const { error } = await supabase
    .from('surprise_bags')
    .update({
      deleted_at: new Date().toISOString(),
      is_available: false,
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bagId);

  if (error) {
    console.warn('Lỗi khi xóa túi hàng (soft delete):', error.message);
    throw new Error('Không thể xóa túi hàng: ' + error.message);
  }

  return true;
}
