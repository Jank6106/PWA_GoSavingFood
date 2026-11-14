# DOCKER_TESTING_PLAN.md — Kế hoạch Triển khai Môi trường Database Test qua Docker (Supabase CLI)

> **Mục tiêu**: Tách biệt hoàn toàn việc chạy test tự động (`pnpm test`, audit scripts) khỏi Supabase Production Cloud (`lblwvbedtlxjtkcuxmsf`), đưa toàn bộ về cụm Docker cục bộ (Supabase Local) để kiểm thử an toàn 100%, không rác dữ liệu, chạy offline và có thể reset dữ liệu trong 3 giây.
>
> **Đối tượng thực hiện**: Codex / AI Coding Agent hoặc Developer.
> **Quy chuẩn bắt buộc**: Tuân thủ nghiêm ngặt [`AGENTS.md`](../../AGENTS.md) và [`docs/TESTING.md`](../TESTING.md).

---

## 1. Hiện trạng & Bối cảnh Kỹ thuật

```mermaid
flowchart TD
    subgraph HienTai["Hiện trạng (Rủi ro cao)"]
        TestRunner["pnpm test / Audit Scripts"] --> RootEnv[".env (Production Cloud)"]
        RootEnv --> CloudDB["Supabase Cloud (lblwvbedtlxjtkcuxmsf)"]
        CloudDB --> Risk["Rủi ro: Rác data, sai lệch tồn kho túi thật, tốn quota"]
    end

    subgraph MucTieu["Mục tiêu cải tiến (An toàn 100%)"]
        TestLocal["pnpm test:local"] --> EnvTest[".env.test (Local Config)"]
        EnvTest --> DockerDB["Docker Supabase Container (127.0.0.1:54321 / :54322)"]
        DockerDB --> Safe["An toàn: Tự do tạo/xóa, reset trong 3s, offline, zero quota"]
    end
```

- **Môi trường máy hiện có**:
  - `Docker 29.9.1` đã cài đặt trên máy.
  - `Supabase CLI 3.1.0` đã có sẵn qua `npx supabase`.
  - Cấu hình [`supabase/config.toml`](../../supabase/config.toml) đã sẵn sàng: Cổng API `54321`, Cổng PostgreSQL `54322`, Cổng Shadow DB `54320`.
  - Toàn bộ 33 file migrations từ `0009` đến `0041` đã hoàn chỉnh trong `supabase/migrations/`.
- **Điểm còn thiếu**:
  - Chưa có file `supabase/seed.sql` cho local DB.
  - Chưa có file `.env.test` tách biệt.
  - Loader [`scripts/lib/env.mjs`](../../scripts/lib/env.mjs) luôn mặc định đọc `.env` gốc.
  - Lệnh `pnpm test` trong `package.json` chưa phân tách giữa test offline, test local Docker và test live.

---

## 2. Các bước triển khai chi tiết cho Codex

### Bước 1: Tạo file cấu hình môi trường test (`.env.test.example` & `.env.test`)
Tạo file `.env.test.example` tại thư mục gốc và bổ sung file `.env.test` (đã được gitignore theo rule `.env*`):

```ini
# .env.test.example / .env.test — Cấu hình Supabase Docker cục bộ
NODE_ENV=test
USE_LOCAL_DB=true

# Supabase Local API (Cổng chuẩn theo supabase/config.toml)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM0NjYzOTl9.dummy-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzQ2NjM5OX0.dummy-local-service-key

# Kết nối trực tiếp PostgreSQL Local
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```
*(Ghi chú: Khi chạy `supabase start`, Supabase CLI sẽ in ra cặp key anon & service_role cố định chuẩn của local container, sao chép đúng cặp key đó vào `.env.test`)*.

---

### Bước 2: Nâng cấp [`scripts/lib/env.mjs`](../../scripts/lib/env.mjs) hỗ trợ đa môi trường
Sửa đổi hàm `loadRootEnv()` để tự động ưu tiên nạp `.env.test` khi phát hiện cờ môi trường test:

- **Logic cần cập nhật**:
  1. Kiểm tra nếu `process.env.NODE_ENV === 'test'` hoặc `process.env.USE_LOCAL_DB === 'true'`.
  2. Nếu có `.env.test`, đọc và nạp biến từ `.env.test` trước.
  3. Sau đó mới nạp bổ sung từ `.env` nếu biến đó chưa có.
  4. Giữ nguyên nguyên tắc: Biến đã có trong `process.env` (truyền qua CLI shell) sẽ **không bị ghi đè**.
- **Cập nhật test**: Bổ sung test case trong [`tests/envHelper.test.ts`](../../tests/envHelper.test.ts) xác nhận cơ chế ưu tiên `.env.test`.

---

### Bước 3: Tạo `supabase/seed.sql` cho Database Local
Khi `supabase start` hoặc `supabase db reset` chạy, nó sẽ tự động chạy toàn bộ migrations từ `0009` đến `0041` rồi chạy tiếp `supabase/seed.sql`.

Codex cần tạo file `supabase/seed.sql` với dữ liệu tối thiểu phục vụ kiểm thử:
1. **1 Merchant User test** trong `auth.users` và `public.users` (kèm store tương ứng).
2. **1 Store đối tác test** (tọa độ Hà Nội, `is_open = true`).
3. **2 Surprise Bags mẫu** (1 túi `daily`, 1 túi `shelf_life` với số lượng `quantity = 10`, giá hợp lệ).
4. **1 Voucher test**: Mã `TMU2026` (`discount_amount = 1000000`, `is_hidden = true`, `max_uses = 100`).

> [!IMPORTANT]
> Dữ liệu seed này giúp các file test integration (`production-backend-audit.test.ts`, `auth-backend.test.ts`) và audit script (`comprehensive-system-audit.mjs`) có ngay Store và Bag để query mà không bị lỗi `Cannot read properties of undefined` khi database vừa mới reset.

---

### Bước 4: Chuẩn hóa bộ lệnh npm trong [`package.json`](../../package.json)
Bổ sung các script quản lý database Docker và phân cấp lệnh test:

```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:status": "supabase status",
    "test:offline": "vitest run tests/bagTiming.test.ts tests/mapbox.test.ts tests/envHelper.test.ts",
    "test:local": "cross-env NODE_ENV=test USE_LOCAL_DB=true vitest run",
    "test:audit": "cross-env NODE_ENV=test USE_LOCAL_DB=true node scripts/comprehensive-system-audit.mjs",
    "test:live": "vitest run",
    "test": "pnpm test:offline"
  }
}
```

- Lệnh `pnpm test` mặc định sẽ chuyển sang chạy **`test:offline`** (hoàn toàn an toàn, chạy trong 1 giây, bất kỳ ai pull repo về gõ `pnpm test` cũng chạy được ngay mà không cần bật Docker).
- Khi muốn kiểm thử sâu backend: Bật Docker ➔ Gõ `pnpm test:local` hoặc `pnpm test:audit`.
- Lệnh `test:live` chỉ dùng khi thực sự cần kiểm định môi trường cloud production.

---

### Bước 5: Cập nhật Tài liệu & Kiểm tra Nghiệm thu
Sau khi hoàn thành code:
1. **Kiểm tra nghiệm thu (Acceptance Criteria)**:
   - [ ] Khởi động Docker Desktop ➔ chạy `pnpm db:start` ➔ Supabase local chạy thành công, mở được Studio tại `http://localhost:54323`.
   - [ ] Chạy `pnpm db:reset` ➔ Áp dụng 33 migrations và `seed.sql` thành công, không phát sinh lỗi SQL.
   - [ ] Chạy `pnpm test:local` ➔ Toàn bộ 5 test suites trong `tests/` pass 100% trên container local.
   - [ ] Chạy `pnpm test:audit` ➔ Script audit 25 tiêu chuẩn pass 100% trên container local.
   - [ ] Kiểm tra Supabase Cloud thật: Không có bất kỳ user hay order rác nào phát sinh.
   - [ ] Chạy `pnpm build` và `pnpm lint` đảm bảo không vỡ build workspace.
2. **Cập nhật tài liệu**:
   - Cập nhật [`docs/TESTING.md`](../TESTING.md): Bổ sung hướng dẫn chạy local docker testing.
   - Cập nhật [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md): Thêm hướng dẫn dùng `supabase start` / `reset`.
   - Cập nhật [`AI_CONTEXT.md`](../../AI_CONTEXT.md) và [`docs/CHANGELOG.md`](../CHANGELOG.md).

---

## 3. Quy tắc bắt buộc cho Codex (Codex Non-Negotiables)

1. **Tuyệt đối không sửa các migration cũ (`0009` đến `0041`)**: Toàn bộ schema hiện tại đã được đồng bộ với Cloud. Bất kỳ bổ sung nào cho môi trường local phải nằm trong `supabase/seed.sql`.
2. **Không commit secret hay token vào Git**: Các file `.env.test` phải nằm ngoài Git tracking (`.gitignore` đã chặn `.env*`).
3. **Bảo toàn tính tương thích**: Script `scripts/lib/env.mjs` phải giữ nguyên khả năng đọc `.env` khi chạy app ngoài đời thực. Không được làm hỏng luồng chạy `pnpm dev`.
4. **Giao tiếp rõ ràng**: Sau khi hoàn thành, Codex phải bàn giao danh sách các file đã thay đổi và kết quả chạy `pnpm test:offline` + `pnpm test:local`.
