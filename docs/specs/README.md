# BỘ ĐẶC TẢ KỊCH BẢN KIỂM THỬ — GOSAVINGFOOD (GSF)

> **Dự án:** Nền tảng giải cứu thực phẩm dư thừa GoSavingFood (GSF)  
> **Phiên bản tài liệu:** 1.0.0  
> **Ngôn ngữ:** Tiếng Việt  
> **Mục tiêu:** Chuẩn hóa toàn bộ kịch bản kiểm thử từ nghiệm thu nghiệp vụ (UAT), API/RPC Backend, Bảo mật RLS, Giao diện Component UI cho đến luồng toàn trình E2E đồng bộ thời gian thực (Realtime Sync) giữa **Customer PWA** và **Merchant PWA**.

---

## 1. Danh mục các tài liệu đặc tả kiểm thử

Tài liệu kiểm thử được tổ chức theo 4 nhóm tính năng trọng tâm của nền tảng GSF:

| STT | Tài liệu | Nhóm tính năng | Phạm vi bao phủ chính |
| :---: | :--- | :--- | :--- |
| **01** | [`01-auth-security-test-cases.md`](./01-auth-security-test-cases.md) | Xác thực & Phân quyền | Đăng nhập Email/Phone/OAuth, Row-Level Security (RLS), cô lập Merchant 1:1, bảo mật Token. |
| **02** | [`02-bag-timing-lifecycle-test-cases.md`](./02-bag-timing-lifecycle-test-cases.md) | Vòng đời túi đồ ăn & Thời gian | Phân biệt túi `daily` vs `shelf_life`, đếm ngược giờ lấy món, định vị PostGIS/Mapbox, trạng thái Sold Out. |
| **03** | [`03-order-payment-test-cases.md`](./03-order-payment-test-cases.md) | Đặt hàng & Thanh toán | Đặt món atomic (`place_order`), VietQR PayOS, Voucher 0đ (`TMU2026`), Timeout 33 phút, Webhook. |
| **04** | [`04-pickup-fulfillment-test-cases.md`](./04-pickup-fulfillment-test-cases.md) | Nhận món & Vòng đời sau thanh toán | Quét camera QR (`html5-qrcode`), hoàn tất đơn, hủy đơn & hoàn tiền (`refund_requests`), xử lý No-show. |

---

## 2. Bảng quy ước mã định danh truy vết (Traceability ID Matrix)

Tất cả các ca kiểm thử trong hệ thống đều tuân thủ cấu trúc định danh thống nhất nhằm phục vụ truy vết từ yêu cầu nghiệp vụ đến kiểm thử tự động và kiểm thử thủ công:

| Tiền tố mã | Loại kiểm thử | Mục đích | Tiêu chuẩn mô tả |
| :--- | :--- | :--- | :--- |
| `TC-x.y` | **Acceptance Test Case (UAT)** | Kiểm thử chấp nhận nghiệp vụ từ góc nhìn người dùng | Định dạng chuẩn **Given - When - Then** với dữ liệu thực tế. |
| `API-nn` | **API & RPC Test** | Kiểm thử giao diện lập trình ứng dụng & stored procedures | Endpoint/RPC, Method, Payload, Expected HTTP Status & DB Mutation. |
| `SEC-nn` | **Security & RLS Test** | Kiểm thử an toàn thông tin & phân quyền truy cập dữ liệu | Kiểm tra Supabase RLS, ngăn chặn IDOR, giả mạo Client payload. |
| `UI-nn` | **Component UI Test** | Kiểm thử giao diện và hành vi các thành phần màn hình | 4 trạng thái (`Loading`, `Success`, `Error`, `Empty`), Debounce, Validation. |
| `E2E-nn` | **End-to-End Frontend Flow** | Kiểm thử toàn trình tương tác 2 App đồng thời | Luồng chuyển trạng thái đơn hàng song song giữa Customer PWA và Merchant PWA. |

---

## 3. Quy chuẩn 5 mục trong mỗi tài liệu kiểm thử

Mỗi file đặc tả kiểm thử của từng nhóm tính năng đều tuân thủ chặt chẽ 5 phần cấu trúc:
1. **Mục 1 — Acceptance Test Cases (UAT - `TC-x.y`):** Kịch bản nghiệm thu nghiệp vụ gắn với hành vi người dùng cuối.
2. **Mục 2 — API & Database RPC Tests (`API-nn`):** Kiểm thử tầng API Next.js Route Handlers và PostgreSQL Stored Procedures.
3. **Mục 3 — Security & RLS Tests (`SEC-nn`):** Kiểm thử ranh giới bảo mật đa người dùng, chống leo thang đặc quyền.
4. **Mục 4 — Component UI Tests (`UI-nn`):** Kiểm thử các thành phần giao diện theo 4 trạng thái cốt lõi và các tương tác giới hạn.
5. **Mục 5 — E2E Frontend Tests & State Transition (`E2E-nn`):** Bảng ma trận theo dõi chi tiết bước đổi trạng thái đơn hàng từng giây trên cả 2 màn hình PWA Customer và Merchant.

---

## 4. Ánh xạ với các bộ kiểm thử tự động sẵn có trong Codebase

| File test trong mã nguồn | Lệnh thực thi | Ánh xạ kịch bản đặc tả |
| :--- | :--- | :--- |
| `tests/bagTiming.test.ts` | `pnpm vitest run tests/bagTiming.test.ts` | Nhóm `02-bag-timing-lifecycle-test-cases.md` |
| `tests/mapbox.test.ts` | `pnpm vitest run tests/mapbox.test.ts` | Nhóm `02-bag-timing-lifecycle-test-cases.md` (Định vị) |
| `tests/envHelper.test.ts` | `pnpm vitest run tests/envHelper.test.ts` | Nhóm `01-auth-security-test-cases.md` |
| `tests/auth-backend.test.ts` | `pnpm vitest run tests/auth-backend.test.ts` | Nhóm `01-auth-security-test-cases.md` |
| `tests/production-backend-audit.test.ts` | `pnpm vitest run tests/production-backend-audit.test.ts` | Nhóm `01`, `03`, `04` (Audit toàn vẹn Backend) |
| `scripts/comprehensive-system-audit.mjs` | `node scripts/comprehensive-system-audit.mjs` | 25 bài kiểm tra toàn vẹn DB, cô lập Merchant 1:1, E2E Order Flow |
| `scripts/api-smoke-test.mjs` | `node scripts/api-smoke-test.mjs` | Nhóm `03-order-payment-test-cases.md` (Smoke API) |
