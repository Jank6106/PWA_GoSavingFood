# E2E_TESTING_PLAN.md — Kế hoạch Triển khai Kiểm thử Tự động E2E Frontend (Playwright) trên 2 Ứng dụng PWA

> **Mục tiêu**: Thiết lập hạ tầng và kịch bản kiểm thử toàn trình End-to-End (E2E) tự động bằng Playwright cho 2 ứng dụng PWA (**Customer PWA** và **Merchant PWA**), tập trung vào các **luồng lõi bất biến** (Xác thực, Phân quyền Route Guard, Vòng đời Đơn hàng & Đối soát QR qua Voucher 0đ). Toàn bộ quá trình chạy cục bộ 100% trên Docker Supabase, an toàn và độc lập tuyệt đối với Cloud Production.
>
> **Đối tượng thực hiện**: Codex / AI Coding Agent hoặc Developer.  
> **Quy chuẩn bắt buộc**: Tuân thủ nghiêm ngặt [`AGENTS.md`](../../AGENTS.md), [`docs/TESTING.md`](../TESTING.md) và các bộ đặc tả [`docs/specs/`](../specs/).

---

## 1. Hiện trạng & Định hướng Kiến trúc

```mermaid
flowchart LR
    subgraph MultiContext["Môi trường E2E (Playwright Test Runner)"]
        CustomerBrowser["Customer PWA (Mobile Viewport)\nhttp://localhost:3000/explore/"]
        MerchantBrowser["Merchant PWA (Tablet Viewport)\nhttp://localhost:3000/merchant/"]
    end

    subgraph Gateway["Dev Server Proxy (Next.js :3000)"]
        NextGateway["Next.js Gateway\n(Proxy & /api/payos/*)"]
    end

    subgraph LocalBackend["Docker Supabase (Local :54321 / :54322)"]
        DockerDB["PostgreSQL 15 (Docker)\n33 Migrations + seed.sql"]
        RealtimeEngine["Supabase Realtime Engine\n(WebSocket Broadcast)"]
    end

    CustomerBrowser <-->|HTTP / WS| NextGateway
    MerchantBrowser <-->|HTTP / WS| NextGateway
    NextGateway <-->|RPC / Queries| DockerDB
    CustomerBrowser <-->|postgres_changes| RealtimeEngine
    MerchantBrowser <-->|postgres_changes| RealtimeEngine
```

### 1.1. Phạm vi triển khai (Scope Boundaries)
* **Bao gồm (In-Scope - Bất biến)**:
  1. `E2E-01` (Auth & Route Guarding): Đăng nhập, lưu session, bảo vệ phân quyền (Khách không được vào màn hình Merchant).
  2. `E2E-03` + `E2E-04A` (Full Order Lifecycle): Khách đặt túi đồ ăn mẫu -> Áp voucher `TMU2026` (0đ, bỏ qua cổng PayOS thật) -> Đơn sang `paid` -> Realtime thông báo sang Quán -> Quán chuyển sang `preparing` -> `ready_for_pickup` -> Khách nhận QR `pickup_token` -> Quán xác thực QR hoàn tất đơn (`completed`).
* **Loại trừ (Out-of-Scope - Tạm hoãn)**:
  * Thanh tìm kiếm tự do (Search UI) trên Customer PWA (sẽ được thay bằng AI Natural Language Search).
  * Form tạo túi đồ ăn thủ công (Merchant Bag Creation Form) (sẽ được thay bằng AI Auto-fill).

### 1.2. Thách thức kỹ thuật & Giải pháp
1. **Google OAuth trên Customer PWA**: Customer UI sử dụng Google OAuth. Trong kiểm thử headless E2E, không chạy popup Google thật để tránh CAPTCHA và bot detection.
   * *Giải pháp*: Xây dựng helper `setupCustomerAuth(context, page)` khởi tạo session hợp lệ từ Docker Supabase (`customer.local@gosavingfood.test`) và nạp trực tiếp vào LocalStorage trước khi điều hướng.
2. **Đồng bộ Realtime 2 Chiều giữa 2 Trình duyệt**:
   * *Giải pháp*: Playwright mở 2 `BrowserContext` riêng biệt (`customerContext` và `merchantContext`), đại diện cho 2 thiết bị vật lý khác nhau cùng kết nối vào cụm Realtime của Docker Supabase.
3. **Thanh toán 0đ không phụ thuộc PayOS**:
   * *Giải pháp*: Tận dụng voucher `TMU2026` (đã seed trong DB). Khi giỏ hàng có tổng tiền bằng `0 đ`, hệ thống chuyển ngay sang `paid` mà không gọi PayOS Webhook.

---

## 2. Các bước triển khai chi tiết cho Codex

### Bước 1: Bổ sung Tài khoản Khách hàng vào `supabase/seed.sql`
Mở file [`supabase/seed.sql`](../../supabase/seed.sql) và bổ sung 1 tài khoản Customer test bên cạnh tài khoản Merchant hiện có:

```sql
-- Thêm Customer User test cho kiểm thử E2E
DECLARE
  customer_id uuid := 'c1000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    customer_id, 'authenticated', 'authenticated', 'customer.local@gosavingfood.test',
    crypt('LocalTest123!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
    '{"name":"Local Test Customer","phone":"0987654321","role":"customer"}'::jsonb,
    now(), now()
  ) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  INSERT INTO public.users (id, name, email, phone, role, updated_at)
  VALUES (customer_id, 'Local Test Customer', 'customer.local@gosavingfood.test', '0987654321', 'customer', now())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    role = 'customer',
    updated_at = now();
END;
```
> [!NOTE]
> Sau khi sửa, chạy `pnpm db:reset` để áp dụng seed mới vào Docker Supabase.

---

### Bước 2: Cài đặt `@playwright/test` và Chromium Browser
1. Thêm gói phụ thuộc vào thư mục gốc Monorepo:
   ```bash
   pnpm add -D -w @playwright/test
   ```
2. Cài đặt binary trình duyệt Chromium:
   ```bash
   npx playwright install chromium
   ```

---

### Bước 3: Tạo cấu hình Playwright [`playwright.config.ts`](../../playwright.config.ts)
Tạo file `playwright.config.ts` ở thư mục gốc với các thông số:
- **`testDir`**: `'./tests/e2e'`
- **`timeout`**: `60000` (60s mỗi test)
- **`fullyParallel`**: `false` (các test E2E thao tác DB nên chạy tuần tự để tránh race condition đơn hàng)
- **`use`**:
  - `baseURL`: `'http://localhost:3000'`
  - `trace`: `'on-first-retry'`
  - `screenshot`: `'only-on-failure'`
- **`webServer`**:
  - `command`: `'pnpm dev'`
  - `url`: `'http://localhost:3000'`
  - `reuseExistingServer`: `!process.env.CI`
  - `timeout`: `120000`
- **`projects`**:
  - Project `Customer Mobile`: Cấu hình viewport `devices['Pixel 7']`.
  - Project `Merchant Desktop`: Cấu hình viewport `{ width: 1280, height: 800 }`.

---

### Bước 4: Xây dựng Thư mục Helpers [`tests/e2e/helpers/`](../../tests/e2e/helpers/)

Tạo 3 file tiện ích:
1. `tests/e2e/helpers/auth.ts`:
   * `loginCustomerSession(page, context)`: Gọi trực tiếp `@supabase/supabase-js` với endpoint `http://127.0.0.1:54321` đăng nhập tài khoản `customer.local@gosavingfood.test` / `LocalTest123!`, lấy access_token & refresh_token nạp vào `localStorage` của Customer PWA (`sb-127.0.0.1-auth-token` và `gsf_cached_customer_user`).
   * `loginMerchantViaUI(page)`: Đi tới `/merchant`, điền email `merchant.local@gosavingfood.test`, mật khẩu `LocalTest123!` và bấm Đăng nhập. Chờ dashboard tải hoàn tất.
2. `tests/e2e/helpers/db.ts`:
   * `resetTestOrderState()`: Kết nối vào Local DB qua `DATABASE_URL` (`postgresql://postgres:postgres@127.0.0.1:54322/postgres`), xóa các đơn hàng test phát sinh, đặt lại số lượng tồn kho túi ăn test `00c2cc90-f239-4b1b-bf4b-b471e379ef61` về 10, đặt lại `used_count = 0` cho voucher `TMU2026`.
3. `tests/e2e/helpers/selectors.ts`:
   * Định nghĩa các locator chuẩn (CSS / data-testid / ARIA role) cho:
     * Nút thêm giỏ hàng, nút mở giỏ, ô nhập voucher, nút Đặt hàng.
     * Màn hình chi tiết đơn hàng, thẻ QR nhận món.
     * Các tab điều hướng của Merchant (Đơn mới, Đang làm, Chờ lấy, Hoàn tất), nút xác nhận chuẩn bị, nút món sẵn sàng, modal quét QR đối soát.

---

### Bước 5: Viết 2 Kịch bản Spec E2E Cốt lõi

#### 1. `tests/e2e/01-auth-flow.spec.ts` (Đáp ứng `SRS-01-AUTH-SEC` — `E2E-01`)
* **Test 1: Khách vãng lai và Rào chắn Đăng nhập**
  * Khách vào `/explore/`.
  * Header hiển thị nút đăng nhập.
  * Bấm thêm món vào giỏ -> Modal yêu cầu đăng nhập hiển thị.
* **Test 2: Bảo vệ Phân quyền (Route Guard)**
  * Nạp phiên Khách hàng (`role = 'customer'`).
  * Trình duyệt cố tình điều hướng sang `/merchant`.
  * Hệ thống chặn truy cập, hiển thị thông báo lỗi hoặc chuyển hướng về trang đăng nhập của Merchant. Khách tuyệt đối không xem được dữ liệu quán.
* **Test 3: Merchant Đăng nhập Hợp lệ qua Giao diện**
  * Truy cập `/merchant`.
  * Nhập `merchant.local@gosavingfood.test` và `LocalTest123!`.
  * Hệ thống xác thực thành công, điều hướng vào giao diện quản lý cửa hàng `Local Test Bakery`.
* **Test 4: Đăng xuất**
  * Bấm nút đăng xuất trên Merchant PWA.
  * LocalStorage được dọn dẹp, giao diện quay lại màn hình Login.

#### 2. `tests/e2e/02-order-fulfillment.spec.ts` (Đáp ứng `SRS-03` — `E2E-03` & `SRS-04` — `E2E-04A`)
* **Thiết lập**: Chạy `resetTestOrderState()` trước khi bắt đầu. Khởi tạo 2 Browser Context: `customerContext` (Mobile) và `merchantContext` (Desktop).
* **Luồng thực thi**:
  1. `merchantPage` đăng nhập tài khoản Quán, chuyển vào tab *"Đơn hàng"*.
  2. `customerPage` (đã đăng nhập Customer) mở trực tiếp trang túi đồ ăn mẫu `/explore/bag/00c2cc90-f239-4b1b-bf4b-b471e379ef61`.
  3. Khách bấm *"Thêm vào giỏ"* -> Mở giỏ hàng -> Chuyển đến màn hình Checkout (`/explore/checkout`).
  4. Khách nhập mã voucher `TMU2026` -> Bấm Áp dụng -> Tổng thanh toán hiển thị `0 đ`.
  5. Khách bấm *"Đặt hàng"* -> Hệ thống tạo đơn hàng thành công với trạng thái `paid`.
  6. **Kiểm tra Realtime bên Quán (`merchantPage`)**: Tab *"Đơn mới"* tự động cập nhật xuất hiện đơn hàng mới mà không cần F5 trình duyệt.
  7. Quán bấm nút *"Xác nhận & Chuẩn bị"*:
     * Đơn hàng bên Quán chuyển sang cột *"Đang chuẩn bị"* (`preparing`).
     * `customerPage` nhận sự kiện Realtime đổi trạng thái sang *"Quán đang chuẩn bị món"*, nút "Hủy đơn" bị ẩn.
  8. Quán bấm nút *"Món đã sẵn sàng"*:
     * Đơn hàng bên Quán chuyển sang cột *"Chờ khách đến lấy"* (`ready_for_pickup`).
     * `customerPage` nhận sự kiện Realtime hiển thị **Mã QR lấy món** (`pickup_token`).
  9. Quán thực hiện xác thực mã QR đối soát:
     * Quán gọi hàm đối soát `verify_pickup_qr` với token của đơn hàng (hoặc nhập mã/quét qua modal QR của quán).
     * Đơn hàng chuyển sang trạng thái `completed`.
  10. **Hoàn tất**: `customerPage` tự động đổi sang màn hình Chúc mừng hoàn tất đơn và xuất hiện modal đánh giá.

---

### Bước 6: Chuẩn hóa Script trong [`package.json`](../../package.json)
Bổ sung các lệnh chạy E2E vào `scripts`:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

---

## 3. Tiêu chuẩn Nghiệm thu (Acceptance Criteria Checklist)

Codex phải đảm bảo toàn bộ các tiêu chí sau đạt 100% trước khi kết thúc nhiệm vụ:

- [x] **Docker Local Hoạt động**: `pnpm db:reset` chạy thành công, seed đầy đủ Merchant, Customer, Bag, Voucher mà không lỗi.
- [x] **Không ảnh hưởng Test cũ**: `pnpm test:offline` (14/14 pass) và `pnpm test:local` (42/42 pass) vẫn chạy bình thường.
- [ ] **Build & Lint Không Lỗi**: `pnpm build` và `pnpm lint` thành công trên toàn bộ workspace monorepo.
- [x] **Test E2E Pass 100%**:
  - `01-auth-flow.spec.ts` pass toàn bộ test cases về phân quyền và đăng nhập.
  - `02-order-fulfillment.spec.ts` pass toàn bộ chu trình đặt hàng - đồng bộ realtime - đối soát QR 0đ.
- [x] **Bảo mật & Clean Code**:
  - Không hardcode secret hay commit key nhạy cảm vào Git.
  - Giữ nguyên cấu trúc phân tầng PWA theo `AGENTS.md` (UI không gọi trực tiếp Supabase).
- [x] **Cập nhật Tài liệu**:
  - Cập nhật [`docs/TESTING.md`](../TESTING.md) hướng dẫn chạy Playwright E2E.
  - Cập nhật [`docs/CHANGELOG.md`](../CHANGELOG.md) và [`AI_CONTEXT.md`](../../AI_CONTEXT.md).

---

## 4. Quy tắc Bắt buộc cho Codex (Codex Non-Negotiables)

1. **Tuyệt đối không can thiệp vào các thành phần chờ AI**: Không viết test E2E kiểm tra form tạo túi ăn thủ công của Quán hoặc ô Search của Khách (để tránh phải viết lại khi tích hợp AI).
2. **Không sửa các file migration lịch sử**: Mọi dữ liệu mẫu phục vụ kiểm thử phải nằm trong `supabase/seed.sql` hoặc DB fixture helper.
3. **Chạy tuần tự, cô lập trạng thái**: Đảm bảo hàm `resetTestOrderState()` được gọi trước mỗi lượt test để số lượng tồn kho và trạng thái voucher luôn nhất quán.
4. **Báo cáo kết quả rõ ràng**: Bàn giao đầy đủ danh sách file đã tạo/sửa đổi kèm log chạy thành công của lệnh `pnpm test:e2e`.


## Kết quả triển khai — 2026-11-14

E2E pass 9/9 sau reset Docker sạch; offline 14/14, local 42/42, build 3/3 tác vụ thành công (không dùng cache). Lint vẫn thất bại ở Merchant: 113 errors, 3 warnings có sẵn; tiêu chí build + lint chưa được đánh dấu hoàn tất. Xem [báo cáo và log nghiệm thu](../reports/E2E_TESTING_2026-11-14.md), gồm danh sách file thay đổi và những điểm UI thực tế khác ví dụ trong kế hoạch.
