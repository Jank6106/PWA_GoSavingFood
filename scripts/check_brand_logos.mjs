import { ALL_STORES } from './seed_34_partners_and_bags.mjs';

const brands = new Map();
ALL_STORES.forEach(s => {
  const baseName = s.name.split(' - ')[0].trim();
  if (!brands.has(baseName)) {
    brands.set(baseName, { count: 0, sampleStore: s.name, currentLogo: s.logo_url });
  }
  brands.get(baseName).count++;
});

console.log('Total unique brands:', brands.size);
for (const [name, info] of brands) {
  console.log(`- "${name}" (${info.count} chi nhánh) -> ${info.currentLogo}`);
}
