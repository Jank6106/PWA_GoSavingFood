import fs from 'fs';
import { ALL_STORES } from './seed_34_partners_and_bags.mjs';
import { BRAND_TO_LOGO } from './map_and_verify_all_48.mjs';

async function updateAll() {
  console.log(`Updating logos for all ${ALL_STORES.length} stores...`);
  
  // 1. Update in-memory ALL_STORES and check
  const updatedStores = ALL_STORES.map(store => {
    const baseName = store.name.split(' - ')[0].trim();
    const newLogo = BRAND_TO_LOGO[baseName];
    if (!newLogo) {
      throw new Error(`Missing logo for brand: "${baseName}"`);
    }
    return {
      ...store,
      logo_url: newLogo
    };
  });

  // 2. Update scripts/seed_34_partners_and_bags.mjs file content
  console.log('Writing updated ALL_STORES to seed_34_partners_and_bags.mjs...');
  const seedFilePath = 'scripts/seed_34_partners_and_bags.mjs';
  let seedContent = fs.readFileSync(seedFilePath, 'utf8');

  let matchCount = 0;
  for (const s of updatedStores) {
    const idRegex = new RegExp(`(["']?id["']?\\s*:\\s*['"]${s.id}['"][\\s\\S]*?["']?logo_url["']?\\s*:\\s*['"])[^'"]+(['"])`);
    if (idRegex.test(seedContent)) {
      seedContent = seedContent.replace(idRegex, `$1${s.logo_url}$2`);
      matchCount++;
    } else {
      console.warn(`Could not find id regex match for store: ${s.id} (${s.name})`);
    }
  }

  fs.writeFileSync(seedFilePath, seedContent, 'utf8');
  console.log(`seed_34_partners_and_bags.mjs updated: ${matchCount}/${updatedStores.length} matched!`);
}

updateAll().catch(e => {
  console.error(e);
  process.exit(1);
});
