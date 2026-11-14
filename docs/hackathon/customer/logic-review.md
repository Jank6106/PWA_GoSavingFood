# Customer Finder — Báo cáo triển khai Logic & Contract (`logic-review.md`)

- **Ngày thực hiện**: 13/11/2026 (Cập nhật sau Final Review của Coordinator)
- **Worker**: AGY Finder Logic (Orca session: `codex_1e76266e_7ca4_4291_95cd_7c885eb2a370`, task: `task_3d875124f9c7`, dispatch: `ctx_1f98b20b9786`)
- **Nhánh**: `feat/customer-hackathon` (repo `PWA_GoSavingFood`)
- **Tài liệu tham chiếu**: `docs/plans/CUSTOMER_HACKATHON_PLAN.md`, `docs/hackathon/customer/REVIEW.md`, `AGENTS.md`

---

## 1. Khắc phục 4 trường hợp hồi quy từ Final Review (`tests/customerFinder.final-review.test.ts`)

Root review integration đã phát hiện 4 điểm hồi quy; toàn bộ đã được khắc phục trọn vẹn mà không sửa/xóa bất kỳ dòng test nào của Root:

1. **Khớp danh mục theo token/phrase boundaries (`\b`), không dính substring**:
   - Trước đây regex `ga`, `bo`, `com` bắt dính chuỗi con trong `100 ngàn` (chứa `ga`), `ngân sách` (chứa `ga`), `combo` (chứa `bo`).
   - Đã chuẩn hoá toàn bộ regex danh mục sang token/phrase boundary:
     - `beverage`: `/\b(?:do uong|thuc uong|nuoc uong|ca phe|cafe|coffee|tra sua|tra|sinh to|smoothie|beverage|juice|nuoc ep)\b/`
     - `meat`: `/\b(?:mon man|do man|an man|man|thit|com|bun|pho|mon nong|ga|bo|heo)\b/`
     - `seafood`: `/\b(?:hai san|seafood|mon ca|thit ca|ca bien|ca hoi|ca thu|tom|muc|cua|ghe)\b/` (loại trừ từ `ca` đơn lẻ để không nhầm cà phê hay tất cả).
   - Kết quả: `cà phê dưới 100 ngàn` nhận đúng `beverage`; `ngân sách 100k` trả về `category: null`.

2. **Xử lý tiền tố khu vực `khu`/`khu vực` sau `quanh`/`gần`**:
   - Cụm từ trong biên bản họp: `"Tối nay có món mặn nào dưới 35k quanh khu Dịch Vọng ăn no được không?"`.
   - Trước đây bóc tách thành `khu Dịch Vọng`, dẫn đến không khớp địa chỉ quán thực tế là `Dịch Vọng` / `Dịch Vọng Hậu`.
   - Bổ sung logic tách generic prefix: tự động lọc bỏ tiền tố `khu` hoặc `khu vực` sau các từ chỉ vị trí mà không cắt bớt các địa danh thực (như `Khu đô thị Trung Hòa`).
   - Kết quả: Bóc tách chính xác `area: 'Dịch Vọng'`.

3. **Bọc toàn bộ auth/import/fetch/body bằng reject-on-abort race**:
   - `controller.abort()` đơn thuần chỉ hủy `fetch()` nhưng không thể reject được các Promise đang treo (chẳng hạn `supabase.auth.getSession()` bị pending vô tận).
   - Đã tái cấu trúc `searchCustomerCatalog` dùng `Promise.race([executeWorkflow(), abortPromise])`:
     - `abortPromise` lắng nghe `controller.signal` (được kích hoạt bởi timeout 8000ms hoặc signal bên ngoài) và reject ngay lập tức khi bị abort.
     - Khối `catch` của auth kiểm tra `controller.signal.aborted` để không swallow lỗi abort.
     - Toàn bộ event listeners và timer được dọn dẹp sạch sẽ trong khối `finally`.
   - Kết quả: Khi session lookup bị pending, request vẫn reject chính xác sau 8000ms.

4. **Giữ nguyên toàn bộ schema safety, offline mode và test cũ**:
   - Bounded query input tối đa 400 ký tự.
   - Thẩm định envelope shape nghiêm ngặt (`validateServerConstraints`).
   - Revalidate dữ liệu mới nhất khi resolve và theo focus/visibility/interval.

---

## 2. Bằng chứng kiểm tra thực tế (Real Verification Evidence)

### A. Chạy toàn bộ 3 suites Customer Finder
```sh
npx --yes pnpm@11.13.1 exec vitest run tests/customerFinder.test.ts tests/customerFinder.review.test.ts tests/customerFinder.final-review.test.ts
```
**Kết quả**:
```
 ✓ tests/customerFinder.final-review.test.ts (4 tests) 20ms
 ✓ tests/customerFinder.review.test.ts (11 tests) 16ms
 ✓ tests/customerFinder.test.ts (42 tests) 49ms

 Test Files  3 passed (3)
      Tests  57 passed (57)
   Duration  428ms
```

### B. Toàn bộ 6 Test Suites Offline an toàn của dự án
```sh
npx --yes pnpm@11.13.1 exec vitest run tests/bagTiming.test.ts tests/mapbox.test.ts tests/envHelper.test.ts tests/customerFinder.test.ts tests/customerFinder.review.test.ts tests/customerFinder.final-review.test.ts
```
**Kết quả**:
```
 ✓ tests/customerFinder.final-review.test.ts (4 tests) 27ms
 ✓ tests/bagTiming.test.ts (6 tests) 46ms
 ✓ tests/customerFinder.review.test.ts (11 tests) 20ms
 ✓ tests/mapbox.test.ts (3 tests) 7ms
 ✓ tests/customerFinder.test.ts (42 tests) 70ms
 ✓ tests/envHelper.test.ts (5 tests) 122ms

 Test Files  6 passed (6)
      Tests  71 passed (71)
   Duration  487ms
```

### C. Targeted ESLint (Service & Hook)
```sh
npx --yes pnpm@11.13.1 --filter customer exec eslint src/services/customer-finder.service.ts src/hooks/useCustomerFinder.ts
```
**Kết quả**:
- Exit code 0 (0 errors, 0 warnings).

### D. TypeScript Project Build (`tsc -b` & Vite build)
```sh
npx --yes pnpm@11.13.1 --filter customer build
```
**Kết quả**:
- `$ tsc -b && vite build`
- Exit code 0 (✓ built in 1.41s).

---

## 3. Trạng thái và phạm vi bàn giao

- Toàn bộ logic service, hook và tests nằm trong phạm vi chỉ định (`apps/customer/src/services/customer-finder.service.ts`, `apps/customer/src/hooks/useCustomerFinder.ts`, `tests/customerFinder.test.ts`, `docs/hackathon/customer/logic-review.md`).
- Hai file test của Root (`tests/customerFinder.review.test.ts` và `tests/customerFinder.final-review.test.ts`) được giữ nguyên bản 100%.
- Logic đã sẵn sàng để Coordinator thực hiện nghiệm thu tích hợp tổng thể cùng UI và Home.
