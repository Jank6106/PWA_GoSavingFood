import type { AuthUser } from '../types';

export const MERCHANT_STORE_ID = '799e644e-2f82-4a85-ba12-b194cf4cc547';
export const STORE_ID = MERCHANT_STORE_ID;

export const DEMO_MERCHANT_USER: AuthUser = {
  id: '09ce2d9c-7382-4ce2-8299-42effefe6004',
  storeId: MERCHANT_STORE_ID,
  displayName: 'GoSavingFood',
  isFirstLogin: false,
};

export const PRESET_BAG_CATEGORIES = ['Bánh ngọt', 'Món Việt', 'Đồ uống', 'Rau củ', 'Combo bất ngờ'];

export const PRESET_BAG_IMAGES = [
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=75',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=75',
  'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=400&q=75',
  'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=400&q=75',
];
