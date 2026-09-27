import { STORE_PROFILE_MOCK } from '../mocks';
import type { StoreImageUpdate, StoreProfile, StoreUpdateInput } from '../types';
import { getCompletedBagQuantity } from './order.service';
import { supabase } from './supabase';
import { clone, delay } from './utils';

let profileStore = clone(STORE_PROFILE_MOCK);

export async function fetchStoreProfile(storeId: string): Promise<StoreProfile> {
  try {
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .maybeSingle();

    if (!error && store) {
      return {
        id: store.id,
        userId: store.owner_user_id || 'merchant-user-01',
        name: store.name,
        description: store.description || '',
        coverImage:
          store.banner_url ||
          'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        logoUrl:
          store.logo_url ||
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
        avatar:
          store.logo_url ||
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
        address: store.address || '',
        latitude: store.latitude || 10.7745,
        longitude: store.longitude || 106.7032,
        phone: store.phone || '',
        email: 'merchant@gosavingfood.vn',
        category: (store.food_categories && store.food_categories[0]) || 'bakery',
        openingHours: store.open_time?.slice(0, 5) || '08:00',
        closingHours: store.close_time?.slice(0, 5) || '22:00',
        pickupHours: '19:00 - 21:00',
        isOpen: store.is_open ?? true,
        rating: Number(store.rating) || 4.9,
        totalRescuedBags: getCompletedBagQuantity(storeId) || 120,
        totalCo2SavedKg: 180,
        createdAt: store.created_at || new Date().toISOString(),
        updatedAt: store.updated_at || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Lấy thông tin store từ Supabase lỗi:', err);
  }

  await delay(120);
  return clone({ ...profileStore, totalRescuedBags: getCompletedBagQuantity(storeId) });
}

export async function updateStoreProfile(
  storeId: string,
  input: StoreUpdateInput
): Promise<StoreProfile> {
  try {
    await supabase
      .from('stores')
      .update({
        name: input.name,
        description: input.description,
        phone: input.phone,
        address: input.address,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);
  } catch (err) {
    console.warn('Cập nhật store trên Supabase lỗi:', err);
  }

  await delay(200);
  profileStore = { ...profileStore, ...input, updatedAt: new Date().toISOString() };
  return clone(profileStore);
}

export async function toggleStoreOpenStatus(storeId: string): Promise<StoreProfile> {
  const nextOpen = !profileStore.isOpen;
  try {
    await supabase
      .from('stores')
      .update({
        is_open: nextOpen,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);
  } catch (err) {
    console.warn('Đổi trạng thái đóng/mở store trên Supabase lỗi:', err);
  }

  await delay(120);
  profileStore.isOpen = nextOpen;
  return clone(profileStore);
}

export async function updateStoreImages(
  storeId: string,
  input: StoreImageUpdate
): Promise<StoreProfile> {
  try {
    const updatePayload: Record<string, any> = {};
    if (input.coverImage) updatePayload.banner_url = input.coverImage;
    if (input.avatar) updatePayload.logo_url = input.avatar;
    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_at = new Date().toISOString();
      await supabase.from('stores').update(updatePayload).eq('id', storeId);
    }
  } catch (err) {
    console.warn('Cập nhật ảnh store trên Supabase lỗi:', err);
  }

  await delay(200);
  profileStore = { ...profileStore, ...input, updatedAt: new Date().toISOString() };
  return clone(profileStore);
}
