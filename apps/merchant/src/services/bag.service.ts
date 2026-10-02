import { MERCHANT_STORE_ID, SEED_BAGS_GOGREEN, SEED_BAGS_QUYT } from '../mocks';
import type { BagInput, BagItem, BagStatus } from '../types';
import { removeBagFromInventoryShelf, syncBagToInventoryShelf } from './inventory.service';
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
  const seedTemplate =
    storeId === MERCHANT_STORE_ID
      ? SEED_BAGS_GOGREEN
      : SEED_BAGS_QUYT.map((b) => ({ ...b, storeId }));

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${BAGS_CACHE_PREFIX}${storeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= seedTemplate.length) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse error
    }
  }
  return seedTemplate;
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
  status: (b.is_available ? (b.quantity > 0 ? 'active' : 'sold_out') : 'hidden') as BagStatus,
  createdAt: b.created_at || new Date().toISOString(),
});

const fetchBagRow = async (bagId: string): Promise<BagItem | null> => {
  const { data, error } = await supabase
    .from('surprise_bags')
    .select('*')
    .eq('id', bagId)
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
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Lấy danh sách bags từ Supabase lỗi:', error.message);
        return getCachedBagItems(storeId);
      }
      const remoteBags = (data || []).map(mapDbBag);
      const seedTemplate =
        storeId === MERCHANT_STORE_ID
          ? SEED_BAGS_GOGREEN
          : SEED_BAGS_QUYT.map((b) => ({ ...b, storeId }));

      let bags: BagItem[];
      if (remoteBags.length === 0) {
        bags = seedTemplate;
      } else {
        const remoteIds = new Set(remoteBags.map((b) => b.id));
        const remoteNames = new Set(remoteBags.map((b) => b.name.toLowerCase().trim()));
        const remainingSeed = seedTemplate.filter(
          (s) => !remoteIds.has(s.id) && !remoteNames.has(s.name.toLowerCase().trim())
        );
        bags = [...remoteBags, ...remainingSeed];
      }
      setCachedBagItems(storeId, bags);
      return bags;
    } finally {
      bagsInFlight.delete(storeId);
    }
  })();

  bagsInFlight.set(storeId, fetchPromise);
  return fetchPromise;
}

export async function updateBagStatus(bagId: string, status: BagStatus): Promise<BagItem> {
  const { error } = await supabase
    .from('surprise_bags')
    .update({
      is_available: status !== 'hidden',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bagId);
  if (error) {
    console.warn('Cập nhật trạng thái túi trên Supabase lỗi:', error.message);
    throw new Error('Không thể cập nhật trạng thái túi hàng.');
  }

  const bag = await fetchBagRow(bagId);
  if (!bag) throw new Error('Không tìm thấy túi hàng.');
  syncBagToInventoryShelf(bag);
  return bag;
}

export async function updateBagQuantity(bagId: string, quantity: number): Promise<BagItem> {
  const safeQty = Math.max(0, quantity);
  const { error } = await supabase
    .from('surprise_bags')
    .update({
      quantity: safeQty,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bagId);
  if (error) {
    console.warn('Cập nhật số lượng túi trên Supabase lỗi:', error.message);
    throw new Error('Không thể cập nhật số lượng túi hàng.');
  }

  const bag = await fetchBagRow(bagId);
  if (!bag) throw new Error('Không tìm thấy túi hàng.');
  syncBagToInventoryShelf(bag);
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
      const { data: userStore } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (userStore?.id) {
        targetStoreId = userStore.id;
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
      is_daily: true,
      is_available: true,
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Lỗi khi lưu túi mù vào Database Supabase:', error);
    throw new Error(`Không thể lưu túi mù vào Database: ${error.message}`);
  }

  const newBag: BagItem = {
    ...input,
    id: data.id,
    storeId: targetStoreId,
    category: normalizeCategoryToUi(data.category),
    availableQuantity: input.quantity,
    status: input.quantity > 0 ? 'active' : 'sold_out',
    createdAt: data.created_at || new Date().toISOString(),
  };
  syncBagToInventoryShelf(newBag);
  return newBag;
}

export async function updateBagItem(bagId: string, input: BagInput): Promise<BagItem> {
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', bagId);
  if (error) {
    console.warn('Cập nhật túi mù trên Supabase lỗi:', error.message);
    throw new Error('Không thể cập nhật túi hàng.');
  }

  const bag = await fetchBagRow(bagId);
  if (!bag) throw new Error('Không tìm thấy túi hàng.');
  syncBagToInventoryShelf(bag);
  return bag;
}

export async function deleteBagItem(bagId: string): Promise<boolean> {
  const { error } = await supabase.from('surprise_bags').delete().eq('id', bagId);
  if (error) {
    console.warn('Xóa túi mù trên Supabase lỗi:', error.message);
    throw new Error('Không thể xóa túi hàng.');
  }
  removeBagFromInventoryShelf(bagId);
  return true;
}
