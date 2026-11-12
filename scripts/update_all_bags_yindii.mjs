import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './lib/env.mjs';

function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig({ requireServiceRole: true });
  return createClient(url, serviceRoleKey);
}

// Map of updated Yindii-style name & description for all 63 bags
export const YINDII_BAG_UPDATES = {
  // === CATEGORY: MEAT / MÓN NÓNG ===
  '931b7eb7-5d18-449a-87f6-1747e9bcfbc5': {
    name: 'Túi Cứu Cơm Thố Cuối Ca (Hâm nóng khi dùng)',
    description: 'Phần cơm thố chế biến trong ca trưa/tối chưa bán hết, đóng hộp mang về để cùng GoSavingFood chống lãng phí thực phẩm. Gồm cơm cháy giòn đáy kèm xá xíu hoặc bò nướng đậm đà, kim chi và canh rong biển. ⚠️ Lưu ý Yindii: Thức ăn đóng hộp sạch sẽ, khuyên dùng hâm nóng lại 1–2 phút bằng lò vi sóng hoặc áp chảo trước khi thưởng thức để giữ trọn vị giòn thơm chuẩn quán.'
  },
  '5a650b75-b805-4fff-a91c-8800623ab25e': {
    name: 'Túi Cứu Cơm Niêu Cuối Ca (Hâm nóng khi dùng)',
    description: 'Phần cơm niêu Singapore đóng hộp từ ca trưa/tối chưa bán hết, gồm cơm cháy hai mặt giòn rụm kết hợp thịt xốt đậm vị (bò xốt tiêu đen hoặc gà nướng nấm) và canh rau xanh. ⚠️ Lưu ý Yindii: Thức ăn đóng hộp mang về, vui lòng hâm nóng lại 1–2 phút bằng lò vi sóng trước khi thưởng thức.'
  },

  // === CATEGORY: BEVERAGE / ĐỒ UỐNG & CÀ PHÊ ===
  'bac70001-0003-4000-8000-000000000003': {
    name: 'Túi Cứu Cà Phê Đóng Chai & Bánh Ngọt Highlands',
    description: 'Túi giải cứu thực phẩm gồm 01 chai cà phê phin đóng chai sẵn hoặc lon cà phê Highlands ướp lạnh (không phục vụ đá pha sẵn để tránh tan đá nhạt vị) kèm ngẫu nhiên 1 phần bánh phô mai, bánh chuối nướng hoặc mousse ngọt ngào trong ngày.'
  },
  '5f93f54c-f73a-4737-9d61-2de5396029aa': {
    name: 'Túi Cứu Cà Phê Đóng Chai & Bánh Tươi Highlands',
    description: 'Túi giải cứu gồm cà phê phin đóng chai lạnh sẵn trong ngày (không kèm đá pha tại chỗ để bảo toàn hương vị đậm đà) kết hợp ngẫu nhiên cùng 1 phần bánh ngọt tươi ngon nướng trong ngày từ Highlands Coffee.'
  },
  'a51a723e-e333-4374-9245-d0b0dfc7d0eb': {
    name: 'Túi Cứu Trà Trái Cây Đóng Chai & Thức Uống TocoToco',
    description: 'Túi giải khát cứu trợ gồm 2 chai trà trái cây tươi mát hoặc trà sữa đóng chai ủ lạnh trong ngày (bảo quản lạnh sẵn, không bỏ đá pha tại chỗ) giúp giải khát thanh lọc và không bị loãng vị.'
  },
  '5ae47709-4ceb-4aa9-b77e-284ef5a7c0e6': {
    name: 'Túi Cứu Kem Đóng Hộp & Bánh Lạnh Dairy Queen',
    description: 'Túi tráng miệng giải cứu từ Dairy Queen gồm kem tươi đóng hộp giữ lạnh chuyên dụng hoặc bánh kem lạnh hảo hạng chuẩn phong cách Mỹ, mang về dùng ngay hoặc bảo quản ngăn đông.'
  },
  '59d0f42d-c280-4b54-bd23-0b4a8b669fe8': {
    name: 'Túi Cứu Kem Sữa Đóng Hộp & Bánh Quế Baskin-Robbins',
    description: 'Túi kem cao cấp ngẫu nhiên từ 31 vị kem nổi tiếng thế giới của Baskin-Robbins đóng hộp bảo quản đông lạnh kèm bánh quế nướng giòn tan béo ngậy.'
  },
  '7a110000-0000-0000-0000-000000000004': {
    name: 'Túi Cứu Chè Dưỡng Nhan & Nước Sâm Đóng Chai An Lạc',
    description: 'Túi thức uống thực dưỡng đóng chai thanh mát trong ngày gồm chè tuyết yến dưỡng nhan, nước sâm hoặc hạt sen ninh mềm đóng chai mát lạnh tự nhiên giải tỏa âu lo.'
  },
  'bac70001-0010-4000-8000-000000000010': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Tươi The Coffee House',
    description: 'Túi cứu trợ gồm 01 chai cà phê Cold Brew ủ lạnh hoặc trà đóng chai bảo quản mát (không kèm đá pha tại chỗ) kết hợp cùng bánh mì ngọt/pastry nướng tươi trong ngày từ The Coffee House.'
  },
  'bac70001-0013-4000-8000-000000000013': {
    name: 'Túi Cứu Trà Ô Long Ủ Lạnh & Bánh Nướng Phê La',
    description: 'Túi bất ngờ từ Phê La gồm 01 chai trà Ô Long thủ công ủ lạnh đậm vị từ đồi chè Bảo Lộc (đóng chai sẵn không kèm đá để giữ trọn hậu vị thơm ngát) kèm bánh mì nướng mềm thơm bơ trong ngày.'
  },
  'bac70001-0026-4000-8000-000000000026': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Tart Oromia',
    description: 'Túi giải cứu bên hồ Tây từ Oromia gồm bánh tart trái cây tươi theo mùa hoặc bánh ngọt kem tươi kết hợp cùng 01 chai cà phê Cold Brew ủ lạnh thanh lọc đóng chai sẵn.'
  },
  'bac70001-0029-4000-8000-000000000029': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng Là Việt',
    description: 'Túi cà phê đặc sản Đà Lạt gồm 01 chai cà phê Cold Brew Arabica nguyên chất đóng chai sẵn (không dùng đá pha tại chỗ) kèm bánh quy bơ hạt điều hoặc bánh ngọt nướng mộc mạc.'
  },
  'bac70001-0032-4000-8000-000000000032': {
    name: 'Túi Cứu Trà Đóng Chai Di Sản & Bánh Madeleine Metropole',
    description: 'Túi phong vị Paris cổ điển 5 sao từ Metropole gồm trà ủ lạnh đóng chai cao cấp kèm các mẩu bánh madeleine bơ tươi hoặc bánh quy Pháp nướng mới trong ngày.'
  },
  'bac70001-0035-4000-8000-000000000035': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Quế Blackbird',
    description: 'Túi cà phê phố cổ đậm đà gồm 01 chai cà phê Cold Brew rang mộc ủ lạnh đóng chai sẵn kèm bánh cuộn quế cinnamon roll nướng thơm nức mũi.'
  },
  'bac70001-0038-4000-8000-000000000038': {
    name: 'Túi Cứu Trà Chiều Đóng Chai 5 Sao & Bánh Scone The Hive',
    description: 'Trải nghiệm tiệc trà trên mây từ tầng 62 InterContinental gồm bánh scone nướng bơ truyền thống kèm kem đông clotted cream và chai trà thảo mộc ủ lạnh thượng phẩm.'
  },
  'bac70001-0008-4000-8000-000000000008': {
    name: 'Túi Cứu Trà Đóng Chai Đậm Vị & Bánh Ngọt Phúc Long',
    description: 'Túi giải cứu từ Phúc Long gồm chai trà Ô Long hoặc trà trái cây đậm vị ủ lạnh đóng chai (không đá pha tại chỗ) kèm bánh ngọt nướng thơm béo trong ngày.'
  },
  'bac70001-0011-4000-8000-000000000011': {
    name: 'Túi Cứu Cà Phê Phin Đóng Chai & Bánh Nướng Cộng',
    description: 'Túi trải nghiệm hoài niệm gồm 01 chai cà phê phin ủ lạnh đóng chai sẵn của Cộng (được bảo quản mát, không phục vụ đá pha sẵn) kèm bánh croissant nướng mộc mạc thơm lừng.'
  },
  'bac70001-0014-4000-8000-000000000014': {
    name: 'Túi Cứu Cà Phê Đóng Chai & Bánh Pastry Cheese Coffee',
    description: 'Túi bất ngờ gồm 01 chai cà phê hoặc trà ủ lạnh đóng chai đặc trưng kèm bánh nướng bơ giòn rụm từ chuỗi cà phê phong cách Châu Âu Cheese Coffee.'
  },
  'bac70001-0030-4000-8000-000000000030': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng The Rustics',
    description: 'Túi giải cứu từ The Rustics gồm chai cà phê Cold Brew ủ lạnh thủ công thanh mát kèm bánh ngọt nướng trong ngày giữa không gian tổ chim phố cổ.'
  },
  'bac70001-0036-4000-8000-000000000036': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng Tranquil',
    description: 'Túi cà phê yên bình từ Tranquil gồm chai Cold Brew ủ chậm thơm hương hoa quả kèm bánh nướng mộc mạc thưởng thức cùng trang sách.'
  },
  'bac70001-0039-4000-8000-000000000039': {
    name: 'Túi Cứu Cà Phê Specialty Đóng Chai & Bánh Canelé An Café',
    description: 'Túi cà phê tinh hoa Tây Hồ gồm chai Cold Brew hạt specialty chọn lọc kèm bánh Canelé nướng vỏ giòn ruột mềm thơm mùi vani Pháp.'
  },
  'bac70001-0009-4000-8000-000000000009': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Sừng Bò Katinat',
    description: 'Túi giải cứu thời thượng gồm 01 chai Cold Brew hoặc trà ủ lạnh đóng chai bảo quản mát (không kèm đá) kết hợp cùng bánh sừng bò nướng bơ Pháp giòn rụm từ Katinat.'
  },
  'bac70001-0012-4000-8000-000000000012': {
    name: 'Túi Cứu Cà Phê Cold Brew Đóng Chai & Bánh Nướng Starbucks',
    description: 'Túi bất ngờ từ Starbucks gồm 01 phần cà phê Cold Brew ủ lạnh đóng chai hoặc lon Starbucks Reserve (không phục vụ đá pha tại chỗ) kèm 1 bánh pastry nướng tươi chuẩn mực.'
  },
  'bac70001-0028-4000-8000-000000000028': {
    name: 'Túi Cứu Cà Phê Di Sản Đóng Chai & Bánh Pastry RuNam',
    description: 'Túi ẩm thực thượng lưu RuNam gồm chai cà phê ủ lạnh tinh túy từ hạt Arabica Cầu Đất kèm bánh tart hoa quả hoặc pastry bơ nướng thơm lừng.'
  },
  'bac70001-0037-4000-8000-000000000037': {
    name: 'Túi Cứu Cà Phê Cold Brew & Bánh Waffle All Day',
    description: 'Túi trải nghiệm All Day gồm 01 chai Cold Brew ủ chậm nguyên bản đóng chai mát lạnh kèm bánh waffle nướng giòn ngọt ngào.'
  },

  // === CATEGORY: FAST FOOD & TIỆN LỢI (OTHER & BAKERY PIZZA) ===
  'c101a5bd-472a-4135-a948-ad8c50b8e121': {
    name: 'Túi Cứu Gà Giòn & Bữa Ăn Nhanh Cuối Ca McDonald\'s (Làm nóng khi dùng)',
    description: 'Túi giải cứu thức ăn nhanh chuẩn vị McDonald\'s gồm gà rán, burger hoặc khoai tây chiên chuẩn bị trong ca chưa bán hết, đóng hộp mang về. 💡 Khuyên dùng làm nóng lại bằng nồi chiên không dầu 3–5 phút để giòn ngon như mới.'
  },
  'e59e4220-3882-4f02-95e3-21d51abe796d': {
    name: 'Túi Cứu Burger & Món Nóng Cuối Ca McDonald\'s (Làm nóng khi dùng)',
    description: 'Túi thức ăn đóng hộp gồm burger bò nướng lửa thơm khói hoặc burger phi-lê kèm khoai tây chiên cuối ca. Vui lòng làm nóng lại trước khi thưởng thức để bánh mềm ngon.'
  },
  '03aa4b45-1c0a-4b5b-9419-8ca44123b842': {
    name: 'Túi Cứu Gà Rán & Bữa Ăn Nhanh Cuối Ca Lotteria (Làm nóng khi dùng)',
    description: 'Túi giải cứu từ Lotteria gồm gà rán sốt đậu hoặc gà rán truyền thống da giòn kèm khoai tây chiên chuẩn bị trong ca. Khuyên dùng làm nóng lại bằng nồi chiên không dầu trước khi dùng.'
  },
  '16eaa1e9-b4ca-46c9-a779-aca11b6bd567': {
    name: 'Túi Cứu Burger & Phô Mai Que Cuối Ca Lotteria (Làm nóng khi dùng)',
    description: 'Túi món ăn nhanh đóng hộp ngẫu nhiên gồm burger tôm hoặc burger bò phô mai kèm phô mai que Mozzarella nướng giòn cuối ca. Làm nóng lại 2-3 phút để phô mai tan chảy thơm ngậy.'
  },
  '2fd22156-be49-4567-8cd1-e89a168e541b': {
    name: 'Túi Cứu Pizza Nướng Trong Ngày Domino\'s (Làm nóng khi dùng)',
    description: 'Túi pizza bất ngờ từ bột tươi nhào tay Domino\'s kèm bánh mì bơ tỏi nướng giòn cuối ca. Vui lòng nướng lại bằng nồi chiên không dầu/lò nướng 3–5 phút để phô mai chảy đều và vỏ bánh giòn tan.'
  },
  'd5bd05a9-7324-4493-a6e6-489e30f6d573': {
    name: 'Túi Cứu Gà Giòn & Bữa Ăn Nhanh Cuối Ca KFC (Làm nóng khi dùng)',
    description: 'Túi bất ngờ từ KFC gồm gà rán công thức 11 loại thảo mộc huyền thoại hoặc gà giòn cay kèm khoai tây lắc phô mai chuẩn bị trong ca. Khuyên dùng hâm nóng lại để vỏ gà giòn rụm.'
  },
  '5f637281-5d7e-478f-8b58-330ed5eb2326': {
    name: 'Túi Cứu Bánh Trứng & Burger Cuối Ca KFC (Làm nóng khi dùng)',
    description: 'Túi giải cứu thực phẩm đóng hộp gồm bánh trứng nướng egg tart thơm ngậy ngàn lớp hoặc burger phi-lê gà giòn cay Zinger nức tiếng trong ngày.'
  },
  'bac70001-0017-4000-8000-000000000017': {
    name: 'Túi Cứu Bữa Ăn Tiện Lợi Cuối Ngày Circle K (Hâm nóng khi dùng)',
    description: 'Túi thực phẩm tiện dụng gồm ngẫu nhiên bánh bao nóng, xúc xích nướng, bánh mì ngọt hoặc nước ép đóng chai giải khát nhanh chóng trong ngày.'
  },
  'bac70001-0018-4000-8000-000000000018': {
    name: 'Túi Cứu Cơm Bento & Món Tiện Lợi Cuối Ca 7-Eleven (Hâm nóng khi dùng)',
    description: 'Túi đồ ăn nhanh tiện lợi quốc tế gồm ngẫu nhiên suất cơm Bento đóng hộp, bánh mì sandwich hoặc thức uống giải khát mát lạnh từ 7-Eleven. Hâm nóng cơm bento 1-2 phút trước khi dùng.'
  },
  'bac70001-0016-4000-8000-000000000016': {
    name: 'Túi Cứu Cơm Bento & Bữa Ăn Nhanh Cuối Ca GS25 (Hâm nóng khi dùng)',
    description: 'Túi đồ ăn tiện lợi phong cách Hàn Quốc gồm ngẫu nhiên cơm nắm tam giác onigiri, sandwich tươi, xúc xích hoặc cơm hộp bento từ GS25.'
  },
  '9ff75bc9-8339-4cb6-9fe2-1907bc2bd4f3': {
    name: 'Túi Cứu Nhu Yếu Phẩm & Bách Hóa Tiện Lợi WinMart+',
    description: 'Túi bách hóa tiện lợi gồm ngẫu nhiên các thực phẩm thiết yếu, sữa tươi tiệt trùng, bánh ngọt hoặc đồ uống đóng chai bảo quản tốt trong ngày cho gia đình.'
  },

  // === CATEGORY: VEGETARIAN / ĐỒ CHAY ===
  'b673df8e-2657-4d5c-bc32-3839100fc7f4': {
    name: 'Túi Cứu Ẩm Thực Chay Tinh Tế Cuối Ca Vị Lai (Hâm nóng khi dùng)',
    description: 'Túi mỹ vị thực dưỡng thanh tịnh từ Vị Lai gồm súp nấm rừng bổ dưỡng, cơm bọc lá sen hoặc các món chay nghệ thuật chế biến trong ngày chưa bán hết. Đóng hộp mang về sạch sẽ.'
  },
  '2c6f95b8-37f6-4ad2-bfaf-b2550cb8035c': {
    name: 'Túi Cứu Cơm Chay Thực Dưỡng Cuối Ca An Lạc (Hâm nóng khi dùng)',
    description: 'Phần cơm chay dinh dưỡng đóng hộp từ các món chuẩn bị trong ngày gồm cơm gạo lứt, đậu hũ sốt nấm, rau xào thập cẩm và canh dưỡng sinh thanh tịnh.'
  },
  'ffdae2e8-2df4-4547-88b2-20be1ca1ec79': {
    name: 'Túi Cứu Món Chay Tươi Ngon Cuối Ca An Lạc (Hâm nóng khi dùng)',
    description: 'Túi ẩm thực chay bất ngờ gồm bún nem nấm chay giòn rụm hoặc các món gỏi chay tươi mát bổ dưỡng trong ngày. Đóng hộp mang về tiện lợi.'
  },
  '7a110000-0000-0000-0000-000000000003': {
    name: 'Túi Cứu Lẩu Nấm & Rau Chay Cuối Ca An Lạc (Nấu nóng khi dùng)',
    description: 'Phần lẩu chay thảo mộc ngọt thanh tự nhiên gồm nước dùng nấm hầm, nấm tươi thập cẩm và đậu hũ non mềm mượt cho bữa ăn ấm cúng trọn vẹn.'
  },

  // === CATEGORY: RAW FOOD / NÔNG SẢN ===
  '15776100-8c1c-410a-8b6a-1b7602670f70': {
    name: 'Túi Cứu Nông Sản Sạch & Rau Củ VietGAP Trong Ngày WinMart+',
    description: 'Túi nông sản bất ngờ từ WinMart+ gồm ngẫu nhiên các loại rau xanh an toàn, nấm tươi và củ quả sạch đạt tiêu chuẩn VietGAP trong ngày cần giải cứu để tránh lãng phí.'
  },
  'bac70001-0015-4000-8000-000000000015': {
    name: 'Túi Cứu Rau Củ Tươi & Trái Cây VietGAP Trong Ngày WinMart+',
    description: 'Túi thực phẩm xanh bảo vệ sức khỏe từ WinMart+ gồm rau hữu cơ tươi non và trái cây theo mùa an toàn đạt chuẩn kiểm định an toàn vệ sinh.'
  },
  'bac70001-0019-4000-8000-000000000019': {
    name: 'Túi Cứu Nông Sản & Thực Phẩm Nhập Khẩu Annam Gourmet',
    description: 'Túi ẩm thực ngoại nhập cao cấp gồm ngẫu nhiên phô mai châu Âu hảo hạng, trái cây tươi nhập khẩu, bánh quy bơ hoặc mứt trái cây organic trong ngày.'
  },

  // === CATEGORY: BAKERY / TIỆM BÁNH (CHUẨN YINDII SURPRISE BAG) ===
  '8d61a0da-732e-426c-966f-a45e3f57f607': {
    name: 'Túi Bất Ngờ Bánh Mì & Bánh Ngọt Trong Ngày Fresh Garden',
    description: 'Mỗi ngày là một bất ngờ thú vị! Túi giải cứu gồm ngẫu nhiên 3–4 món bánh nướng trong ngày từ Fresh Garden (như sandwich tươi, donut chocolate, su kem hoặc bánh phô mai mềm) giúp chống lãng phí thực phẩm.'
  },
  'bac70001-0005-4000-8000-000000000005': {
    name: 'Túi Bất Ngờ Bánh Mì Chuẩn Âu & Pastry Paris Baguette',
    description: 'Túi bánh cao cấp ngẫu nhiên từ Paris Baguette (có thể bao gồm bánh mì baguette nướng vỏ giòn, croissant bơ thơm, bánh kem phô mai hoặc pastry hoa quả nướng trong ngày).'
  },
  'bac70001-0006-4000-8000-000000000006': {
    name: 'Túi Bất Ngờ Bánh Thủ Công & Su Kem Sapo Bakery',
    description: 'Túi bất ngờ từ Sapo Bakery gồm ngẫu nhiên các loại bánh su kem béo ngậy, bánh mì bơ tỏi nướng hoặc bánh bông lan trứng muối tươi ngon nướng trong ngày.'
  },
  'bac70001-0002-4000-8000-000000000002': {
    name: 'Túi Bất Ngờ Bánh Tươi & Bánh Quy Bơ Pháp Fresh Garden',
    description: 'Mỗi phần là một kết hợp ngẫu nhiên các món bánh mì mềm thơm bơ, cookies giòn rụm hoặc bánh ngọt tráng miệng nhẹ nhàng thưởng thức cùng trà chiều.'
  },
  '82d37623-53ef-4e5e-bcb9-6793cb435aff': {
    name: 'Túi Bất Ngờ Bánh Mì & Pastry Nướng Tươi Tous Les Jours',
    description: 'Mỗi ngày là một bất ngờ thú vị! Túi bao gồm ngẫu nhiên 3–4 món bánh tươi trong ngày từ Tous Les Jours (như bánh mì baguette, croissant bơ Pháp, pastry nướng hoặc bánh phô mai mềm tùy mẻ bánh trong ngày).'
  },
  'bac70001-0004-4000-8000-000000000004': {
    name: 'Túi Bất Ngờ Bánh Mì & Pastry Nướng BreadTalk',
    description: 'Túi bánh bất ngờ từ BreadTalk Singapore gồm ngẫu nhiên 3–4 món bánh nướng đặc trưng (như bánh mì chà bông flosss, danish trái cây, bánh phô mai tươi hoặc donut ngọt nướng trong ngày).'
  },
  'c67f81fa-4b47-4483-baef-142c7b4f8be1': {
    name: 'Túi Bất Ngờ Bánh Ngọt & Croissant Thượng Hạng Tous Les Jours',
    description: 'Trải nghiệm bánh ngọt phong vị Pháp tinh tế! Túi ngẫu nhiên gồm các loại bánh kem su, pain au chocolat, croissant ngàn lớp hoặc bánh tart béo thơm nướng mới mỗi ngày.'
  },
  'bac70001-0001-4000-8000-000000000001': {
    name: 'Túi Bất Ngờ Bánh Mì Dinh Dưỡng & Bánh Mềm Tous Les Jours',
    description: 'Túi bánh tươi dinh dưỡng bất ngờ từ Tous Les Jours (có thể gồm bánh mì gối sữa, bánh su kem, bánh mì xúc xích hoặc bánh nướng ngũ cốc trong ngày) chuẩn chất lượng Pháp - Hàn.'
  },
  'bac70001-0022-4000-8000-000000000022': {
    name: 'Túi Bất Ngờ Bánh Mì Men Sourdough & Pastry Saint Honoré',
    description: 'Túi bất ngờ phong vị Pháp từ Saint Honoré gồm ngẫu nhiên bánh mì men sourdough, croissant bơ vàng ruộm, bánh su dài éclair hoặc bánh brioche mềm nướng trong ngày.'
  },
  'bac70001-0020-4000-8000-000000000020': {
    name: 'Túi Bất Ngờ Bánh Tráng Miệng & Bánh Nướng Fresh Garden',
    description: 'Tuyển chọn ngẫu nhiên các món bánh ngọt tráng miệng trong ngày từ Fresh Garden (như mousse hoa quả, bánh bông lan kem tươi hoặc bánh quy dinh dưỡng).'
  },
  'bac70001-0007-4000-8000-000000000007': {
    name: 'Túi Bất Ngờ Bánh Mì & Bánh Ngọt Pháp Anh Hòa Bakery',
    description: 'Túi ngẫu nhiên gồm các dòng bánh nướng bơ sữa New Zealand hảo hạng từ Anh Hòa Bakery (như bánh mì ngũ cốc, mousse chanh leo, tart hoa quả hoặc bánh kem mềm).'
  },
  'bac70001-0021-4000-8000-000000000021': {
    name: 'Túi Bất Ngờ Bánh Ngọt & Socola Thủ Công Maison Marou',
    description: 'Túi bất ngờ thượng lưu từ Maison Marou gồm các loại bánh ngọt ngẫu nhiên như mousse socola, brownie đậm vị, tart cacao hoặc pastry nướng trong ngày.'
  },
  'bac70001-0023-4000-8000-000000000023': {
    name: 'Túi Bất Ngờ Bánh Ngọt Quý Tộc L’Épicerie Metropole',
    description: 'Túi tráng miệng 5 sao di sản từ Metropole gồm ngẫu nhiên các món macaron danh giá, bánh brioche bơ Pháp thượng phẩm hoặc bánh pastry tinh xảo nướng trong ngày.'
  },
  'bac70001-0024-4000-8000-000000000024': {
    name: 'Túi Bất Ngờ Bánh Kem & Bánh Mì Thủ Công Artisan',
    description: 'Túi bánh tươi phong cách Hàn Quốc gồm ngẫu nhiên bánh kem tươi hoa quả, bánh mì đậu đỏ ngọt bùi hoặc bánh gối mềm dinh dưỡng nướng trong ngày.'
  },
  'bac70001-0027-4000-8000-000000000027': {
    name: 'Túi Bất Ngờ Bánh Nướng Sáng Tạo Soko Cake Bake',
    description: 'Túi bánh thời thượng ngẫu nhiên gồm các siêu phẩm nướng từ Soko như bánh cronut kem bơ, cube croissant ngàn lớp hoặc bánh pastry nướng giòn rụm trong ngày.'
  },
  'bac70001-0033-4000-8000-000000000033': {
    name: 'Túi Bất Ngờ Bánh Mì Bơ Tỏi & Tráng Miệng Paris Baguette',
    description: 'Túi bánh tươi bất ngờ từ Paris Baguette gồm bánh mì bơ tỏi phô mai thơm lừng, bánh custard mềm mịn hoặc bánh sừng bò nướng trong ngày.'
  },
  'bac70001-0025-4000-8000-000000000025': {
    name: 'Túi Bất Ngờ Bánh Crepe Ngàn Lớp C’est Si Bon',
    description: 'Trải nghiệm bánh ngọt tinh tế ngẫu nhiên gồm các lát bánh crepe ngàn lớp mille crepe trứ danh, tart trái cây hoặc mousse béo ngậy từ C\'est Si Bon.'
  },
  'bac70001-0031-4000-8000-000000000031': {
    name: 'Túi Bất Ngờ Bánh Danish & Bánh Mì Cao Cấp Tous Les Jours',
    description: 'Túi bánh bất ngờ gồm bánh danish nho khô ngàn lớp, bánh mì hoa cúc bơ sữa hoặc các dòng bánh nướng bơ tỏi thơm lừng nướng trong ngày từ Tous Les Jours.'
  },
  'bac70001-0034-4000-8000-000000000034': {
    name: 'Túi Bất Ngờ Bánh Mì Dinh Dưỡng & Nước Ép Tươi Bready',
    description: 'Combo bữa ăn nhẹ thanh lành gồm bánh mì tươi mềm dinh dưỡng kết hợp cùng chai nước ép hoa quả nguyên chất đóng chai trong ngày từ Bready.'
  },
  'bac70001-0040-4000-8000-000000000040': {
    name: 'Túi Bất Ngờ Tráng Miệng Tiramisu & Trà Hoa Jouri',
    description: 'Túi tráng miệng lãng mạn Bắc Âu từ Jouri gồm bánh tiramisu ngập tràn kem phô mai Mascarpone thoảng hương rượu kèm chai trà hoa cúc mật ong thư giãn đóng chai trong ngày.'
  }
};

async function run() {
  const sb = createAdminClient();
  console.log(`Starting to update all ${Object.keys(YINDII_BAG_UPDATES).length} bags to Yindii style...`);

  let count = 0;
  for (const [id, update] of Object.entries(YINDII_BAG_UPDATES)) {
    const { error } = await sb.from('surprise_bags').update({
      name: update.name,
      description: update.description,
      updated_at: new Date().toISOString()
    }).eq('id', id);

    if (error) {
      console.error(`Failed to update ${id}:`, error);
    } else {
      count++;
      console.log(`[${count}/${Object.keys(YINDII_BAG_UPDATES).length}] Updated bag: ${update.name}`);
    }
  }

  console.log(`Successfully updated ${count} bags in Supabase!`);
}

if (process.argv[1] && process.argv[1].endsWith('update_all_bags_yindii.mjs')) {
  run().catch(console.error);
}
