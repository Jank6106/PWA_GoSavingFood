# GoSavingFood (GSF) — Web & PWA Monorepo

> **Nhãn trạng thái**: `CONFIRMED` = đã xác minh từ source code | `INFERRED` = suy luận từ code | `UNKNOWN` = cần chủ dự án xác nhận | `PLANNED` = dự kiến, chưa triển khai.

GoSavingFood là nền tảng giải cứu thực phẩm (food-rescue marketplace) kết nối người tiêu dùng với thực phẩm dư thừa cuối ngày ("Surprise Bags") từ các nhà hàng, tiệm bánh, quán cà phê và cửa hàng địa phương với mức giá ưu đãi (`CONFIRMED` từ `apps/web`, `apps/customer`, `apps/merchant`).

## Cấu trúc Repository

```text
.
├── apps/
│   ├── web/            # Next.js 16 Landing Page, SEO, hướng dẫn cài PWA, & API routes cho PayOS
│   ├── customer/       # React 19 + Vite Customer PWA (phục vụ dưới đường dẫn /explore/)
│   └── merchant/       # React 19 + Vite Merchant PWA (quản lý cửa hàng, túi đồ, quét QR, đơn hàng, thống kê)
├── packages/
│   └── ui/             # @gosavingfood/ui: design tokens dùng chung & các UI primitives React
├── supabase/
│   └── migrations/     # Schema PostgreSQL + PostGIS, RPCs, RLS policies và triggers (0009–0041)
├── scripts/            # Kiểm tra DB, chạy migration, đồng bộ storage, Cloudflare DNS/Worker, & E2E audit
├── tests/              # Bộ test Vitest (auth/RPC, backend RLS/stress audit, bagTiming, mapbox)
└── docs/               # Project Memory Pack (Product, Architecture, Security, Data Model, API, ADRs...)
```

## Tech Stack (`CONFIRMED`)

- **Monorepo**: `pnpm@11.13.1` workspaces + `turbo@^2.10.12`
- **Landing & Payment API (`apps/web`)**: Next.js `16.3.3` (App Router), React `19.2.8`, Tailwind CSS v4, GSAP
- **Customer PWA (`apps/customer`)**: React `19.2.8`, Vite `8.2.2`, TypeScript, `@supabase/supabase-js`, `mapbox-gl`, `qrcode.react`, `@gosavingfood/ui`
- **Merchant PWA (`apps/merchant`)**: React `19.2.8`, Vite `8.2.2`, TypeScript, `@supabase/supabase-js`, `html5-qrcode`, `@gosavingfood/ui`
- **Backend**: Supabase (PostgreSQL `17.11`, PostGIS `3.3.7`, Auth, Realtime, Storage) + Next.js Serverless PayOS API + Cloudflare Worker proxy (`api.gosavingfood.app`)
- **Testing**: Vitest `5.0.5` + script E2E audit Node tùy chỉnh (`scripts/comprehensive-system-audit.mjs`)

## Khởi chạy nhanh (Quick Start)

### 1. Yêu cầu môi trường
- Node.js (đã kiểm thử trên Node 24 trong workspace) & `pnpm` (`11.13.1`)
- Cấu hình biến môi trường trong file `.env` ở thư mục gốc (xem [`.env.example`](.env.example) và [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))

### 2. Cài đặt & Chạy local
```bash
pnpm install

# Chạy song song tất cả các app
pnpm dev
# Hoặc chạy riêng từng app:
pnpm dev:web       # Next.js tại http://localhost:3000 (proxy /explore -> :5173, /merchant -> :5174)
pnpm dev:customer  # Vite Customer PWA tại http://localhost:5173/explore/
pnpm dev:merchant  # Vite Merchant PWA tại http://localhost:5174
```

### 3. Build, Lint & Test
```bash
pnpm build         # Chạy `turbo build` cho @gosavingfood/ui, web, customer, merchant
pnpm lint          # Chạy `turbo lint`
pnpm test          # Chạy `vitest run` (CẢNH BÁO: tests/auth-backend.test.ts & production-backend-audit.test.ts chạy trực tiếp vào Supabase thật!)
node scripts/comprehensive-system-audit.mjs  # Kiểm tra E2E DB, Auth, RLS & luồng đơn hàng trên DB thật
```

---

## Hệ thống Tài liệu (Project Memory Pack)

Toàn bộ kiến thức sản phẩm, kiến trúc, quyết định kỹ thuật và trạng thái dự án được lưu trực tiếp trong Git để làm **source of truth** duy nhất (không phụ thuộc vào lịch sử chat với AI):

| Tài liệu | Vai trò chính |
|---|---|
| [`AI_CONTEXT.md`](AI_CONTEXT.md) | Điểm bắt đầu cho mọi AI model mới (tóm tắt sản phẩm, trạng thái hiện tại, stack, rủi ro, roadmap) |
| [`AGENTS.md`](AGENTS.md) | Bộ quy tắc kỹ thuật bắt buộc cho AI coding agent (layering, bảo mật, migration, checklist trước khi xong việc) |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Tầm nhìn sản phẩm, bài toán, đối tượng người dùng, luồng nghiệp vụ, phân biệt `EXISTING` / `PLANNED` / `IDEA` |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Kiến trúc tổng thể, luồng request, auth, tích hợp ngoài (PayOS, Mapbox, Cloudflare) & sơ đồ hệ thống |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | Bảng DB, quan hệ ER, định danh, vòng đời dữ liệu (đơn hàng, túi đồ, thanh toán), dữ liệu nhạy cảm |
| [`docs/API.md`](docs/API.md) | Danh sách Next.js API routes, Supabase RPCs, input/output, validation và xử lý lỗi |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Kiến trúc bảo mật, RLS, quản lý secret, rủi ro đã biết và nợ kỹ thuật bảo mật |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Chạy local, build, deploy, migration DB, biến môi trường bắt buộc và rollback |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Quy chuẩn UI/UX, bảng màu, safe-area mobile và component dùng chung trong `packages/ui` |
| [`docs/TESTING.md`](docs/TESTING.md) | Chiến lược test, cách chạy các bộ test hiện có và phạm vi kiểm thử |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Kế hoạch phát triển theo 3 mốc `NOW` / `NEXT` / `LATER` |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) & `docs/adr/` | Bảng tổng hợp và chi tiết các quyết định kiến trúc (ADR-001 đến ADR-005) |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Nhật ký các thay đổi đáng chú ý của dự án |

---

## Hướng dẫn sử dụng Docs

### 1. Dành cho Developer (người mới hoặc tra cứu)
- **Mới vào dự án:** Đọc theo thứ tự [`AI_CONTEXT.md`](AI_CONTEXT.md) -> [`docs/PRODUCT.md`](docs/PRODUCT.md) -> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) -> [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Mất khoảng 10–15 phút để nắm toàn bộ bức tranh hệ thống.
- **Khi cần sửa một mảng cụ thể:** Chỉ cần mở đúng tài liệu chuyên sâu của mảng đó (ví dụ sửa DB thì đọc [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md), sửa thanh toán/API thì đọc [`docs/API.md`](docs/API.md) và [`docs/SECURITY.md`](docs/SECURITY.md)).
- **Nguyên tắc vàng:** Code thực tế là chân lý cuối cùng. Nếu phát hiện tài liệu lệch với code, hãy đối chiếu lại source code và cập nhật lại tài liệu ngay.

### 2. Dành cho việc làm việc với AI (ChatGPT, Claude, Gemini, Cursor, Codex...)
Để tránh tốn token, tránh AI bị "quên ngữ cảnh" hoặc sửa sai kiến trúc giữa các phiên chat:

1. **Khi bắt đầu phiên làm việc mới:** Yêu cầu AI đọc [`AI_CONTEXT.md`](AI_CONTEXT.md) và [`AGENTS.md`](AGENTS.md) trước tiên.
2. **Khi giao một task cụ thể:** Chỉ trỏ thêm đúng 1–2 file tài liệu liên quan trực tiếp (không bắt AI đọc hết toàn bộ `docs/` nếu không cần):
   - *Làm UI / tính năng frontend:* trỏ [`docs/PRODUCT.md`](docs/PRODUCT.md) + [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).
   - *Làm DB / RPC / luồng đơn hàng:* trỏ [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) + [`docs/SECURITY.md`](docs/SECURITY.md).
   - *Làm API / PayOS / Auth:* trỏ [`docs/API.md`](docs/API.md) + [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
   - *Sửa hạ tầng / env / deploy:* trỏ [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
3. **Mẫu prompt chuẩn khi giao việc cho AI:**
   ```text
   Đọc AI_CONTEXT.md và AGENTS.md để nắm rule dự án.
   Đọc thêm [tên file docs liên quan, ví dụ: docs/DATA_MODEL.md, docs/API.md].
   Nhiệm vụ: [mô tả rõ yêu cầu, file/app liên quan, điều kiện hoàn thành].
   Lưu ý: Kiểm tra code thực tế trước khi sửa, tuân thủ strict layering và chạy test sau khi xong.
   ```
4. **Sau khi AI làm xong task:** Nhắc AI thực hiện checklist cuối task trong [`AGENTS.md`](AGENTS.md):
   - Chạy build/test kiểm chứng.
   - Cập nhật [`docs/CHANGELOG.md`](docs/CHANGELOG.md) nếu có thay đổi hành vi/tính năng.
   - Cập nhật [`AI_CONTEXT.md`](AI_CONTEXT.md) / [`docs/ROADMAP.md`](docs/ROADMAP.md) nếu trạng thái sản phẩm thay đổi đáng kể.
   - Tạo ADR mới trong `docs/adr/` và ghi vào [`docs/DECISIONS.md`](docs/DECISIONS.md) nếu có quyết định kiến trúc mới.
