import fs from 'fs';
import { ALL_STORES, ALL_BAGS } from './seed_34_partners_and_bags.mjs';

const filePath = 'apps/customer/src/services/customer.service.ts';
const content = fs.readFileSync(filePath, 'utf8');

const storeNameMap = new Map();
ALL_STORES.forEach(s => storeNameMap.set(s.id, s.name));

const hanoiStores = ALL_STORES.map(s => {
  const openStr = s.open_time.slice(0, 5) + ' - ' + s.close_time.slice(0, 5);
  return {
    id: s.id,
    brandId: s.id,
    name: s.name,
    description: s.description,
    phone: s.phone,
    address: s.address,
    logo: s.logo_url,
    banner: s.banner_url,
    rating: s.rating,
    totalRatings: s.total_ratings,
    distance: 500,
    status: 'active',
    isOpen: true,
    openingHours: openStr,
    latitude: s.latitude,
    longitude: s.longitude,
  };
});

const hanoiBags = ALL_BAGS.map(b => {
  return {
    id: b.id,
    merchantId: b.store_id,
    merchantName: storeNameMap.get(b.store_id) || '',
    name: b.name,
    description: b.description,
    originalPrice: b.original_price,
    discountPrice: b.discount_price,
    category: b.category === 'raw_food' ? 'vegetarian' : b.category,
    imageUrl: b.image_url,
    quantity: b.quantity,
    maxQuantity: 3,
    pickupStart: b.pickup_start.slice(0, 5),
    pickupEnd: b.pickup_end.slice(0, 5),
    isAvailable: true,
    rating: 4.9,
    createdAt: new Date().toISOString(),
  };
});

let newSection = 'export const HANOI_STORES: Merchant[] = ' + JSON.stringify(hanoiStores, null, 2) + ';\n\n';
newSection += 'export const HANOI_BAGS: SurpriseBag[] = ' + JSON.stringify(hanoiBags, null, 2) + ';\n\n';

const startTarget = 'export const HANOI_STORES: Merchant[] = [';
const endTarget = 'export const customerService = {';

const startIndex = content.indexOf(startTarget);
const endIndex = content.indexOf(endTarget);

if (startIndex === -1 || endIndex === -1) {
  throw new Error('Target markers not found in customer.service.ts');
}

const updatedContent = content.slice(0, startIndex) + newSection + content.slice(endIndex);
fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('Successfully updated apps/customer/src/services/customer.service.ts!');
