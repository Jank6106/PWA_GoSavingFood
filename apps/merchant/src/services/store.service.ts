import type { StoreImageUpdate, StoreProfile, StoreUpdateInput } from '../types';
import { fetchCompletedBagQuantity } from './order.service';
import { supabase } from './supabase';

const CO2_KG_PER_BAG = 2.5;
const STORE_CACHE_PREFIX = 'gsf_merchant_store:';
const storeInFlight = new Map<string, Promise<StoreProfile | null>>();

const createEmptyStoreProfile = (storeId: string): StoreProfile => ({
  id: storeId,
  userId: '',
  name: 'Cửa hàng',
  description: '',
  coverImage: '',
  logoUrl: '',
  avatar: '',
  address: '',
  latitude: 0,
  longitude: 0,
  phone: '',
  email: '',
  category: 'bakery',
  openingHours: '08:00',
  closingHours: '22:00',
  pickupHours: '19:00 - 21:00',
  isOpen: true,
  rating: 0,
  totalRescuedBags: 0,
  totalCo2SavedKg: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export function getCachedStoreProfile(storeId: string): StoreProfile {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${STORE_CACHE_PREFIX}${storeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
      // Ignore parse error
    }
  }
  return createEmptyStoreProfile(storeId);
}

export function setCachedStoreProfile(storeId: string, profile: StoreProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      window.localStorage.setItem(`${STORE_CACHE_PREFIX}${storeId}`, JSON.stringify(profile));
    } else {
      window.localStorage.removeItem(`${STORE_CACHE_PREFIX}${storeId}`);
    }
  } catch {
    // Ignore storage quota
  }
}

const mapStoreRow = (store: any): StoreProfile => ({
  id: store.id,
  userId: store.owner_user_id || '',
  name: store.name,
  description: store.description || '',
  coverImage: store.banner_url || '',
  logoUrl: store.logo_url || '',
  avatar: store.logo_url || '',
  address: store.address || '',
  latitude: Number(store.latitude) || 0,
  longitude: Number(store.longitude) || 0,
  phone: store.phone || '',
  email: '',
  category: (store.food_categories && store.food_categories[0]) || 'bakery',
  openingHours: store.open_time?.slice(0, 5) || '08:00',
  closingHours: store.close_time?.slice(0, 5) || '22:00',
  pickupHours: '19:00 - 21:00',
  isOpen: store.is_open ?? true,
  rating: Number(store.rating) || 0,
  totalRescuedBags: 0,
  totalCo2SavedKg: 0,
  createdAt: store.created_at || new Date().toISOString(),
  updatedAt: store.updated_at || new Date().toISOString(),
});

export async function fetchStoreProfile(storeId: string): Promise<StoreProfile | null> {
  const existing = storeInFlight.get(storeId);
  if (existing) return existing;

  const fetchPromise = (async () => {
    try {
      const { data: store, error } = await supabase
        .from('stores')
        .select('id, owner_user_id, name, description, banner_url, logo_url, address, latitude, longitude, phone, food_categories, open_time, close_time, is_open, rating, created_at, updated_at')
        .eq('id', storeId)
        .maybeSingle();

      if (error || !store) {
        if (error) console.warn('Lấy thông tin store từ Supabase lỗi:', error.message);
        return getCachedStoreProfile(storeId);
      }

      const profile = mapStoreRow(store);
      const cached = getCachedStoreProfile(storeId);
      if (cached) {
        if (!profile.coverImage) profile.coverImage = cached.coverImage;
        if (!profile.logoUrl) profile.logoUrl = cached.logoUrl;
        if (!profile.avatar) profile.avatar = cached.avatar;
        if (!profile.description) profile.description = cached.description;
        profile.totalRescuedBags = cached.totalRescuedBags;
        profile.totalCo2SavedKg = cached.totalCo2SavedKg;
        profile.email = cached.email;
        if (!profile.phone && cached.phone) profile.phone = cached.phone;
      }

      // Chạy ngầm việc tính túi và thông tin owner song song không gây trễ hiển thị
      Promise.all([
        fetchCompletedBagQuantity(storeId).catch(() => 0),
        store.owner_user_id
          ? Promise.resolve(supabase.from('users').select('email, phone').eq('id', store.owner_user_id).maybeSingle()).catch(() => ({ data: null }))
          : Promise.resolve({ data: null }),
      ]).then(([rescuedBags, ownerRes]) => {
        profile.totalRescuedBags = rescuedBags;
        profile.totalCo2SavedKg = Math.round(rescuedBags * CO2_KG_PER_BAG);
        if (ownerRes && 'data' in ownerRes && ownerRes.data) {
          profile.email = ownerRes.data.email || '';
          if (!profile.phone && ownerRes.data.phone) profile.phone = ownerRes.data.phone;
        }
        setCachedStoreProfile(storeId, profile);
      });

      setCachedStoreProfile(storeId, profile);
      return profile;
    } finally {
      storeInFlight.delete(storeId);
    }
  })();

  storeInFlight.set(storeId, fetchPromise);
  return fetchPromise;
}
export async function updateStoreProfile(
  storeId: string,
  input: StoreUpdateInput
): Promise<StoreProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập tài khoản cửa hàng.');

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.phone !== undefined) updatePayload.phone = input.phone;
  if (input.address !== undefined) updatePayload.address = input.address;
  if (input.openingHours !== undefined) {
    updatePayload.open_time = input.openingHours.length === 5 ? `${input.openingHours}:00` : input.openingHours;
  }
  if (input.closingHours !== undefined) {
    updatePayload.close_time = input.closingHours.length === 5 ? `${input.closingHours}:00` : input.closingHours;
  }
  if (input.category !== undefined) {
    updatePayload.food_categories = [input.category];
  }

  const { error } = await supabase
    .from('stores')
    .update(updatePayload)
    .eq('id', storeId);

  if (error) {
    console.warn('Cập nhật store trên Supabase lỗi:', error.message);
    throw new Error('Không thể lưu thông tin cửa hàng.');
  }

  return fetchStoreProfile(storeId);
}

export async function toggleStoreOpenStatus(storeId: string): Promise<StoreProfile | null> {
  const { data: store, error: readError } = await supabase
    .from('stores')
    .select('is_open')
    .eq('id', storeId)
    .maybeSingle();

  if (readError || !store) {
    console.warn('Đọc trạng thái store lỗi:', readError?.message);
    throw new Error('Không thể xác định trạng thái cửa hàng.');
  }

  const { error } = await supabase
    .from('stores')
    .update({
      is_open: !store.is_open,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId);

  if (error) {
    console.warn('Đổi trạng thái đóng/mở store trên Supabase lỗi:', error.message);
    throw new Error('Không thể đổi trạng thái cửa hàng.');
  }

  return fetchStoreProfile(storeId);
}

export async function updateStoreImages(
  storeId: string,
  input: StoreImageUpdate
): Promise<StoreProfile | null> {
  const updatePayload: Record<string, any> = {};
  if (input.coverImage) updatePayload.banner_url = input.coverImage;
  if (input.avatar) updatePayload.logo_url = input.avatar;

  if (Object.keys(updatePayload).length > 0) {
    updatePayload.updated_at = new Date().toISOString();
    const { error } = await supabase.from('stores').update(updatePayload).eq('id', storeId);
    if (error) {
      console.warn('Cập nhật ảnh store trên Supabase lỗi:', error.message);
      throw new Error('Không thể cập nhật ảnh cửa hàng.');
    }
  }

  return fetchStoreProfile(storeId);
}
