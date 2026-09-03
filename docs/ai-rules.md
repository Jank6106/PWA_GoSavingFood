# GoSavingFood — AI & Engineering Rules

> Vị trí: `docs/ai-rules.md`.
> Áp dụng cho: Mọi AI Agent (Gemini, Claude, Copilot...) và lập trình viên tham gia phát triển dự án.
> Mục tiêu: Đảm bảo tính nhất quán kiến trúc, đồng bộ thiết kế trực quan, hạn chế tối đa rủi ro hồi quy (regression) và giữ code gọn gàng, có thể kiểm thử.

Tài liệu này là quy chuẩn thực thi bắt buộc, được xây dựng dựa trên [Architecture](file:///docs/architecture.md) và [Visual Style Design System](file:///docs/design-system.md). Bất kỳ đoạn mã nào vi phạm các nguyên tắc dưới đây đều bị coi là không đạt chuẩn.

---

## 1. Nguyên tắc cốt lõi (Core Tenets)

1. **Tuân thủ ranh giới Monorepo**:
   - 3 ứng dụng độc lập: `apps/web` (Next.js landing page), `apps/customer` (React + Vite PWA), `apps/merchant` (React + Vite PWA).
   - Tuyệt đối không import mã nguồn xuyên ứng dụng bằng đường dẫn tương đối (`../../customer` hay `../../merchant`).
   - Mọi chia sẻ code giữa các app phải thông qua `packages/` (ví dụ: `@gosavingfood/ui`, `@gosavingfood/types`, `@gosavingfood/api`).

2. **Chỉ tạo khi thực sự cần (No Premature Abstraction)**:
   - Không tự ý tạo sẵn các lớp abstraction trống, microfrontends, repository patterns giả lập, hay hàng loạt thư mục không có code hoạt động.
   - Thư mục chỉ được tạo khi có code cần đặt vào.

3. **Một đường dẫn API duy nhất cho cả Mock và Production**:
   - Hook và Component không bao giờ chứa logic phân nhánh kiểu `if (isMock)`.
   - Trong quá trình phát triển, sử dụng **MSW (Mock Service Worker)** chặn ở tầng HTTP network.
   - Không bao giờ import dữ liệu giả lập (mock fixtures) trực tiếp vào UI Component hoặc Page.

4. **Kiểm soát ranh giới dữ liệu (Strict Data Boundaries)**:
   - Quy trình chuyển đổi dữ liệu bắt buộc:
     $$\text{DTO (Network JSON)} \longrightarrow \text{Schema Validation (Zod)} \longrightarrow \text{Mapper} \longrightarrow \text{Domain Model} \longrightarrow \text{TanStack Query Hook} \longrightarrow \text{UI}$$
   - Không xử lý tên trường backend (như `product_name`, `is_active_flag`) trực tiếp trong thẻ JSX của UI. Dùng domain model chuẩn hóa (`name`, `isActive`).

5. **TypeScript nghiêm ngặt (Strict Typing)**:
   - Bật `strict` mode. Tuyệt đối không dùng `any` để lách TypeScript. Dữ liệu ngoài vào phải là `unknown` trước khi parse qua Schema.

---

## 2. Quy tắc Hệ thống Thiết kế (Design System & Styling Rules)

1. **Triết lý thẩm mỹ**:
   - Phong cách chủ đạo: **Natural green, modern, minimal, and friendly** (lấy cảm hứng từ Too Good To Go và Yindii).
   - Nền sáng (`#F7F9F6`), nội dung hiển thị trên thẻ card trắng (`#FFFFFF`), khoảng trắng thoáng đãng, thân thiện.
   - Màu xanh lá (`#166B4A`) là **điểm nhấn (accent)**, tuyệt đối không dùng làm màu nền cho toàn bộ giao diện màn hình.

2. **Các điều CẤM TUYỆT ĐỐI (Strictly Prohibited)**:
   - ❌ **CẤM** phong cách Neon, Cyberpunk, Glassmorphism quá đà.
   - ❌ **CẤM** dark background làm giao diện mặc định (trừ khi có tính năng dark mode người dùng chủ động chọn).
   - ❌ **CẤM** gradient sặc sỡ, bóng đổ nặng nề (heavy shadows) gây nặng nề thị giác.
   - ❌ **CẤM** cỡ chữ quá nhỏ (<12px) hoặc độ tương phản kém.

3. **Màu sắc chuẩn (Design Tokens)**:
   - `Primary`: `#166B4A` | `Primary Hover`: `#11543A`
   - `Soft Green (Background nút phụ / chip được chọn)`: `#E8F4EC`
   - `Page Background`: `#F7F9F6` | `Card Background`: `#FFFFFF`
   - `Primary Text`: `#172B22` | `Secondary Text`: `#5D6B63`
   - `Subtle Border`: `#DDE5DE` | `Input Border`: `#7C8B81`
   - `Offer Accent (Thẻ giảm giá / cứu trợ thực phẩm)`: `#F4C95D` (Text: `#493600`)
   - `Success / Warning / Error`: `#166B4A` / `#8A4B08` / `#B42318`

4. **Typography & Spacing**:
   - Font mặc định: **Inter** (hỗ trợ tiếng Việt đầy đủ), fallback `system-ui, sans-serif`.
   - Spacing chuẩn: `4, 8, 12, 16, 24, 32, 48px`. Khoảng đệm Card chuẩn: `16px`. Khoảng cách giữa các nhóm section: `24px`.
   - Bo góc (Corner Radius):
     - Button, Input: `12px`
     - Card: `16px`
     - Dialog, Bottom Sheet: `24px`
     - Chip, Tag, Avatar: bo tròn hoàn toàn (`full rounded / 9999px`)
   - Shadow chuẩn: `0 2px 12px rgb(23 43 34 / 6%)`.

5. **Icon chuẩn**:
   - Sử dụng thư viện **Lucide Icons** với `strokeWidth = 2`. Kích thước hiển thị: `20px - 24px`.
   - Mọi vùng chạm tương tác trên thiết bị cảm ứng (touch target) phải đạt kích thước tối thiểu **$44 \times 44\text{px}$**.

---

## 3. Quy chuẩn xây dựng Component

1. **Phân cấp vị trí đặt Component**:
   - **`packages/ui`**: Component nền tảng tái sử dụng xuyên suốt toàn bộ dự án (`Button`, `Input`, `Badge`, `Chip`, `Card`, `Dialog`, `Skeleton`, `EmptyState`, `ErrorState`).
   - **`apps/<app>/src/shared/components/`**: Component dùng chung cho nhiều feature trong cùng một app PWA (ví dụ: `AppHeader`, `BottomNav`).
   - **`apps/<app>/src/features/<feature>/components/`**: Component mang tính chất nghiệp vụ đặc thù của riêng feature đó (ví dụ: `ProductCard`, `OrderSummaryCard`).

2. **Quy tắc thiết kế Component**:
   - Component trình bày (Presentational) chỉ nhận dữ liệu qua `props` và phát sự kiện qua `callbacks`.
   - Không gắn chặt router navigation vào component nền tảng của `packages/ui`. Hãy nhận `onClick` hoặc truyền component bọc qua props.
   - Các Input form phải có cỡ chữ tối thiểu `16px` trên mobile để ngăn Safari/iOS tự động zoom in giao diện khi focus.
   - Nút bấm chính (Button) phải có chiều cao tối thiểu `48px` để thao tác bấm bằng ngón tay trên điện thoại thuận tiện.

3. **Bắt buộc hỗ trợ 4 trạng thái giao diện**:
   Mỗi màn hình danh sách hoặc dữ liệu nghiệp vụ phải xử lý đầy đủ:
   1. **Loading State**: Sử dụng `Skeleton` đúng cấu trúc màn hình (tránh màn hình trắng hoặc chỉ 1 spinner quay đơn điệu giữa trang).
   2. **Empty State**: Sử dụng `EmptyState` với thông điệp tích cực, thân thiện và nút hành động gợi ý tiếp theo.
   3. **Error State**: Sử dụng `ErrorState` có thông điệp dễ hiểu kèm nút "Thử lại" (Retry).
   4. **Success State**: Giao diện hiển thị trơn tru, hỗ trợ chuyển cảnh mượt mà ($150 - 200\text{ms}$).

---

## 4. Quản lý State và Luồng dữ liệu

1. **Phân chia state**:
   - **Server State**: Bắt buộc quản lý qua **TanStack Query**. Không sao chép dữ liệu từ server vào global store (như Redux/Zustand).
   - **UI State cục bộ**: Sử dụng `useState` hoặc `useReducer` bên trong Component/Page.
   - **URL State**: Các tham số lọc, tìm kiếm, số trang phân trang phải lưu trên Search Params (`useSearchParams`).
   - **Global Client State**: Chỉ dùng khi cần chia sẻ dữ liệu xuyên màn hình mà không thuộc server (như giỏ hàng nháp, cấu hình offline).

2. **Query Keys & Cache Invalidation**:
   - Khai báo Query Key dạng mảng cấu trúc phân tầng: `['products', 'list', { category, page }]`.
   - Sau khi Mutation thành công (ví dụ đặt hàng, cập nhật giỏ hàng), bắt buộc invalidate các Query Key liên quan để đảm bảo dữ liệu mới nhất.

3. **Bảo mật & Session**:
   - Không lưu Token hoặc thông tin nhạy cảm vào `localStorage` nếu chưa có thiết kế an toàn. Ưu tiên cookie `HttpOnly`.
   - Không đưa credential vào URL query string khi chuyển đổi giữa landing page và PWA.

---

## 5. Quy tắc cho AI Agent khi sinh mã nguồn

Khi AI nhận lệnh tạo mã (Generate Code), phải tự kiểm tra các tiêu chí sau trước khi hoàn thành:
1. Đã import đúng token và component từ `@gosavingfood/ui` chưa?
2. Có vi phạm màu neon, dark background hay glassmorphism không?
3. Các component có TypeScript types đầy đủ, không `any` không?
4. Đã có xử lý fallback khi dữ liệu rỗng hoặc tải chậm chưa?
5. Các file đặt đúng cấu trúc thư mục quy định tại [architecture.md](file:///docs/architecture.md) chưa?
