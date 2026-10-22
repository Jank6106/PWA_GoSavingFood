import type { AuthUser } from '../types';

export const MERCHANT_STORE_ID = 'b509682b-350a-4f10-8bbc-a76f6537c248';
export const STORE_ID = MERCHANT_STORE_ID;

export const DEMO_MERCHANT_USER: AuthUser = {
  id: '550c2813-e8e2-4185-a11b-7cfc31370ab1',
  storeId: MERCHANT_STORE_ID,
  displayName: 'Bếp Chay An Lạc - Cổ Nhuế',
  isFirstLogin: false,
};

export const PRESET_BAG_CATEGORIES = ['Món Chay', 'Bánh ngọt', 'Đồ uống', 'Rau củ', 'Combo bất ngờ'];

export const PRESET_BAG_IMAGES = [
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=75',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=75',
  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=75',
  'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=400&q=75',
];
