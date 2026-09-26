# Mer_UI_Flow — GoSavingFood Merchant App

> **Mục đích**: File tham chiếu để AI đọc và xây dựng lại code đảm bảo đúng **design**, **luồng sử dụng**, và **tách biệt dữ liệu với UI**.

---

## 1. Tổng quan dự án

## Dựa vào techstack hiện tại

## 2. Kiến trúc 4 tầng — Tách biệt Data và UI

```
LAYER 1: TYPES (src/types/)
  Định nghĩa shape dữ liệu — không chứa logic

LAYER 2: SERVICES (src/services/)
  Giao tiếp API / Mock — trả về dữ liệu typed
  Không biết gì về React, state, hay UI

LAYER 3: HOOKS (src/hooks/)
  Quản lý state, gọi service, lọc/tính toán dữ liệu
  Expose state + handlers cho UI — không render gì

LAYER 4: UI (src/pages/ + src/components/)
  Nhận state + handlers từ hooks — chỉ render + style
  Không gọi service trực tiếp, không chứa logic nghiệp vụ
```

### 2.1 Quy tắc bất di bất dịch

| #   | Quy tắc                                            | Ví dụ                                                           |
| --- | -------------------------------------------------- | --------------------------------------------------------------- |
| 1   | **Component UI KHÔNG BAO GIỜ import từ services/** | BagCard.tsx chỉ nhận props, không gọi fetchBagItems()           |
| 2   | **Hook là cầu nối duy nhất giữa service và UI**    | useBags() gọi bag.service.ts, trả state cho BagManagementScreen |
| 3   | **Service KHÔNG biết về React**                    | Không useState, không useEffect trong service                   |
| 4   | **Types dùng chung cho mọi tầng**                  | BagItem dùng ở mock, service, hook, và component                |
| 5   | **Pages (screens) chỉ compose components + hooks** | Không viết inline business logic trong screen                   |
| 6   | **Mocks tách riêng file, service import mock**     | Service dùng INITIAL_BAGS_MOCK từ mocks/                        |

### 2.2 Luồng dữ liệu minh họa (Bag Management)

```
User nhấn "Tạo túi hàng"
    |
    v
BagManagementScreen.tsx  <-- gọi addBag(input) từ useBags hook
    |
    v
useBags.ts hook          <-- gọi createBagItem(storeId, input) từ service
    |                      <-- cập nhật state bags, hiện toast
    v
bag.service.ts           <-- thêm vào inMemoryBags[], đồng bộ inventory
    |                      <-- gọi syncBagToInventoryShelf()
    v
inventory.service.ts     <-- cập nhật inventoryStore[], notify listeners
    |
    v
useInventory.ts hook     <-- nhận event từ subscribeInventory()
    |                      <-- tự động loadData() lại
    v
InventoryManagementScreen.tsx  <-- re-render với data mới
```

---

## 3. Design System

### 3.1 Bảng màu (Color Palette)

| Token                | Hex                    | Vai trò                                       |
| -------------------- | ---------------------- | --------------------------------------------- |
| **Primary**          | #005639                | Màu chủ đạo — text, button, header bg, brand  |
| **Primary Dark**     | #003D27                | AppHeader bg, toast bar analytics/settings    |
| **Surface**          | #FFFFFF                | Nền chính mọi screen                          |
| **Surface Tinted**   | #F0FDF4                | Nền nhẹ xanh lá — input bg, card bg, badge bg |
| **Surface Selected** | #DCFCE7                | Border nhẹ, selected state, chip bg           |
| **Page Background**  | #F8FAFC                | Nền trang login/setup (ngoài card)            |
| **Error**            | #DC2626                | Text lỗi, icon lỗi                            |
| **Error Background** | #FEF2F2                | Nền container lỗi                             |
| **Error Border**     | #FCA5A5                | Viền container lỗi                            |
| **Warning (Open)**   | #16A34A / #4ADE80      | Status "Đang mở cửa"                          |
| **Warning (Closed)** | #D97706 / #F59E0B      | Status "Tạm đóng"                             |
| **Badge Red**        | #EF4444                | Notification badge dot                        |
| **Text Secondary**   | #475569                | Subtitle, mô tả phụ                           |
| **Text Muted**       | #64748B                | Placeholder icon                              |
| **Text Placeholder** | #94A3B8                | Input placeholder                             |
| **Overlay**          | rgba(255,255,255,0.18) | Header icon button bg                         |

> **QUAN TRỌNG**: App KHÔNG sử dụng màu đen (#000000) cho text. Mọi text đều dùng #005639 (primary) hoặc biến thể xanh.

### 3.2 Typography

| Element              | fontSize | fontWeight                    | letterSpacing |
| -------------------- | -------- | ----------------------------- | ------------- |
| Screen Title (Login) | 26       | 800                           | -0.5          |
| Section Title        | 22       | 800                           | -0.4 / -0.3   |
| Header Title         | 16       | 800                           | -0.3          |
| Header Subtitle      | 12       | 600                           | —             |
| Body / Card Title    | 15-16    | 600-700                       | —             |
| Label                | 13       | 700                           | —             |
| Caption / Tag        | 11-13    | 500-700                       | -0.1          |
| Tab Label            | 11       | 500 (inactive) / 800 (active) | -0.1          |
| Button Text          | 14-17    | 700                           | -0.2          |
| Error Text           | 13       | 600                           | —             |
| Toast Text           | 13       | 700                           | —             |

> Font mặc định: system font (platform native). Web sử dụng CSS variables --font-display, --font-serif, etc.

### 3.3 Spacing Scale

```
half: 2px   |  one: 4px   |  two: 8px
three: 16px |  four: 24px |  five: 32px  |  six: 64px
```

### 3.4 Radius and Shadow

| Element            | borderRadius             | Shadow                                         |
| ------------------ | ------------------------ | ---------------------------------------------- |
| Card (Login/Setup) | 24                       | #005639, offset(0,12), opacity 0.08, radius 24 |
| Input Container    | 12                       | —                                              |
| Button             | 12 (normal) / 999 (pill) | #005639, offset(0,4), opacity 0.15, radius 8   |
| Brand Icon Badge   | 20                       | #005639, offset(0,6), opacity 0.25, radius 10  |
| Status Pill        | 999                      | #000, offset(0,2), opacity 0.1, radius 4       |
| Header Container   | —                        | #000, offset(0,4), opacity 0.16, radius 12     |
| Tab Bar            | —                        | #000, offset(0,-4), opacity 0.12, radius 10    |
| Profile Button     | 19 (circle)              | —                                              |

### 3.5 Max Content Width

```
maxWidth: 1200px  (content containers trong mọi screen)
maxWidth: 800px   (tab bar inner, confirm button)
maxWidth: 440px   (login card)
maxWidth: 460px   (setup card)
```

---

## 4. Navigation and Routing

### 4.1 Route Map

```
src/app/
  _layout.tsx              -> RootLayout (Stack, ThemeProvider)
  index.tsx                -> Redirect -> /login
  login.tsx                -> LoginScreen
  first-time-setup.tsx     -> FirstTimeSetupScreen
  (tabs)/
    _layout.tsx            -> AppTabs (custom tab bar)
    index.tsx              -> BagManagementScreen    (Tab: "Túi hàng")
    explore.tsx            -> OrderManagementScreen   (Tab: "Đơn hàng")
    inventory.tsx          -> InventoryManagementScreen (Tab: "Kệ hàng")
    analytics.tsx          -> AnalyticsScreen         (Tab: "Thống kê")
    settings.tsx           -> SettingsScreen           (Tab: "Cài đặt")
```

### 4.2 Luồng Navigation

```
  /login  ---Login OK (isFirstLogin)--->  /first-time-setup  ---Complete--->  /(tabs)
     |                                                                          |
     |-----Login OK (!isFirstLogin)------------------------------------------>  |
     |                                                                          |
     |<----------------------------Logout---------------------------------------|
```

### 4.3 Tab Navigation (Bottom Tab Bar)

| Tab Index | Key       | Label    | Icon (Feather) | Route             | Screen                    |
| --------- | --------- | -------- | -------------- | ----------------- | ------------------------- |
| 0         | index     | Túi hàng | shopping-bag   | /(tabs)           | BagManagementScreen       |
| 1         | explore   | Đơn hàng | file-text      | /(tabs)/explore   | OrderManagementScreen     |
| 2         | inventory | Kệ hàng  | box            | /(tabs)/inventory | InventoryManagementScreen |
| 3         | analytics | Thống kê | bar-chart-2    | /(tabs)/analytics | AnalyticsScreen           |
| 4         | settings  | Cài đặt  | settings       | /(tabs)/settings  | SettingsScreen            |

**Tab Bar Design:**

- Background: #005639
- Border top: 1px #00422B
- Active icon: #FFFFFF với bg rgba(255,255,255,0.22) (pill shape 44x28, radius 14)
- Inactive icon: #DCFCE7, opacity 0.75
- Active label: #FFFFFF, fontWeight 800
- Inactive label: #DCFCE7, fontWeight 500
- Web: position sticky, bottom 0
- Badge: #EF4444 circle, min-width 16, height 16

---

## 5. Shared Layout Components

### 5.1 AppHeader (Sticky Top Bar)

**Xuất hiện ở**: Mọi tab screen (Bags, Orders, Inventory, Analytics, Settings)

```
[Store Icon] Store Name                [Status Pill] [Bell] [Profile]
             Subtitle text
```

| Zone      | Nội dung                                                                   |
| --------- | -------------------------------------------------------------------------- |
| **Left**  | Brand icon (storefront, 38x38, radius 12, rgba bg) + Title + Subtitle      |
| **Right** | Status Pill toggle (Đang mở/Tạm đóng) + Bell notification + Profile circle |

- **Background**: #003D27
- **Web**: position sticky, top 0
- **SafeArea**: paddingTop = max(insets.top, 12)
- **Notification bell**: Có red badge dot (6x6)
- **Profile circle**: #FFFFFF bg, text "GS" (#003D27, fontWeight 800)

**Props interface:**

```typescript
interface AppHeaderProps {
  title?: string; // Override store name
  subtitle?: string; // Mô tả ngắn cho mỗi screen
  showStatusToggle?: boolean; // default true
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  rightAction?: React.ReactNode; // Custom right slot
}
```

### 5.2 Toast Notification Bar

**Pattern chung** xuất hiện ở mọi screen có mutation:

- Background: #005639 (Bags, Orders, Inventory) hoặc #003D27 (Analytics, Settings)
- Text: #FFFFFF, fontSize 13, fontWeight 700
- Icon: Feather check-circle, size 16, #FFFFFF
- Auto-dismiss sau **3 giây**
- Hiển thị dưới AppHeader, trên content

### 5.3 Notification Modal (Popup)

- Trigger từ bell icon trên AppHeader
- Sử dụng useNotifications() hook
- Hiển thị danh sách notification cards
- Filter: "Tất cả" / "Chưa đọc"
- Actions: markAsRead, markAllAsRead

---

## 6. Screen Specifications

---

### 6.1 LoginScreen (/login)

**Layout**: Centered card trên nền #F8FAFC

```
          [Storefront Icon]
           GoSavingFood
         [Kênh Cửa Hàng]

  Email / Phone input
  Password input
  [Error message]
  [Đăng nhập button]
```

**Data hook**: useAuth() — provides login(), loading, error, clearError
**Local state**: username, password, localError (validation trước khi gọi hook)
**Card style**: maxWidth 440, borderRadius 24, border #DCFCE7, shadow green

**Brand header elements:**

- Logo badge: 64x64, radius 20, bg #005639, icon storefront-outline 32px white
- Title: "GoSavingFood", fontSize 26, fontWeight 800, color #005639
- Role tag: pill bg #F0FDF4, border #DCFCE7, icon shield-checkmark-outline 14px, text "Kênh Cửa Hàng"

**Validation flow:**

1. Check username không rỗng -> "Vui lòng nhập số điện thoại hoặc email"
2. Check password không rỗng -> "Vui lòng nhập mật khẩu"
3. Gọi login() -> nếu thành công, hook tự navigate

---

### 6.2 FirstTimeSetupScreen (/first-time-setup)

**Layout**: Centered card, 3-step wizard

**Step Indicator**: 3 dots + 2 lines

- Dot: 32x32, radius 16
- Inactive: bg #F1F5F9, border #CBD5E1
- Active/Done: bg #005639, border #005639, icon white
- Line: 48x2, inactive #E2E8F0, active #005639

**Step 1: "Đổi mật khẩu ban đầu"**

- Header icon: key-outline trong badge (56x56, radius 18, bg #F0FDF4, border #DCFCE7)
- Fields: Mật khẩu cũ, Mật khẩu mới (>=6 ký tự), Xác nhận mật khẩu
- Button: "Tiếp tục"
- Validation: empty check, min length 6, confirm match

**Step 2: "Thông tin cửa hàng"**

- Header icon: storefront-outline
- Fields: Tên cửa hàng, Địa chỉ (multiline), Số điện thoại
- GPS location card: #F0FDF4 bg, icon navigate-outline
- Button: "Hoàn tất thiết lập"

**Step 3: "Thiết lập hoàn tất!"**

- Success badge: 88x88 circle, bg #F0FDF4, border 2px #DCFCE7, icon checkmark-circle-outline 56px
- Button: "Bắt đầu quản lý ngay" -> gọi completeSetup() -> navigate /(tabs)

**Data hook**: useAuth() — provides changePassword(), completeSetup(), loading, error

---

### 6.3 BagManagementScreen (/(tabs) — Tab "Túi hàng")

**Layout**: AppHeader -> Toast -> FlatList (FilterBar header + BagCards) + 2 Modals

```
AppHeader: "Quản lý túi hàng cứu thực phẩm"
[Toast bar nếu có]
BagFilterBar: Search + [+ Tạo túi mới]
BagCard 1
BagCard 2
BagCard 3
... (FlatList, pull-to-refresh)
[EmptyState nếu không có]

Modals: CreateBagModal, BagDetailsModal
```

**Data hook**: useBags(storeId)

**Hook API trả về:**

```typescript
{
  bags: BagItem[];            // Đã filter
  loading, error, saving: boolean;
  searchQuery: string;
  selectedBag: BagItem | null;
  isCreateModalOpen, isDetailModalOpen: boolean;
  toastMessage: string | null;
  // Setters
  setSearchQuery, setSelectedBag, setIsCreateModalOpen, setIsDetailModalOpen;
  // Actions
  toggleStatus(bagId): void;      // active <-> hidden
  changeQuantity(bagId, delta): void;  // +1/-1, optimistic update
  addBag(input): void;            // Tạo mới + sync inventory
  removeBag(bagId): void;         // Xóa + sync inventory
  loadBags(): void;               // Refresh
}
```

**BagCard component** — Props:

```typescript
{
  bag: BagItem;
  onToggleStatus(id: string): void;
  onIncreaseQuantity(id: string): void;
  onDecreaseQuantity(id: string): void;
  onOpenDetails(bag: BagItem): void;
}
```

- Hiển thị: image, name, category, giá gốc/giá sale, quantity controls (+/-), status badge, pickup time
- Action buttons: Toggle on/off shelf, View details

**BagFilterBar** — Props: searchQuery, onSearchQueryChange, onOpenCreateModal

**CreateBagModal** — Form tạo túi mới:

- Fields: name, category (preset list), description, originalPrice, salePrice, quantity, pickupTime (preset slots), image (preset images)
- Sử dụng preset data từ mocks/index.ts: PRESET_BAG_CATEGORIES, PRESET_BAG_IMAGES, PRESET_PICKUP_TIME_SLOTS

**BagDetailsModal** — Xem chi tiết + actions:

- Props: bag, visible, saving, onClose, onToggleStatus, onDelete

---

### 6.4 OrderManagementScreen (/(tabs)/explore — Tab "Đơn hàng")

**Layout**: AppHeader -> Toast -> FlatList (FilterBar + OrderCards) + 2 Modals

**Data hook**: useOrders(storeId)

**Hook API trả về:**

```typescript
{
  orders: MerchantOrder[];     // Đã filter
  loading, error, saving: boolean;
  summary: OrderSummaryMetrics;
  statusFilter: OrderStatusFilter;  // default "pending"
  searchQuery: string;
  selectedOrder: MerchantOrder | null;
  isDetailModalOpen: boolean;
  toastMessage: string | null;
  // Setters
  setStatusFilter, setSearchQuery, setSelectedOrder, setIsDetailModalOpen;
  // Actions
  confirmOrder(id): void;              // pending -> processing
  finishPreparationOrder(id): void;    // processing -> confirmed
  cancelOrder(id, reason?): void;      // -> cancelled
  completeOrderWithQR(id, qrCode): Promise<boolean>;  // -> completed
  loadOrders(): void;
}
```

**Order Status Flow (FSM):**

```
pending -> processing -> confirmed -> completed
   |                                    ^
   |          (cancel at any step)      |
   |----------> cancelled              QR scan
```

| Status     | Label tiếng Việt           | Color           |
| ---------- | -------------------------- | --------------- |
| pending    | Chờ xác nhận               | #F59E0B (amber) |
| processing | Đang xử lý                 | #3B82F6 (blue)  |
| confirmed  | Chờ lấy hàng / Sẵn sàng QR | #005639 (green) |
| completed  | Hoàn thành                 | #005639         |
| cancelled  | Đã hủy                     | #EF4444 (red)   |

**OrderCard component** — Props:

```typescript
{
  order: MerchantOrder;
  onConfirm(id): void;
  onFinishPreparation(id): void;
  onCancel(id): void;
  onOpenQR(order): void;
  onOpenDetails(order): void;
}
```

- Hiển thị: orderCode, customerName/Phone, bagName, image, price, quantity, status badge, pickupTime, note
- Actions theo status: Xác nhận (pending), Hoàn tất chuẩn bị (processing), Quét QR (confirmed), Hủy

**OrderFilterBar** — Props: statusFilter, searchQuery, summary, onStatusFilterChange, onSearchQueryChange

- Hiển thị summary metrics (count per status)
- Status filter chips/tabs

**OrderDetailsModal** — Xem chi tiết đơn + actions theo status

**QRScannerModal** — Quét mã QR để hoàn thành đơn:

- Props: order, visible, saving, onClose, onCompleteQR
- Camera scanner + input manual code
- Verify: order.qrCode === scannedCode hoặc scannedCode.includes(order.orderCode)

---

### 6.5 InventoryManagementScreen (/(tabs)/inventory — Tab "Kệ hàng")

**Layout**: AppHeader -> Toast -> FlatList (Search + ScheduleTabs header + InventoryCards) + Sticky bottom button + AddModal

```
AppHeader: "Quản lý kệ hàng & nguyên liệu"
[Toast bar nếu có]
Search: "Tìm kiếm túi hàng, SKU..."
[Hôm nay] [Ngày mai]  (schedule tabs)
InventoryCard 1  (qty +/-)
InventoryCard 2  (qty +/-)
...
[Xác nhận kệ hàng] (sticky bottom button)
```

**Data hook**: useInventory(storeId)

**Hook API trả về:**

```typescript
{
  items: InventoryItem[];      // Đã filter
  loading, error, saving: boolean;
  scheduleTab: "today" | "tomorrow" | "all";
  searchQuery: string;
  hasUnsavedChanges: boolean;
  saveSuccessMessage: string | null;
  // Setters
  setScheduleTab, setSearchQuery;
  // Actions
  changeQuantity(itemId, delta): void;  // Optimistic update
  createItem(input): void;
  confirmWarehouse(): void;  // Lưu/xác nhận kệ hàng
  loadData(): void;
}
```

**Đặc biệt — Real-time sync với Bags:**

- inventory.service.ts có event subscription pattern
- Khi bag được tạo/sửa/xóa ở tab Túi hàng -> inventory tự động cập nhật
- Sử dụng subscribeInventory() listener pattern

**Search Input** (custom, không dùng Input component):

- No border, no background gray, fontSize 16, fontWeight 600
- Icon search #005639, clear button khi có text

**InventoryHeaderStats** — Schedule tab selector: "Hôm nay" / "Ngày mai"

**InventoryCard** — Props: item, onIncrease(id), onDecrease(id)

- Hiển thị: image, name, SKU, category, price, quantity controls, lastUpdated

**Sticky Bottom Bar**:

- position absolute, bottom 0
- Button pill (radius 999): maxWidth 800
- Text dynamic: "Đang lưu..." / "Lưu thay đổi kệ hàng" / "Xác nhận kệ hàng"

**AddInventoryModal** — Form thêm mặt hàng mới

---

### 6.6 AnalyticsScreen (/(tabs)/analytics — Tab "Thống kê")

**Layout**: AppHeader -> Toast -> ScrollView (SubHeader + RevenueOverview + MetricsGrid + Chart + Reviews)

```
AppHeader: "Hiệu suất kinh doanh cửa hàng"
[Toast nếu có]
"Tổng quan kinh doanh"
"Cập nhật kết quả doanh thu & đơn hàng thời gian thực"
RevenueOverviewCard (doanh thu + xuất báo cáo)
AnalyticsMetricsGrid (3 metric cards)
RevenueChartCard (bar chart + tab Tuần/Tháng)
RecentReviewsList (review cards)
```

**Data hook**: useAnalytics(storeId)

**Hook API trả về:**

```typescript
{
  metrics: AnalyticsMetrics | null;
  chartData: RevenueChartPoint[];
  timeframe: "week" | "month";
  reviews: ReviewItem[];
  loading, error: boolean;
  exporting: boolean;
  toastMessage: string | null;
  // Actions
  changeTimeframe(tf): void;
  exportReport(): void;
  loadData(): void;
}
```

**Sub-components:**

- **RevenueOverviewCard**: Hiển thị totalRevenue, monthlyGrowthPercent, nút "Xuất báo cáo"
- **AnalyticsMetricsGrid**: 3 metric cards (totalOrders, bagsOnShelf, averageRating)
- **RevenueChartCard**: Bar chart interactive + tab Tuần/Tháng toggle
- **RecentReviewsList**: Danh sách ReviewCard (avatar, name, rating stars, comment, timeAgo)
- **StatCard**: Reusable single metric display

---

### 6.7 SettingsScreen (/(tabs)/settings — Tab "Cài đặt")

**Layout**: AppHeader -> Toast -> ScrollView (StoreCover + InfoForm + ActionsList) + 2 Modals

```
AppHeader: "Thông tin & Cài đặt cửa hàng"
[Toast nếu có]
StoreCoverHeader (cover image + logo + name + impact stats)
StoreInfoFormCard (editable fields + save)
StoreActionsListCard (change password, support, logout)

Modals: ChangePasswordModal, SupportModal
```

**Data hooks**: useStoreProfile(storeId) + useAuth() (cho logout)

**Hook API (useStoreProfile):**

```typescript
{
  profile: StoreProfile | null;
  loading, error, saving: boolean;
  toastMessage: string | null;
  isPasswordModalOpen, isSupportModalOpen: boolean;
  // Setters
  setIsPasswordModalOpen, setIsSupportModalOpen;
  // Actions
  saveProfile(input: StoreUpdateInput): void;
  toggleStatus(): void;  // Mở/đóng cửa hàng
  loadProfile(): void;
  showToast(msg): void;
}
```

**Sub-components:**

- **StoreCoverHeader**: Cover image + logo + store name + impact stats (totalRescuedBags, totalCo2SavedKg)
- **StoreInfoFormCard**: Editable form card (name, description, phone, address) + Save button
- **StoreActionsListCard**: List of touchable action rows (change password, support, logout)
- **ChangePasswordModal**: Old password + New password + Confirm -> call showToast() on success
- **SupportModal**: Subject + Description fields -> submit support ticket

---

## 7. Shared UI Components

### 7.1 Button (components/ui/Button.tsx)

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "outline";
  disabled?: boolean;
  loading?: boolean;
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
  textStyle?: TextStyle;
}
```

| Variant   | Background  | Text Color | Border        |
| --------- | ----------- | ---------- | ------------- |
| primary   | #005639     | #FFFFFF    | —             |
| secondary | #F0FDF4     | #005639    | 1px #DCFCE7   |
| danger    | #DC2626     | #FFFFFF    | —             |
| outline   | transparent | #005639    | 1.5px #005639 |

### 7.2 Input (components/ui/Input.tsx)

```typescript
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: keyof Ionicons.glyphMap;
}
```

- Container: border 1.5px #DCFCE7, radius 12, bg #F0FDF4
- Focused: border #005639
- Error: border #EF4444, bg #FEF2F2
- Label: fontSize 13, fontWeight 700, color #005639
- Input text: fontSize 15, fontWeight 600, color #005639, minHeight 48
- Password eye toggle: eye-outline / eye-off-outline

### 7.3 EmptyState (components/ui/EmptyState.tsx)

- Centered layout
- Icon trong circle (64x64)
- Title (fontSize 16, fontWeight 700) + Message (fontSize 13)
- Optional action slot

### 7.4 ErrorState (components/ui/ErrorState.tsx)

- Centered layout, warning emoji
- Message + "Thử lại" button (#3c87f7 bg)

### 7.5 LoadingSpinner (components/ui/LoadingSpinner.tsx)

- Centered ActivityIndicator + message text

---

## 8. Data Types Reference

### 8.1 BagItem

```typescript
interface BagItem {
  id: string;
  name: string;
  description: string;
  category: string;
  originalPrice: number;
  salePrice: number;
  quantity: number;
  availableQuantity: number;
  imageUrl: string;
  pickupTimeStart: string; // "18:30"
  pickupTimeEnd: string; // "20:00"
  status: "active" | "sold_out" | "hidden";
  createdAt: string;
}
```

### 8.2 MerchantOrder

```typescript
interface MerchantOrder {
  id: string;
  orderCode: string; // "GSF89231"
  customerName: string;
  customerPhone: string;
  storeName: string;
  bagName: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  status: "pending" | "confirmed" | "processing" | "completed" | "cancelled";
  createdAt: string;
  pickupTime: string;
  qrCode: string; // "GSF-QR-89231"
  note?: string;
  items?: OrderItemDetail[];
}
```

### 8.3 InventoryItem

```typescript
interface InventoryItem {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  minQuantity: number;
  unit: string; // "túi"
  schedule: "today" | "tomorrow";
  lastUpdated: string;
}
```

### 8.4 StoreProfile

```typescript
interface StoreProfile {
  id: string;
  userId: string;
  name: string;
  description: string;
  coverImage: string;
  logoUrl: string;
  avatar: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  category: string;
  openingHours: string;
  closingHours: string;
  pickupHours: string;
  isOpen: boolean;
  rating: number;
  totalRescuedBags: number;
  totalCo2SavedKg: number;
  createdAt: string;
  updatedAt: string;
}
```

### 8.5 AnalyticsMetrics

```typescript
interface AnalyticsMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyGrowthPercent: number;
  previousMonthRevenue: number;
  totalOrders: number;
  bagsOnShelf: number;
  averageRating: number;
  totalReviewsCount: number;
}
```

### 8.6 NotificationItem

```typescript
interface NotificationItem {
  id: string;
  orderId?: string;
  orderCode?: string;
  title: string;
  message: string;
  type:
    | "new_order"
    | "pickup_reminder"
    | "completed_order"
    | "cancelled_order"
    | "review_alert";
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
  avatarUrl?: string;
}
```

---

## 9. Service Layer Contract

Mỗi service file là module thuần — export async functions, import mock data, dùng setTimeout để simulate delay.

| Service File            | Functions                                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth.service.ts         | loginService(credentials), changePasswordService(userId, old, new), logoutService()                                                                                                                                                    |
| bag.service.ts          | fetchBagItems(storeId), updateBagStatus(bagId, status), updateBagQuantity(bagId, qty), createBagItem(storeId, input), deleteBagItem(bagId)                                                                                             |
| order.service.ts        | fetchMerchantOrders(storeId), updateMerchantOrderStatus(orderId, status, note?), verifyOrderQR(orderId, code), addDemoMerchantOrder(storeId)                                                                                           |
| inventory.service.ts    | fetchInventoryItems(storeId), updateStockQuantity(itemId, delta), addInventoryItem(storeId, input), confirmWarehouseInventory(storeId), syncBagToInventoryShelf(bag), removeBagFromInventoryShelf(bagId), subscribeInventory(listener) |
| store.service.ts        | fetchStoreProfile(storeId), updateStoreProfile(storeId, input), toggleStoreOpenStatus(storeId)                                                                                                                                         |
| analytics.service.ts    | fetchAnalyticsMetrics(storeId), fetchRevenueChart(storeId, timeframe), fetchOrderStatusBreakdown(storeId), fetchRecentReviews(storeId), exportAnalyticsReport(storeId)                                                                 |
| notification.service.ts | notificationService.fetchNotifications(), .markAsRead(id), .markAllAsRead()                                                                                                                                                            |

### 9.1 Cross-service sync (Bag to Inventory)

```
bag.service.ts --- import ---> inventory.service.ts

  syncBagToInventoryShelf()    (khi bag active -> thêm vào inventory)
  removeBagFromInventoryShelf()  (khi bag hidden/deleted -> xóa khỏi inventory)

  notifyInventoryListeners()  -> useInventory() auto refresh
```

---

## 10. Patterns and Conventions

### 10.1 Hook Pattern

Mỗi hook trả về object với:

- **State fields**: data array, loading, error, saving, filter states, modal toggles, toast message
- **Setter functions**: cho filters, modal toggles, selected items
- **Action functions**: CRUD operations, gọi service bên trong
- **Computed/Filtered data**: sử dụng useMemo cho filtered lists và summary metrics
- **Auto-load on mount**: useEffect + loadData()
- **Tab focus refresh**: useFocusEffect (Expo Router) để reload khi tab được focus lại
- **Toast auto-dismiss**: showToast(msg) -> setTimeout(() => setToast(null), 3000)

### 10.2 Screen Pattern

```tsx
export function SomeScreen({ storeId }: Props) {
  const { data, loading, error, ...handlers } = useSomeHook(storeId);

  if (loading && !data) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <View style={styles.container}>
      <AppHeader subtitle="..." />
      {toast && <ToastBar />}
      <FlatList or ScrollView>
        <FilterBar />
        <Cards />
        <EmptyState />
      </FlatList or ScrollView>
      <Modals />
    </View>
  );
}
```

### 10.3 Styling Pattern

- Sử dụng StyleSheet.create() — KHÔNG dùng inline styles
- Colors hardcode (không qua theme object) — các hex value cố định
- Container luôn flex: 1, width: "100%", backgroundColor: "#FFFFFF"
- Content list: paddingHorizontal: 16, paddingBottom: 90, maxWidth: 1200, alignSelf: "center"
- Web sticky: Platform.select({ web: { position: "sticky", top/bottom: 0 } })

### 10.4 Optimistic Update Pattern

```
1. Update state ngay lập tức (optimistic)
2. Gọi service trong background
3. Nếu thành công -> update state với server response
4. Nếu thất bại -> reload toàn bộ data (rollback)
```

---

## 11. File Map Summary

```
src/
  app/                          # Expo Router routes (thin wrappers)
    _layout.tsx                 # Stack + ThemeProvider
    index.tsx                   # Redirect -> /login
    login.tsx                   # -> LoginScreen
    first-time-setup.tsx        # -> FirstTimeSetupScreen
    (tabs)/
      _layout.tsx               # -> AppTabs (custom tab bar)
      index.tsx                 # -> BagManagementScreen
      explore.tsx               # -> OrderManagementScreen
      inventory.tsx             # -> InventoryManagementScreen
      analytics.tsx             # -> AnalyticsScreen
      settings.tsx              # -> SettingsScreen

  pages/                        # Screen-level compositions
    LoginScreen.tsx
    FirstTimeSetupScreen.tsx
    BagManagementScreen.tsx
    OrderManagementScreen.tsx
    InventoryManagementScreen.tsx
    AnalyticsScreen.tsx
    SettingsScreen.tsx

  components/
    layout/
      AppHeader.tsx             # Shared sticky header
      AppTabBar.tsx             # Shared bottom tab bar
      MainLayout.tsx            # Optional wrapper (Header+Content+TabBar)
    ui/
      Button.tsx                # 4 variants, 3 sizes
      Input.tsx                 # With left icon, password toggle
      EmptyState.tsx
      ErrorState.tsx
      LoadingSpinner.tsx
      collapsible.tsx
    bags/
      BagCard.tsx
      BagDetailsModal.tsx
      BagFilterBar.tsx
      CreateBagModal.tsx
    orders/
      OrderCard.tsx
      OrderDetailsModal.tsx
      OrderFilterBar.tsx
      QRScannerModal.tsx
      QRScannerSimulator.tsx
    inventory/
      InventoryCard.tsx
      InventoryHeaderStats.tsx
      AddInventoryModal.tsx
    analytics/
      AnalyticsMetricsGrid.tsx
      RevenueOverviewCard.tsx
      RevenueChartCard.tsx
      OrderStatusBreakdownCard.tsx
      RecentReviewsList.tsx
      ReviewCard.tsx
      StatCard.tsx
    store/
      StoreCoverHeader.tsx
      StoreInfoFormCard.tsx
      StoreActionsListCard.tsx
      StoreImpactStats.tsx
      ChangePasswordModal.tsx
      SupportModal.tsx
    notifications/
      NotificationModal.tsx
      NotificationCardItem.tsx
    app-tabs.tsx                # Expo Tabs wrapper
    app-tabs.web.tsx            # Web variant

  hooks/
    useAuth.ts
    useBags.ts
    useOrders.ts
    useInventory.ts
    useAnalytics.ts
    useStoreProfile.ts
    useNotifications.ts
    use-theme.ts
    use-color-scheme.ts / .web.ts

  services/
    auth.service.ts
    bag.service.ts
    order.service.ts
    inventory.service.ts
    store.service.ts
    analytics.service.ts
    notification.service.ts

  types/
    index.ts                    # Shared core types (Auth, Store, legacy)
    bag.ts
    order.ts
    inventory.ts
    analytics.ts
    store.ts
    notification.ts

  mocks/
    index.ts                    # Master unified mock dataset
    auth.mock.ts
    store.mock.ts
    bag.mock.ts                 # Re-exports from index
    order.mock.ts               # Re-exports from index
    inventory.mock.ts           # Re-exports from index
    notification.mock.ts
    analytics.mock.ts
    reviews.mock.ts

  constants/
    theme.ts                    # Colors, Fonts, Spacing, BottomTabInset

  global.css
  declarations.d.ts
```

---

## 12. Checklist khi rebuild

- [ ] Giữ nguyên kiến trúc 4 tầng: Types -> Services -> Hooks -> UI
- [ ] UI components KHÔNG import services trực tiếp
- [ ] Mỗi screen dùng AppHeader + Toast pattern + Loading/Error states
- [ ] Color palette: Primary #005639, Surface #FFFFFF, Tinted #F0FDF4
- [ ] KHÔNG sử dụng black text — chỉ dùng #005639 và variants
- [ ] Tab bar: 5 tabs, bg #005639, sticky bottom
- [ ] Header: bg #003D27, sticky top, status pill toggle
- [ ] Content maxWidth 1200px, centered
- [ ] Toast auto-dismiss 3s
- [ ] Optimistic updates cho quantity changes
- [ ] Bag to Inventory real-time sync via event listeners
- [ ] Order FSM: pending -> processing -> confirmed -> completed (+ cancel)
- [ ] QR verification: match qrCode hoặc orderCode
- [ ] First-time setup: 3-step wizard (password -> info -> complete)
- [ ] Web: sticky header/tabbar, responsive maxWidth
- [ ] useFocusEffect để refresh data khi tab focus
