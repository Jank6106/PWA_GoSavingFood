import { ALL_STORES } from './seed_34_partners_and_bags.mjs';

const SUPABASE_BASE_URL = 'https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/brands';

export const BRAND_TO_LOGO = {
  'Tous Les Jours': `${SUPABASE_BASE_URL}/tous-les-jours.jpg`,
  'Fresh Garden Bakery': `${SUPABASE_BASE_URL}/fresh-garden.png`,
  'Highlands Coffee': `${SUPABASE_BASE_URL}/highlands-coffee.webp`,
  'BreadTalk': `${SUPABASE_BASE_URL}/breadtalk.webp`,
  'Paris Baguette': `${SUPABASE_BASE_URL}/paris-baguette.webp`,
  'Sapo Bakery': `${SUPABASE_BASE_URL}/sapo-bakery.png`,
  'Anh Hòa Bakery': `${SUPABASE_BASE_URL}/anh-hoa-bakery.webp`,
  'Phúc Long Coffee & Tea': `${SUPABASE_BASE_URL}/phuc-long.webp`,
  'Katinat Saigon Kafe': `${SUPABASE_BASE_URL}/katinat.png`,
  'The Coffee House': `${SUPABASE_BASE_URL}/the-coffee-house.webp`,
  'Cộng Cà Phê': `${SUPABASE_BASE_URL}/cong-ca-phe.png`,
  'Starbucks Coffee': `${SUPABASE_BASE_URL}/starbucks.webp`,
  'Phê La': `${SUPABASE_BASE_URL}/phe-la.png`,
  'Cheese Coffee': `${SUPABASE_BASE_URL}/cheese-coffee.webp`,
  'Trà Sữa TocoToco': `${SUPABASE_BASE_URL}/tocotoco.png`,
  'Dairy Queen': `${SUPABASE_BASE_URL}/dairy-queen.webp`,
  'Baskin-Robbins': `${SUPABASE_BASE_URL}/baskin-robbins.webp`,
  'WinMart+': `${SUPABASE_BASE_URL}/winmart.png`,
  'GS25': `${SUPABASE_BASE_URL}/gs25.webp`,
  'Circle K': `${SUPABASE_BASE_URL}/circle-k.webp`,
  '7-Eleven': `${SUPABASE_BASE_URL}/7-eleven.webp`,
  'Annam Gourmet Market': `${SUPABASE_BASE_URL}/annam-gourmet.png`,
  'Cơm Niêu Singapore KOMBO': `${SUPABASE_BASE_URL}/kombo.png`,
  'Cơm Thố Bách Khoa': `${SUPABASE_BASE_URL}/com-tho-bach-khoa.png`,
  'Nhà Hàng Chay Vị Lai': `${SUPABASE_BASE_URL}/vi-lai.png`,
  'Bếp Chay An Lạc': `${SUPABASE_BASE_URL}/bep-chay-an-lac.png`,
  'McDonald\'s': `${SUPABASE_BASE_URL}/mcdonalds.webp`,
  'KFC Vietnam': `${SUPABASE_BASE_URL}/kfc-vietnam.webp`,
  'Lotteria': `${SUPABASE_BASE_URL}/lotteria.png`,
  'Domino\'s Pizza': `${SUPABASE_BASE_URL}/dominos-pizza.webp`,
  'Maison Marou Chocolatier': `${SUPABASE_BASE_URL}/maison-marou.png`,
  'Saint Honoré Bakery': `${SUPABASE_BASE_URL}/saint-honore.png`,
  'L’Épicerie du Metropole': `${SUPABASE_BASE_URL}/metropole-lepicerie.png`,
  'Artisan Bakery & Cafe': `${SUPABASE_BASE_URL}/artisan-bakery.png`,
  'C’est Si Bon Cafe & Dessert': `${SUPABASE_BASE_URL}/cest-si-bon.png`,
  'Oromia Coffee & Lounge': `${SUPABASE_BASE_URL}/oromia-coffee.png`,
  'Soko Cake Bake & Brunch': `${SUPABASE_BASE_URL}/soko-cake.webp`,
  'RuNam d\'Or Cafe': `${SUPABASE_BASE_URL}/runam.png`,
  'Là Việt Coffee': `${SUPABASE_BASE_URL}/la-viet.png`,
  'The Rustics Coffeeshop': `${SUPABASE_BASE_URL}/the-rustics.jpg`,
  'La Terrasse': `${SUPABASE_BASE_URL}/la-terrasse.png`,
  'Bready Bánh Mì Tươi': `${SUPABASE_BASE_URL}/bready-banh-mi.png`,
  'Blackbird Coffee': `${SUPABASE_BASE_URL}/blackbird-coffee.jpg`,
  'Tranquil Books & Coffee': `${SUPABASE_BASE_URL}/tranquil-books.jpg`,
  'All Day Coffee': `${SUPABASE_BASE_URL}/all-day-coffee.jpg`,
  'The Hive Lounge': `${SUPABASE_BASE_URL}/the-hive-lounge.png`,
  'An Café Specialty Coffee': `${SUPABASE_BASE_URL}/an-cafe.png`,
  'Jouri Dessert & Tea': `${SUPABASE_BASE_URL}/jouri-dessert.png`
};

async function verifyAll() {
  const brandNames = [...new Set(ALL_STORES.map(s => s.name.split(' - ')[0].trim()))];
  console.log(`Checking ${brandNames.length} brands in ALL_STORES...`);

  let missingInMapping = 0;
  let fetchFailed = 0;

  for (const name of brandNames) {
    const url = BRAND_TO_LOGO[name];
    if (!url) {
      console.error(`MISSING IN MAPPING: "${name}"`);
      missingInMapping++;
      continue;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`FAILED FETCH (${res.status}): "${name}" -> ${url}`);
        fetchFailed++;
      } else {
        const ct = res.headers.get('content-type');
        const cl = res.headers.get('content-length');
        console.log(`[OK ${res.status}] "${name}" -> ${ct} (${cl} bytes)`);
      }
    } catch (e) {
      console.error(`EXCEPTION "${name}":`, e.message);
      fetchFailed++;
    }
  }

  console.log(`\nVerification Summary:`);
  console.log(`- Total brands: ${brandNames.length}`);
  console.log(`- Missing in mapping: ${missingInMapping}`);
  console.log(`- Fetch failed: ${fetchFailed}`);
  if (missingInMapping === 0 && fetchFailed === 0) {
    console.log(`SUCCESS! ALL 48 BRAND LOGOS ARE VALID AND SERVED DIRECTLY FROM SUPABASE STORAGE!`);
  }
}

verifyAll();
