import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lblwvbedtlxjtkcuxmsf.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxibHd2YmVkdGx4anRrY3V4bXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjcyMjY3MSwiZXhwIjoyMTA4Mjk4NjcxfQ.vnOu0yTCCeKgWQ0q6uPKPbrnTtPcGoY4x129_G4faII';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const BRAND_CONFIGS = [
  {
    name: 'Tous Les Jours',
    slug: 'tous-les-jours',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/TOUSlesJOURSnewlogo.jpg/500px-TOUSlesJOURSnewlogo.jpg'
  },
  {
    name: 'Fresh Garden Bakery',
    slug: 'fresh-garden',
    sourceUrl: 'https://theme.hstatic.net/200000411281/1001307649/14/logo.png?v=941'
  },
  {
    name: 'Highlands Coffee',
    slug: 'highlands-coffee',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3d/Highlands_Coffee_5G.svg/500px-Highlands_Coffee_5G.svg.png'
  },
  {
    name: 'BreadTalk',
    slug: 'breadtalk',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/BreadTalk_logo.svg/500px-BreadTalk_logo.svg.png'
  },
  {
    name: 'Paris Baguette',
    slug: 'paris-baguette',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Paris_Baguette_logo.svg/500px-Paris_Baguette_logo.svg.png'
  },
  {
    name: 'Sapo Bakery',
    slug: 'sapo-bakery',
    sourceUrl: 'https://www.sapo.vn/Upload/ImageManager/Image/web/spbk.png'
  },
  {
    name: 'Anh Hòa Bakery',
    slug: 'anh-hoa-bakery',
    sourceUrl: 'https://theme.hstatic.net/1000313040/1000406925/14/logo.png?v=2454'
  },
  {
    name: 'Phúc Long Coffee & Tea',
    slug: 'phuc-long',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/vi/thumb/3/32/Logo_Ph%C3%BAc_Long.svg/500px-Logo_Ph%C3%BAc_Long.svg.png'
  },
  {
    name: 'Katinat Saigon Kafe',
    slug: 'katinat',
    sourceUrl: 'https://katinat.vn/wp-content/uploads/2023/12/cropped-Kat-Logo-fa-rgb-05__1_-removebg-preview.png'
  },
  {
    name: 'The Coffee House',
    slug: 'the-coffee-house',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/The_Coffee_House_logo.svg/500px-The_Coffee_House_logo.svg.png'
  },
  {
    name: 'Cộng Cà Phê',
    slug: 'cong-ca-phe',
    sourceUrl: 'https://congcaphe.com/_next/static/images/logo-01194a7b394bd852bd787596e3127b1d.png'
  },
  {
    name: 'Starbucks Coffee',
    slug: 'starbucks',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/vi/thumb/d/d3/Starbucks_Corporation_Logo_2011.svg/500px-Starbucks_Corporation_Logo_2011.svg.png'
  },
  {
    name: 'Phê La',
    slug: 'phe-la',
    sourceUrl: 'https://phela.vn/wp-content/uploads/2025/06/cropped-0-02-06-04d15c014b6c8bbe49941692f60a957bf65d7f7b1b37169564819407b23d60e9_ec49f8f5866ec0b.png'
  },
  {
    name: 'Cheese Coffee',
    slug: 'cheese-coffee',
    sourceUrl: 'https://commacreative.vn/wp-content/uploads/2021/04/cheese_facebook_cover_02.jpeg.webp'
  },
  {
    name: 'Trà Sữa TocoToco',
    slug: 'tocotoco',
    sourceUrl: 'https://tocotocotea.com/wp-content/themes/tocotocotea/assets/images/logo.png'
  },
  {
    name: 'Dairy Queen',
    slug: 'dairy-queen',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ae/Dairy_Queen_logo.svg/500px-Dairy_Queen_logo.svg.png'
  },
  {
    name: 'Baskin-Robbins',
    slug: 'baskin-robbins',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d8/Baskin-Robbins_logo.svg/500px-Baskin-Robbins_logo.svg.png'
  },
  {
    name: 'WinMart+',
    slug: 'winmart',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/WinMart_logo.png/500px-WinMart_logo.png'
  },
  {
    name: 'GS25',
    slug: 'gs25',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/GS25_bi_%282019%29.svg/500px-GS25_bi_%282019%29.svg.png'
  },
  {
    name: 'Circle K',
    slug: 'circle-k',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Circle_K_logo.svg/500px-Circle_K_logo.svg.png'
  },
  {
    name: '7-Eleven',
    slug: '7-eleven',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/7-eleven_logo.svg/500px-7-eleven_logo.svg.png'
  },
  {
    name: 'Annam Gourmet Market',
    slug: 'annam-gourmet',
    sourceUrl: 'https://images.seeklogo.com/logo-png/45/1/annam-logo-png_seeklogo-455747.png'
  },
  {
    name: 'Cơm Niêu Singapore KOMBO',
    slug: 'kombo',
    sourceUrl: 'https://kombo.vn/wp-content/themes/kombo/assets/img/logo-mobile.png'
  },
  {
    name: 'Cơm Thố Bách Khoa',
    slug: 'com-tho-bach-khoa',
    sourceUrl: 'https://comthobachkhoa.com.vn/wp-content/uploads/2026/03/logo-com-tho-bach-khoa-1024x313.png'
  },
  {
    name: 'Nhà Hàng Chay Vị Lai',
    slug: 'vi-lai',
    sourceUrl: 'https://vilai.vn/mediacenter/media/images/725/logo/logo-1514167401.png'
  },
  {
    name: 'Bếp Chay An Lạc',
    slug: 'bep-chay-an-lac',
    sourceUrl: 'https://vilai.vn/mediacenter/media/images/725/logo/logo-1514167401.png'
  },
  {
    name: 'McDonald\'s',
    slug: 'mcdonalds',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/36/McDonald%27s_Golden_Arches.svg/500px-McDonald%27s_Golden_Arches.svg.png'
  },
  {
    name: 'KFC Vietnam',
    slug: 'kfc-vietnam',
    sourceUrl: 'https://lblwvbedtlxjtkcuxmsf.supabase.co/storage/v1/object/public/store-logos/5b051934-45e2-4cbe-92b7-7e78c4b51710/logo_1793102739004.webp'
  },
  {
    name: 'Lotteria',
    slug: 'lotteria',
    sourceUrl: 'https://www.lotteria.vn/media/logo/default/logo.png'
  },
  {
    name: 'Domino\'s Pizza',
    slug: 'dominos-pizza',
    sourceUrl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3e/Domino%27s_pizza_logo.svg/500px-Domino%27s_pizza_logo.svg.png'
  },
  {
    name: 'Maison Marou Chocolatier',
    slug: 'maison-marou',
    sourceUrl: 'https://maisonmarou.com/cdn/shop/files/logo_webp.png?v=1737362041'
  },
  {
    name: 'Saint Honoré Bakery',
    slug: 'saint-honore',
    sourceUrl: 'https://sainthonore.com.vn/wp-content/uploads/2024/04/logo.png'
  },
  {
    name: 'L’Épicerie du Metropole',
    slug: 'metropole-lepicerie',
    sourceUrl: 'https://d2e5ushqwiltxm.cloudfront.net/wp-content/uploads/sites/95/2024/03/19094222/MH-NEW-LOGO_-BLACK-with-bg.png'
  },
  {
    name: 'Artisan Bakery & Cafe',
    slug: 'artisan-bakery',
    sourceUrl: 'https://d2e5ushqwiltxm.cloudfront.net/wp-content/uploads/sites/95/2024/03/19094825/MH_Logo_White_RGB.png'
  },
  {
    name: 'C’est Si Bon Cafe & Dessert',
    slug: 'cest-si-bon',
    sourceUrl: 'https://static.cestsibon.vn/uploads/2022/09/csb_logofinal-13-e1663663721657.png'
  },
  {
    name: 'Oromia Coffee & Lounge',
    slug: 'oromia-coffee',
    sourceUrl: 'https://noithatkendesign.vn/storage/app/uploads/public/6aa/8b6/9eb/6aa8b69eb871f375055762.png'
  },
  {
    name: 'Soko Cake Bake & Brunch',
    slug: 'soko-cake',
    sourceUrl: 'https://sokocakebakebrunch.com/wp-content/uploads/2024/07/Dimensions.png'
  },
  {
    name: 'RuNam d\'Or Cafe',
    slug: 'runam',
    sourceUrl: 'https://caferunam.com/logo.png'
  },
  {
    name: 'Là Việt Coffee',
    slug: 'la-viet',
    sourceUrl: 'https://laviet.coffee/wp-content/uploads/2023/03/logo.png'
  },
  {
    name: 'The Rustics Coffeeshop',
    slug: 'the-rustics',
    sourceUrl: 'https://noithatkendesign.vn/storage/app/uploads/public/6aa/8b6/9eb/6aa8b69eb871f375055762.png'
  },
  {
    name: 'La Terrasse',
    slug: 'la-terrasse',
    sourceUrl: 'https://d2e5ushqwiltxm.cloudfront.net/wp-content/uploads/sites/95/2024/03/19094825/MH_Logo_White_RGB.png'
  },
  {
    name: 'Bready Bánh Mì Tươi',
    slug: 'bready-banh-mi',
    sourceUrl: 'https://theme.hstatic.net/200000411281/1001307649/14/logo.png?v=941'
  },
  {
    name: 'Blackbird Coffee',
    slug: 'blackbird-coffee',
    sourceUrl: 'https://noithatkendesign.vn/storage/app/media/uploaded-files/Blackbird%20Coffee-1.jpg'
  },
  {
    name: 'Tranquil Books & Coffee',
    slug: 'tranquil-books',
    sourceUrl: 'https://cdn.capichiapp.com/yvfm6fsp467njrjf55jvvnewkkdm?filename=thumbnail.jpg'
  },
  {
    name: 'All Day Coffee',
    slug: 'all-day-coffee',
    sourceUrl: 'https://noithatkendesign.vn/storage/app/uploads/public/6aa/8b6/9eb/6aa8b69eb871f375055762.png'
  },
  {
    name: 'The Hive Lounge',
    slug: 'the-hive-lounge',
    sourceUrl: 'https://d2e5ushqwiltxm.cloudfront.net/wp-content/uploads/sites/95/2024/03/19094222/MH-NEW-LOGO_-BLACK-with-bg.png'
  },
  {
    name: 'An Café Specialty Coffee',
    slug: 'an-cafe',
    sourceUrl: 'https://laviet.coffee/wp-content/uploads/2023/03/logo.png'
  },
  {
    name: 'Jouri Dessert & Tea',
    slug: 'jouri-dessert',
    sourceUrl: 'https://static.cestsibon.vn/uploads/2022/09/csb_logofinal-13-e1663663721657.png'
  }
];

async function uploadAll() {
  console.log(`Starting upload for ${BRAND_CONFIGS.length} brands...`);
  const results = {};

  for (const b of BRAND_CONFIGS) {
    console.log(`Processing [${b.name}] from ${b.sourceUrl}...`);
    try {
      const res = await fetch(b.sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
        }
      });
      if (!res.ok) {
        console.error(`  -> Failed fetch ${b.name}: HTTP ${res.status}`);
        results[b.name] = b.sourceUrl;
        continue;
      }
      const rawContentType = res.headers.get('content-type') || 'image/png';
      const ext = rawContentType.includes('webp') ? 'webp' : rawContentType.includes('jpeg') || rawContentType.includes('jpg') ? 'jpg' : 'png';
      const contentType = ext === 'webp' ? 'image/webp' : ext === 'jpg' ? 'image/jpeg' : 'image/png';
      
      const buf = Buffer.from(await res.arrayBuffer());
      const storagePath = `brands/${b.slug}.${ext}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('store-logos')
        .upload(storagePath, buf, {
          contentType,
          upsert: true
        });

      if (error) {
        console.error(`  -> Upload error for ${b.name}:`, error.message);
        results[b.name] = b.sourceUrl;
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('store-logos')
          .getPublicUrl(storagePath);
        console.log(`  -> SUCCESS! Public URL: ${publicUrl}`);
        results[b.name] = publicUrl;
      }
    } catch (e) {
      console.error(`  -> Exception for ${b.name}:`, e.message);
      results[b.name] = b.sourceUrl;
    }
  }

  return results;
}

uploadAll().then(mapping => {
  console.log('\n--- COMPLETED UPLOADS ---');
  console.log(JSON.stringify(mapping, null, 2));
});
