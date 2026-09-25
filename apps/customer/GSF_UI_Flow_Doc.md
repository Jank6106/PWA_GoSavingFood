import {
Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak,
TableBorders, convertInchesToTwip
} from "docx";
import fs from "fs";

// ── Helpers ───────────────────────────────────
const COLORS = {
primary: "006c40",
dark: "003426",
bg: "F8F9FA",
red: "EF4444",
black: "000000",
gray: "666666",
white: "FFFFFF",
lightGreen: "E8F5E9",
headerBg: "003426",
};

const h1 = (text) => new Paragraph({
children: [new TextRun({ text, bold: true, size: 32, color: COLORS.primary, font: "Calibri" })],
heading: HeadingLevel.HEADING_1,
spacing: { before: 400, after: 200 },
});

const h2 = (text) => new Paragraph({
children: [new TextRun({ text, bold: true, size: 26, color: COLORS.dark, font: "Calibri" })],
heading: HeadingLevel.HEADING_2,
spacing: { before: 300, after: 150 },
});

const h3 = (text) => new Paragraph({
children: [new TextRun({ text, bold: true, size: 22, color: COLORS.dark, font: "Calibri" })],
heading: HeadingLevel.HEADING_3,
spacing: { before: 250, after: 100 },
});

const body = (text) => new Paragraph({
children: [new TextRun({ text, size: 20, font: "Calibri" })],
spacing: { after: 80 },
});

const bodyBold = (text) => new Paragraph({
children: [new TextRun({ text, bold: true, size: 20, font: "Calibri" })],
spacing: { after: 80 },
});

const bullet = (text) => new Paragraph({
children: [new TextRun({ text, size: 20, font: "Calibri" })],
bullet: { level: 0 },
spacing: { after: 40 },
});

const subbullet = (text) => new Paragraph({
children: [new TextRun({ text, size: 20, font: "Calibri" })],
bullet: { level: 1 },
spacing: { after: 40 },
});

const codeBlock = (text) => new Paragraph({
children: [new TextRun({ text, size: 18, font: "Consolas", color: COLORS.dark })],
spacing: { before: 40, after: 40 },
indent: { left: convertInchesToTwip(0.3) },
shading: { type: ShadingType.SOLID, color: "F5F5F5" },
});

const emptyLine = () => new Paragraph({ children: [], spacing: { after: 100 } });

const noBorders = {
top: { style: BorderStyle.NONE, size: 0 },
bottom: { style: BorderStyle.NONE, size: 0 },
left: { style: BorderStyle.NONE, size: 0 },
right: { style: BorderStyle.NONE, size: 0 },
};

const tableBorders = {
top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
};

function makeTable(headers, rows) {
const headerRow = new TableRow({
tableHeader: true,
children: headers.map(h => new TableCell({
children: [new Paragraph({
children: [new TextRun({ text: h, bold: true, size: 18, color: COLORS.white, font: "Calibri" })],
alignment: AlignmentType.CENTER,
})],
shading: { type: ShadingType.SOLID, color: COLORS.headerBg },
borders: tableBorders,
})),
});

const dataRows = rows.map((row, ri) => new TableRow({
children: row.map(cell => new TableCell({
children: [new Paragraph({
children: [new TextRun({ text: String(cell), size: 18, font: "Calibri" })],
})],
shading: ri % 2 === 0 ? { type: ShadingType.SOLID, color: COLORS.bg } : {},
borders: tableBorders,
})),
}));

return new Table({
rows: [headerRow, ...dataRows],
width: { size: 100, type: WidthType.PERCENTAGE },
});
}

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// ── Build Document ───────────────────────────
const doc = new Document({
styles: {
default: {
document: { run: { font: "Calibri", size: 20 } },
},
},
sections: [{
properties: {
page: {
margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
},
},
children: [
// ── TITLE PAGE ──
emptyLine(), emptyLine(), emptyLine(),
new Paragraph({
children: [new TextRun({ text: "📱 TÀI LIỆU MÔ TẢ", size: 40, bold: true, color: COLORS.primary, font: "Calibri" })],
alignment: AlignmentType.CENTER,
}),
new Paragraph({
children: [new TextRun({ text: "LUỒNG GIAO DIỆN & THIẾT KẾ", size: 36, bold: true, color: COLORS.dark, font: "Calibri" })],
alignment: AlignmentType.CENTER,
spacing: { after: 100 },
}),
new Paragraph({
children: [new TextRun({ text: "GoSavingFood — Customer App", size: 28, color: COLORS.primary, font: "Calibri" })],
alignment: AlignmentType.CENTER,
spacing: { after: 300 },
}),
makeTable(["Thông tin", "Chi tiết"], [
["Phiên bản", "1.0"],
["Ngày tạo", "25/09/2026"],
["Nền tảng", "Expo (React Native) — iOS, Android, Web"],
["Framework", "Expo Router (file-based routing)"],
["Kiến trúc dữ liệu", "Mock data → cần chuyển sang API thực"],
]),
emptyLine(),
body("Tài liệu này mô tả toàn bộ luồng giao diện, thiết kế của ứng dụng GoSavingFood (phía khách hàng), bao gồm chi tiết từng màn hình, design system, cấu trúc dữ liệu, và bảng tổng hợp các API endpoint cần tách để tích hợp backend thực."),

      pageBreak(),

      // ── 1. TỔNG QUAN KIẾN TRÚC ──
      h1("1. TỔNG QUAN KIẾN TRÚC"),

      h2("1.1 Cấu trúc thư mục"),
      codeBlock("src/"),
      codeBlock("├── app/                    # Expo Router — file-based routing"),
      codeBlock("│   ├── _layout.tsx         # Root layout (ThemeProvider + Stack)"),
      codeBlock("│   ├── index.tsx           # Entry → Redirect to /(customer)/(tabs)"),
      codeBlock("│   └── (customer)/         # Customer group layout"),
      codeBlock("│       ├── _layout.tsx     # AuthProvider + Stack + AuthModal"),
      codeBlock("│       ├── auth.tsx        # Đăng nhập / Đăng ký"),
      codeBlock("│       ├── (tabs)/         # Bottom Tab Navigator"),
      codeBlock("│       │   ├── _layout.tsx # Tabs config (BottomTaskbar)"),
      codeBlock("│       │   ├── index.tsx   # 🏠 Trang chủ (Khám phá)"),
      codeBlock("│       │   ├── search.tsx  # 🔍 Tìm kiếm"),
      codeBlock("│       │   ├── cart.tsx    # 🛒 Giỏ hàng"),
      codeBlock("│       │   ├── orders.tsx  # 📦 Đơn hàng"),
      codeBlock("│       │   └── profile.tsx # 👤 Cá nhân"),
      codeBlock("│       ├── bag/[id].tsx    # Chi tiết túi thực phẩm"),
      codeBlock("│       ├── bags/index.tsx  # Danh sách tất cả túi"),
      codeBlock("│       ├── merchant/[id].tsx # Chi tiết cửa hàng"),
      codeBlock("│       ├── brand/[id].tsx  # Chi tiết thương hiệu"),
      codeBlock("│       ├── checkout.tsx    # Đặt hàng"),
      codeBlock("│       ├── payment.tsx     # Thanh toán"),
      codeBlock("│       ├── order/success.tsx # Đặt hàng thành công"),
      codeBlock("│       ├── order/[id]/     # Chi tiết / Review / Report"),
      codeBlock("│       ├── notifications.tsx # Thông báo"),
      codeBlock("│       └── select-location.tsx # Chọn vị trí"),
      codeBlock("├── hooks/                  # Custom hooks (data fetching)"),
      codeBlock("├── services/               # API + Mock services"),
      codeBlock("├── contexts/               # React Context (AuthContext)"),
      codeBlock("├── shared/                 # Components + Types"),
      codeBlock("└── constants/              # Design tokens"),
      emptyLine(),

      h2("1.2 Kiến trúc dữ liệu (Service Pattern)"),
      body("Ứng dụng sử dụng pattern 3 lớp: Screen → Hook → Service"),
      bullet("Screen/Page (UI Layer): Chỉ hiển thị giao diện, không chứa business logic"),
      bullet("Custom Hook (useXxx.ts): Xử lý data fetching, state management"),
      bullet("Service (*.api.ts / *.mock.ts): Giao tiếp với API hoặc trả mock data"),
      emptyLine(),
      body("Toggle Mock/API qua biến môi trường: EXPO_PUBLIC_USE_MOCK"),
      bullet("true (mặc định) → Dùng *.mock.ts"),
      bullet("false → Dùng *.api.ts (gọi API thực qua apiClient)"),

      pageBreak(),

      // ── 2. SƠ ĐỒ LUỒNG NAVIGATION ──
      h1("2. SƠ ĐỒ LUỒNG NAVIGATION"),

      h2("2.1 Luồng chính (Main Flow)"),
      body("App Start → Root Layout (ThemeProvider) → Customer Layout (AuthProvider) → Bottom Tabs"),
      emptyLine(),
      makeTable(["Tab", "Route", "Màn hình", "Hiển thị"], [
        ["🏠", "/(customer)/(tabs)/", "Trang chủ - Khám phá", "Có"],
        ["🔍", "/(customer)/(tabs)/search", "Tìm kiếm", "Ẩn (navigate qua code)"],
        ["🛒", "/(customer)/(tabs)/cart", "Giỏ hàng", "Có"],
        ["📦", "/(customer)/(tabs)/orders", "Đơn hàng", "Có"],
        ["👤", "/(customer)/(tabs)/profile", "Cá nhân", "Có"],
      ]),

      h2("2.2 Luồng mua hàng (Purchase Flow)"),
      body("Trang chủ / Tìm kiếm / Danh sách túi"),
      body("    → Bag Detail (bag/[id]) — Xem chi tiết túi thực phẩm"),
      body("        → Cart (tabs/cart) — Giỏ hàng"),
      body("            → Checkout (checkout.tsx) — Xác nhận đơn hàng"),
      body("                → Payment (payment.tsx) — QR + Chuyển khoản"),
      body("                    → Success (order/success.tsx) — Đặt hàng thành công"),
      body("                        → Orders Tab HOẶC Trang chủ"),

      h2("2.3 Luồng xác thực (Auth Flow)"),
      body("Khi người dùng chưa đăng nhập truy cập trang yêu cầu auth (Giỏ hàng, Đơn hàng, Profile):"),
      bullet("showAuthModal() → Hiển thị AuthModal (bottom sheet overlay toàn cục)"),
      bullet("Đăng nhập bằng Email+OTP hoặc Google"),
      bullet("Login thành công → AuthContext.user = User, isAuthenticated = true"),
      bullet("Đóng modal → Hiển thị nội dung đầy đủ"),

      pageBreak(),

      // ── 3. DESIGN SYSTEM ──
      h1("3. DESIGN SYSTEM & TOKEN"),

      h2("3.1 Bảng màu (Color Palette)"),
      makeTable(["Token", "Hex", "Sử dụng"], [
        ["PRIMARY_COLOR", "#006c40", "Màu chủ đạo, nút CTA, icon"],
        ["PRIMARY_GREEN", "#1E6F4F", "Màu xanh lá đậm thay thế"],
        ["PRIMARY_DARK", "#003426", "Nền card merchant dark"],
        ["PRIMARY_FIXED", "#93f7ba", "Badge nổi bật"],
        ["BACKGROUND", "#F8F9FA / #F8FAF6", "Nền chính toàn app"],
        ["SURFACE", "#FFFFFF", "Nền card, modal, bottom bar"],
        ["TEXT_DARK", "#191C1D", "Text chính"],
        ["TEXT_MUTED", "#3e4941 / #404944", "Text phụ, mô tả"],
        ["BORDER", "#becabe / #BFC9C3", "Viền card"],
        ["DISCOUNT_RED", "#EF4444", "Badge giảm giá, cảnh báo"],
        ["MINT_BG", "#DCFCE7", "Nền badge xanh nhạt"],
      ]),

      h2("3.2 Typography"),
      makeTable(["Loại", "Font Size", "Font Weight"], [
        ["Heading XXL", "FontSize.xxl", "800"],
        ["Heading XL", "FontSize.xl", "800"],
        ["Heading LG", "FontSize.lg", "700-800"],
        ["Body MD", "FontSize.md", "500-700"],
        ["Body SM", "FontSize.sm", "500-600"],
        ["Caption XS", "FontSize.xs", "600-700"],
      ]),

      h2("3.3 Spacing & Border Radius"),
      bullet("Spacing: Spacing.one → Spacing.six (scale hệ thống)"),
      bullet("Border Radius: BorderRadius.sm / md / lg / xl / full"),
      bullet("Card shadow: shadowOpacity 0.04-0.06, elevation 1-3"),

      pageBreak(),

      // ── 4. CHI TIẾT TỪNG MÀN HÌNH ──
      h1("4. CHI TIẾT TỪNG MÀN HÌNH"),

      // 4.1 Home
      h2("4.1 🏠 Trang chủ — Khám phá (tabs/index.tsx)"),
      body("Mục đích: Trang landing chính, hiển thị tổng quan sản phẩm và khuyến mãi."),
      emptyLine(),
      bodyBold("Cấu trúc UI (từ trên xuống):"),
      makeTable(["Thành phần", "Mô tả", "Nguồn dữ liệu"], [
        ["AppHeader", "Logo GoSavingFood + nút Thông báo", "—"],
        ["Banner Carousel", "FlatList horizontal, auto-scroll 4s, 3 banner", "⚠️ HARDCODE BANNERS[]"],
        ["Search Bar", "Nút bấm → navigate /search", "—"],
        ["Categories", "ScrollView horizontal, 6 loại", "⚠️ HARDCODE CATEGORIES[]"],
        ["Info Card Vị trí", "Card hiển thị vị trí, nhấn → /select-location", "🔌 useLocations()"],
        ["Túi bất ngờ", "FlatList horizontal, auto-scroll 6s", "🔌 useMerchants() → bags"],
        ["Thương hiệu nổi bật", "ScrollView horizontal, logo brand", "⚠️ HARDCODE mockBrands"],
        ["Giải cứu cấp tốc", "FlatList horizontal, card merchant, auto-scroll 5s", "🔌 useMerchants()"],
      ]),
      emptyLine(),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("BANNERS[] → GET /api/banners"),
      bullet("mockBrands → GET /api/brands (đã có brandService)"),
      bullet("CATEGORIES[] → Có thể static hoặc GET /api/categories"),
      bullet("useMerchants() → Đã có mock, cần gắn API thực"),

      // 4.2 Search
      h2("4.2 🔍 Tìm kiếm (tabs/search.tsx)"),
      body("Mục đích: Tìm kiếm cửa hàng + túi thực phẩm, bản đồ + bottom sheet."),
      makeTable(["Thành phần", "Mô tả", "Nguồn dữ liệu"], [
        ["Search Input", "TextInput tìm kiếm", "local state"],
        ["Filter Chips", "8 loại filter (Gần đây, Đang mở, Rating...)", "⚠️ HARDCODE"],
        ["Map View", "Ảnh bản đồ tĩnh + pin cửa hàng", "🔌 useMerchants()"],
        ["Bottom Sheet Panel", "Swipable, danh sách cửa hàng + túi", "🔌 useMerchants()"],
      ]),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("Tìm kiếm real-time → GET /api/merchants?q=...&filter=..."),
      bullet("Tích hợp bản đồ thực (Google Maps / Mapbox)"),

      // 4.3 Cart
      h2("4.3 🛒 Giỏ hàng (tabs/cart.tsx)"),
      body("Mục đích: Quản lý sản phẩm trong giỏ hàng trước khi checkout."),
      bodyBold("Trạng thái UI:"),
      bullet("Chưa đăng nhập → Card mời đăng nhập + nút showAuthModal()"),
      bullet("Giỏ trống → Icon + text 'Giỏ hàng trống' + nút 'Khám phá ngay'"),
      bullet("Có sản phẩm → Danh sách CartItem + Bottom Bar + nút Checkout"),
      emptyLine(),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("useCart() hiện là local state → cần đồng bộ với server POST /api/cart"),
      bullet("Countdown hết hạn → cần lấy expiresAt từ API"),
      bullet("Kiểm tra tồn kho real-time trước checkout"),

      // 4.4 Orders
      h2("4.4 📦 Đơn hàng (tabs/orders.tsx)"),
      body("Mục đích: Danh sách đơn hàng, filter theo trạng thái."),
      bodyBold("Filter Tabs: Tất cả | Chờ xác nhận | Chờ lấy | Đã hoàn thành | Đã hủy"),
      makeTable(["Status", "Label", "Background", "Text Color"], [
        ["pending/confirmed/preparing", "Chờ xác nhận", "#FFDAD6", "#68342F"],
        ["ready_for_pickup", "Chờ lấy", "#E8F5E9", "#1E6F4F"],
        ["picked_up/completed", "Đã hoàn thành", "#E1E3E0", "#404944"],
        ["cancelled", "Đã hủy", "#FEE2E2", "#EF4444"],
        ["refund_requested", "Yêu cầu hoàn tiền", "#FEF3C7", "#92400E"],
      ]),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("GET /api/orders?status=... (danh sách + filter)"),
      bullet("Pagination / infinite scroll"),
      bullet("Real-time update trạng thái (WebSocket / polling)"),

      // 4.5 Profile
      h2("4.5 👤 Cá nhân (tabs/profile.tsx)"),
      body("Mục đích: Thông tin tài khoản, menu điều hướng, đăng xuất."),
      bodyBold("Menu khi đã đăng nhập:"),
      bullet("Đơn hàng của tôi → /(customer)/(tabs)/orders"),
      bullet("Địa chỉ đã lưu → (chưa implement)"),
      bullet("Phương thức thanh toán → (chưa implement)"),
      bullet("Mã giảm giá của tôi → (chưa implement)"),
      bullet("Thông báo → /(customer)/notifications"),
      bullet("Cài đặt ứng dụng → (chưa implement)"),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("GET /api/customer/profile"),
      bullet("PUT /api/customer/profile"),
      bullet("POST /api/upload/avatar"),

      // 4.6 Auth
      h2("4.6 🔐 Đăng nhập / Đăng ký (auth.tsx + AuthModal)"),
      body("Hai mode: Đăng nhập (phone + OTP) và Đăng ký (name + phone + OTP)."),
      body("AuthModal là bottom sheet toàn cục, được hiển thị qua showAuthModal() từ AuthContext."),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("POST /api/auth/login (phone + OTP)"),
      bullet("POST /api/auth/register (name + phone)"),
      bullet("POST /api/auth/send-otp"),
      bullet("POST /api/auth/google"),

      pageBreak(),

      // 4.7 Bag Detail
      h2("4.7 🍱 Chi tiết Túi thực phẩm (bag/[id].tsx)"),
      body("Mục đích: Xem chi tiết surprise bag, thêm vào giỏ hoặc mua ngay."),
      makeTable(["Thành phần", "Mô tả"], [
        ["Hero Image", "Ảnh lớn + badge giảm giá + pagination dots"],
        ["Title & Price", "Tên túi + Giá ưu đãi / Giá gốc (gạch)"],
        ["Countdown Timer", "⏱️ Hết hạn sau: HH:MM:SS (đếm ngược real-time)"],
        ["Merchant Card", "Logo + Tên + Rating + Nút 'Xem Shop'"],
        ["Mô tả", "Text description từ cửa hàng"],
        ["Đánh giá", "Card review mẫu (HARDCODE) + 'Xem tất cả'"],
        ["Bottom Bar", "2 nút: 🛒 Thêm vào giỏ + Mua ngay"],
        ["Modal số lượng", "Animated bottom sheet + stepper"],
      ]),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("GET /api/bags/:id"),
      bullet("GET /api/bags/:id/reviews (hiện hardcode)"),
      bullet("POST /api/cart/add"),

      // 4.8 Merchant
      h2("4.8 🏪 Chi tiết Cửa hàng (merchant/[id].tsx)"),
      body("Banner + Info Card (dark theme) + Tab Navigation (Túi bất ngờ / Giới thiệu)"),
      body("Stats: Rating | Lượt bán | Khoảng cách"),
      bodyBold("🔴 API: GET /api/merchants/:id + GET /api/merchants/:id/bags"),

      // 4.9 Brand
      h2("4.9 🏷️ Chi tiết Thương hiệu (brand/[id].tsx)"),
      body("Banner + Logo lớn floating + Brand description (expandable) + Sustainability banner"),
      body("Danh sách cửa hàng sắp xếp theo khoảng cách, mỗi card hiển thị: Tên, trạng thái, badge km, địa chỉ, giờ mở, rating"),
      bodyBold("🔴 API: GET /api/brands/:id + GET /api/brands/:id/stores"),

      // 4.10 Checkout
      h2("4.10 📋 Checkout — Đặt hàng (checkout.tsx)"),
      body("⚠️ ĐÂY LÀ MÀN HÌNH CÓ NHIỀU DỮ LIỆU HARDCODE NHẤT, CẦN ƯU TIÊN TÁCH API"),
      makeTable(["Section", "Nội dung", "Nguồn dữ liệu"], [
        ["Thông tin khách hàng", "Input: Tên + SĐT (validation)", "⚠️ HARDCODE defaults"],
        ["Thông tin nhận hàng", "Địa điểm (static) + Khung giờ", "⚠️ HARDCODE"],
        ["Đơn hàng", "Danh sách sản phẩm", "⚠️ HARDCODE checkoutItems"],
        ["Khuyến mãi", "Voucher code (bottom sheet)", "🔌 useVouchers()"],
        ["Ghi chú", "TextArea", "local state"],
        ["Phương thức TT", "Chuyển khoản / MoMo", "⚠️ HARDCODE"],
        ["Tóm tắt chi phí", "Tạm tính / Giảm / Tổng", "computed"],
      ]),
      bodyBold("🔴 Phần cần tách API (QUAN TRỌNG):"),
      bullet("checkoutItems → GET /api/cart"),
      bullet("Khung giờ → GET /api/merchants/:id/pickup-slots"),
      bullet("Voucher → POST /api/vouchers/validate"),
      bullet("Tạo đơn → POST /api/orders"),
      bullet("Phương thức TT → GET /api/payment-methods"),

      // 4.11 Payment
      h2("4.11 💳 Thanh toán (payment.tsx)"),
      body("QR Code VietQR + Thông tin chuyển khoản + Copy buttons + Nút xác nhận"),
      body("⚠️ Toàn bộ thông tin ngân hàng, QR, STK đang HARDCODE"),
      bodyBold("🔴 Phần cần tách API:"),
      bullet("GET /api/payment/bank-info"),
      bullet("GET /api/payment/:orderId/qr"),
      bullet("POST /api/payment/:orderId/confirm"),

      // 4.12 Success
      h2("4.12 ✅ Đặt hàng thành công (order/success.tsx)"),
      body("Ticket card style: QR nhận hàng + Mã đơn + Chi tiết đơn + Tổng tiền"),
      body("⚠️ Toàn bộ thông tin HARDCODE → cần nhận từ response POST /api/orders"),

      // 4.13-4.18
      h2("4.13 📄 Chi tiết Đơn hàng (order/[id]/index.tsx)"),
      body("Status Card + QR (khi ready_for_pickup) + Merchant Info + Order Items + Pickup Info"),
      body("Hook: useOrderDetail(id) → GET /api/orders/:id"),

      h2("4.14 ⭐ Đánh giá (order/[id]/review.tsx)"),
      body("5 sao rating + Comment box + Nút gửi"),
      body("🔴 API: POST /api/orders/:id/review"),

      h2("4.15 🚨 Báo cáo sự cố (order/[id]/report.tsx)"),
      body("Grid 4 loại sự cố + TextInput mô tả + Nút gửi"),
      body("🔴 API: POST /api/orders/:id/report + POST /api/upload/issue-images"),

      h2("4.16 🔔 Thông báo (notifications.tsx)"),
      body("FlatList notifications + Badge unread + Mark as read"),
      body("🔴 API: GET /api/notifications + PATCH /api/notifications/:id/read"),

      h2("4.17 📍 Chọn Vị trí (select-location.tsx)"),
      body("Search + Map (ảnh tĩnh) + Pin draggable + GPS option + Confirm"),
      body("🔴 API: GET /api/locations/search + Google Maps integration"),

      h2("4.18 🛍️ Tất cả túi (bags/index.tsx)"),
      body("FlatList store sections, mỗi section có horizontal scroll bag cards"),
      body("Hook: useAllBags() → GET /api/bags?q=..."),

      pageBreak(),

      // ── 5. SHARED COMPONENTS ──
      h1("5. SHARED COMPONENTS"),
      makeTable(["Component", "Mô tả"], [
        ["AppHeader", "Header chung: Logo + Nút thông báo"],
        ["AnimatedScreen", "Wrapper fade-in animation cho screen"],
        ["AuthModal", "Modal đăng nhập/đăng ký (bottom sheet toàn cục)"],
        ["Badge", "Badge label: success/warning/error/info/primary"],
        ["BottomTaskbar", "Custom bottom tab bar"],
        ["Card", "Card container cơ bản"],
        ["CustomButton", "Button: primary/secondary/outline + sm/md/lg"],
        ["CustomInput", "Input field với label + icon"],
        ["LoadingSpinner", "Loading indicator"],
        ["PriceTag", "Hiển thị giá gốc (gạch) + giá ưu đãi"],
      ]),

      pageBreak(),

      // ── 6. DATA LAYER ──
      h1("6. DATA LAYER — SERVICES & HOOKS"),

      h2("6.1 Service Files"),
      body("Mỗi domain có 2 file: *.api.ts (gọi API thực) + *.mock.ts (trả mock data)"),
      makeTable(["Service", "API File", "Mock File", "Chức năng"], [
        ["Auth", "auth.api.ts", "auth.mock.ts", "Đăng nhập, đăng ký, OTP, đăng xuất"],
        ["Brand", "brand.api.ts", "brand.mock.ts", "Thương hiệu + stores"],
        ["Customer", "customer.api.ts", "customer.mock.ts", "Profile customer"],
        ["Location", "location.api.ts", "location.mock.ts", "Tìm kiếm địa điểm"],
        ["Merchant", "merchant.api.ts", "merchant.mock.ts", "Merchants + bags"],
        ["Notification", "notification.api.ts", "notification.mock.ts", "Thông báo"],
        ["Order", "order.api.ts", "order.mock.ts", "Đơn hàng"],
        ["Voucher", "voucher.api.ts", "voucher.mock.ts", "Mã giảm giá"],
      ]),

      h2("6.2 Custom Hooks"),
      makeTable(["Hook", "Service", "Screens sử dụng"], [
        ["useAuth()", "AuthContext", "Cart, Orders, Profile"],
        ["useCustomer()", "customerService", "Profile"],
        ["useMerchants()", "merchantService", "Home, Search"],
        ["useMerchantDetail(id)", "merchantService", "Merchant Detail"],
        ["useBagDetail(id)", "merchantService", "Bag Detail"],
        ["useBrandDetail(id)", "brandService", "Brand Detail"],
        ["useAllBags()", "merchantService", "All Bags"],
        ["useCart()", "local state", "Cart, Bag Detail"],
        ["useOrders()", "orderService", "Orders Tab"],
        ["useOrderDetail(id)", "orderService", "Order Detail"],
        ["useNotifications()", "notificationService", "Notifications"],
        ["useVouchers()", "voucherService", "Checkout"],
        ["useLocations(q)", "locationService", "Home, Select Location"],
      ]),

      pageBreak(),

      // ── 7. BẢNG TỔNG HỢP API ──
      h1("7. BẢNG TỔNG HỢP API CẦN TÁCH"),

      h2("7.1 Ưu tiên CAO — Core Business Flow (19 endpoints)"),
      makeTable(["#", "Endpoint", "Method", "Mô tả"], [
        ["1", "/api/auth/login", "POST", "Đăng nhập (phone + OTP)"],
        ["2", "/api/auth/register", "POST", "Đăng ký"],
        ["3", "/api/auth/send-otp", "POST", "Gửi OTP"],
        ["4", "/api/auth/google", "POST", "Đăng nhập Google"],
        ["5", "/api/auth/logout", "POST", "Đăng xuất"],
        ["6", "/api/merchants", "GET", "Danh sách cửa hàng"],
        ["7", "/api/merchants/:id", "GET", "Chi tiết cửa hàng"],
        ["8", "/api/merchants/:id/bags", "GET", "Túi của cửa hàng"],
        ["9", "/api/bags", "GET", "Tất cả túi (search, filter)"],
        ["10", "/api/bags/:id", "GET", "Chi tiết túi"],
        ["11", "/api/cart", "GET", "Giỏ hàng hiện tại"],
        ["12", "/api/cart/add", "POST", "Thêm vào giỏ"],
        ["13", "/api/cart/update", "PATCH", "Cập nhật số lượng"],
        ["14", "/api/cart/remove", "DELETE", "Xóa item"],
        ["15", "/api/orders", "POST", "Tạo đơn hàng mới"],
        ["16", "/api/orders", "GET", "Danh sách đơn hàng"],
        ["17", "/api/orders/:id", "GET", "Chi tiết đơn hàng"],
        ["18", "/api/payment/:orderId/qr", "GET", "Lấy QR thanh toán"],
        ["19", "/api/payment/:orderId/confirm", "POST", "Xác nhận thanh toán"],
      ]),

      h2("7.2 Ưu tiên TRUNG BÌNH (11 endpoints)"),
      makeTable(["#", "Endpoint", "Method", "Mô tả"], [
        ["20", "/api/brands", "GET", "Danh sách thương hiệu"],
        ["21", "/api/brands/:id", "GET", "Chi tiết thương hiệu"],
        ["22", "/api/brands/:id/stores", "GET", "Stores thuộc brand"],
        ["23", "/api/vouchers", "GET", "Voucher khả dụng"],
        ["24", "/api/vouchers/validate", "POST", "Kiểm tra voucher"],
        ["25", "/api/notifications", "GET", "Danh sách thông báo"],
        ["26", "/api/notifications/:id/read", "PATCH", "Đánh dấu đã đọc"],
        ["27", "/api/customer/profile", "GET", "Thông tin customer"],
        ["28", "/api/customer/profile", "PUT", "Cập nhật profile"],
        ["29", "/api/orders/:id/review", "POST", "Gửi đánh giá"],
        ["30", "/api/orders/:id/report", "POST", "Báo cáo sự cố"],
      ]),

      h2("7.3 Ưu tiên THẤP — Enhancement (9 endpoints)"),
      makeTable(["#", "Endpoint", "Method", "Mô tả"], [
        ["31", "/api/banners", "GET", "Banner quảng cáo"],
        ["32", "/api/categories", "GET", "Danh mục thực phẩm"],
        ["33", "/api/bags/:id/reviews", "GET", "Đánh giá túi"],
        ["34", "/api/locations/search", "GET", "Tìm kiếm địa điểm"],
        ["35", "/api/locations/geocode", "GET", "Reverse geocode"],
        ["36", "/api/merchants/:id/pickup-slots", "GET", "Khung giờ lấy hàng"],
        ["37", "/api/payment/bank-info", "GET", "Thông tin ngân hàng"],
        ["38", "/api/upload/avatar", "POST", "Upload ảnh đại diện"],
        ["39", "/api/upload/issue-images", "POST", "Upload ảnh báo cáo"],
      ]),

      h2("7.4 Dữ liệu hiện đang HARDCODE trong UI"),
      makeTable(["File", "Dữ liệu", "Đề xuất"], [
        ["(tabs)/index.tsx", "BRAND_LOGOS[] — 8 URL logo", "GET /api/brands"],
        ["(tabs)/index.tsx", "BANNERS[] — 3 banner quảng cáo", "GET /api/banners"],
        ["(tabs)/index.tsx", "CATEGORIES[] — 6 danh mục", "Static hoặc API"],
        ["checkout.tsx", "checkoutItems — sản phẩm checkout", "PHẢI lấy từ Cart API"],
        ["checkout.tsx", "PAYMENT_METHODS — 2 phương thức", "GET /api/payment-methods"],
        ["checkout.tsx", "Time picker — 3 khung giờ", "GET /api/merchants/:id/pickup-slots"],
        ["payment.tsx", "QR code URL + Bank info", "Generate từ server"],
        ["order/success.tsx", "Toàn bộ thông tin đơn", "Response từ POST /api/orders"],
        ["bag/[id].tsx", "Review mẫu hardcode", "GET /api/bags/:id/reviews"],
      ]),

      pageBreak(),

      // ── 8. TYPE DEFINITIONS ──
      h1("8. PHỤ LỤC — TYPE DEFINITIONS"),

      h2("8.1 Core Types"),
      codeBlock("type UserRole = 'customer' | 'merchant' | 'admin'"),
      codeBlock("type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup'"),
      codeBlock("  | 'picked_up' | 'completed' | 'cancelled' | 'refund_requested' | 'refunded'"),
      codeBlock("type FoodCategory = 'all' | 'vegetarian' | 'meat' | 'bakery'"),
      codeBlock("  | 'seafood' | 'raw_food' | 'beverage' | 'other'"),
      codeBlock("type PaymentMethod = 'zalopay' | 'momo' | 'banking' | 'cash'"),
      codeBlock("type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'"),

      h2("8.2 Data Models"),
      makeTable(["Interface", "Fields chính"], [
        ["User", "id, name, email?, phone, avatar?, role, createdAt"],
        ["Brand", "id, name, logo, banner?, description, rating, totalStores, categories[]"],
        ["Merchant", "id, brandId?, name, description, phone, address, location, logo?, banner?, rating, totalRatings, distance?, status, isOpen"],
        ["SurpriseBag", "id, merchantId, merchantName, name, description, originalPrice, discountPrice, category, imageUrl?, quantity, maxQuantity, pickupStart, pickupEnd, isAvailable, expiresAt"],
        ["CartItem", "bag: SurpriseBag, quantity, merchantId"],
        ["Order", "id, customerId, merchantId, merchant, items[], totalOriginalPrice, totalDiscountPrice, voucherCode?, discountAmount, finalAmount, status, paymentMethod, paymentStatus, qrCode, pickupTime"],
        ["OrderItem", "bagId, bagName, imageUrl?, quantity, unitPrice, totalPrice"],
        ["Voucher", "id, code, description, discountType, discountValue, minOrderValue, maxDiscount?, quantity, usedCount, startDate, endDate, isActive"],
        ["Review", "id, orderId, customerId, customerName, customerAvatar?, merchantId, rating (1-5), comment"],
        ["Issue", "id, orderId, reporterId, title, description, images?, status, resolution?"],
        ["NotifItem", "id, icon, title, body, time, read, route?"],
        ["LocationSuggestion", "id, name, address, distance?, coords: {top, left}"],
      ]),

      emptyLine(),
      emptyLine(),
      new Paragraph({
        children: [new TextRun({
          text: "— HẾT TÀI LIỆU —",
          bold: true, size: 24, color: COLORS.primary, font: "Calibri"
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      }),
      emptyLine(),
      body("Ghi chú: Tất cả dữ liệu đang sử dụng mock data (EXPO_PUBLIC_USE_MOCK=true)."),
      body("Khi tích hợp API backend thực, cần đặt EXPO_PUBLIC_USE_MOCK=false và implement đầy đủ các file *.api.ts."),
    ],

}],
});

// ── Export ──
const outputPath = "D:\\PROJECTS Go Saving Food\\Web-App\\App\\GSF_App_UI_Flow_Documentation.docx";
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outputPath, buffer);
console.log(`✅ DOCX created: ${outputPath}`);
console.log(`   Size: ${(buffer.length / 1024).toFixed(1)} KB`);
