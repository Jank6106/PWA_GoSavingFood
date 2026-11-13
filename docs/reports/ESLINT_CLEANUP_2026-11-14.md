# Nghiệm thu ESLint — 2026-11-14

Đã xử lý 116 chẩn đoán Merchant (113 lỗi, 3 cảnh báo). Để đáp ứng yêu cầu toàn workspace sạch, cũng xử lý nợ có sẵn ở Customer (151 lỗi, 20 cảnh báo) và Web (4 lỗi, 8 cảnh báo). Tổng cộng 299 chẩn đoán trước sửa; lint cuối cùng không còn lỗi/cảnh báo.

## Thay đổi

- Bổ sung kiểu payload truy vấn/RPC/Realtime, dùng kiểu Supabase SDK và thu hẹp lỗi `unknown`; giữ nguyên câu truy vấn, điều kiện nghiệp vụ và giá trị mặc định.
- Đồng bộ ref trong effect, giữ hook vô điều kiện, tách callback effect khỏi dependency phản ứng; đồng bộ form/cache theo input trước khi commit UI. Giỏ hàng dùng snapshot storage ổn định và giữ nguyên quy tắc gộp/giới hạn số lượng.
- Chuyển tiện ích trình duyệt Merchant sang `utils/browser.ts`, giữ re-export tương thích tại vị trí cũ; UI Merchant không import service. Tách feedback QR và các export không phải component để đáp ứng React Refresh.
- Web dùng Next Image với `unoptimized`, giữ nguyên URL ảnh/kích thước hiển thị; loại tham số không dùng và tách biến cần gán lại trong API PayOS.
- Không thay đổi cấu hình/rule ESLint, không thêm suppression hoặc dependency; không thay migration, RLS, quyền RPC, payload PayOS hay policy cache/mutation offline. API PayOS chỉ đổi khai báo biến/tham số không dùng.

## Kết quả trên mã nguồn cuối

| Lệnh | Kết quả |
| --- | --- |
| `pnpm --filter merchant lint` | Exit 0; 0 errors, 0 warnings |
| `pnpm lint` | Exit 0; cả 3 ứng dụng sạch lint |
| `pnpm build` | Exit 0; 3/3 ứng dụng build thành công |
| `pnpm test:offline` | Exit 0; 14/14 tests |
| `pnpm test:local` | Exit 0; 42/42 tests, Supabase Docker local |
| `pnpm test:e2e` | Exit 0; 9/9 tests Playwright |

Chạy qua pnpm 11.13.1 được Corepack pin và shim PATH tạm trong `scratch/bin` vì phiên PowerShell không có `pnpm` độc lập trên PATH. Không sửa package scripts. Test local và E2E chạy lần lượt để tránh tranh chấp fixture DB; không chạy live/production audit.

Kiểm tra Chromium bổ sung (harness tạm ở `scratch/cart-regression.mjs`) pass cả 4 nhóm: gộp giỏ guest với giới hạn tồn kho; đăng xuất/đăng nhập/chuyển tài khoản; thêm/sửa/xóa giỏ và persistence; giữ cập nhật trong bộ nhớ khi localStorage báo lỗi. TypeScript hai PWA và kiểm tra whitespace diff đều pass.

Build Customer còn thông báo kích thước bundle lớn của Vite; đây là thông báo build, không phải chẩn đoán ESLint. Bộ E2E vẫn có cảnh báo môi trường NO_COLOR/FORCE_COLOR của Node. Các kiểm thử trên không thay thế production catalog audit.

## Trích xuất terminal: pnpm lint

```text
$ pnpm lint
$ turbo lint
• turbo 2.10.12

   • Packages in scope: @gosavingfood/ui, customer, merchant, web
   • Running lint in 4 packages
   • Remote caching disabled

web:lint: cache miss, executing 2b03986fcaf6f04a
customer:lint: cache miss, executing f7adfef229226e3e
merchant:lint: cache miss, executing f4981de5e1a70418
web:lint: $ eslint
customer:lint: $ eslint .
merchant:lint: $ eslint .

 Tasks:    3 successful, 3 total
Cached:    0 cached, 3 total
  Time:    37.204s 


Exit code: 0
```

## Trích xuất terminal: pnpm test:e2e

```text
$ pnpm test:e2e
$ node scripts/test-e2e.mjs

Running 9 tests using 1 worker

(node:25004) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok 1 [Customer Mobile] › tests\e2e\01-auth-flow.spec.ts:6:1 › Guest can browse, but adding a bag requires login (4.5s)
  ok 2 [Customer Mobile] › tests\e2e\01-auth-flow.spec.ts:15:1 › Customer session cannot enter the merchant dashboard or create a store (2.5s)
  ok 3 [Customer Mobile] › tests\e2e\01-auth-flow.spec.ts:30:1 › Merchant logs in through UI and retains the verified session after reload (2.8s)
  ok 4 [Customer Mobile] › tests\e2e\01-auth-flow.spec.ts:38:1 › Merchant logout clears the session and protects the dashboard (3.0s)
  ok 5 [Customer Mobile] › tests\e2e\02-order-fulfillment.spec.ts:7:1 › 0đ voucher order: checkout, bidirectional Realtime, merchant preparation and QR handover (9.7s)
(node:7748) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ok 6 [Merchant Desktop] › tests\e2e\01-auth-flow.spec.ts:6:1 › Guest can browse, but adding a bag requires login (3.8s)
  ok 7 [Merchant Desktop] › tests\e2e\01-auth-flow.spec.ts:15:1 › Customer session cannot enter the merchant dashboard or create a store (1.7s)
  ok 8 [Merchant Desktop] › tests\e2e\01-auth-flow.spec.ts:30:1 › Merchant logs in through UI and retains the verified session after reload (2.7s)
  ok 9 [Merchant Desktop] › tests\e2e\01-auth-flow.spec.ts:38:1 › Merchant logout clears the session and protects the dashboard (3.0s)

  9 passed (44.1s)

Exit code: 0
```

Log đầy đủ của sáu lệnh nằm tại `scratch/lint-cleanup-{merchant,lint,build,offline,local,e2e}.log` (scratch được Git ignore).

## Danh sách file thay đổi

Chỉ liệt kê file có diff nội dung và file mới của tác vụ. Không sửa/stage `docs/plans/CICD_PIPELINE_PLAN.md` có sẵn trong workspace; chưa tạo commit.

- [AI_CONTEXT.md](../../AI_CONTEXT.md)
- [apps/customer/src/App.tsx](../../apps/customer/src/App.tsx)
- [apps/customer/src/contexts/AuthContext.tsx](../../apps/customer/src/contexts/AuthContext.tsx)
- [apps/customer/src/contexts/auth-cache.ts](../../apps/customer/src/contexts/auth-cache.ts)
- [apps/customer/src/features/auth/components/AuthModal.tsx](../../apps/customer/src/features/auth/components/AuthModal.tsx)
- [apps/customer/src/features/catalog/components/MerchantReviewsView.tsx](../../apps/customer/src/features/catalog/components/MerchantReviewsView.tsx)
- [apps/customer/src/features/catalog/pages/BagDetailPage.tsx](../../apps/customer/src/features/catalog/pages/BagDetailPage.tsx)
- [apps/customer/src/features/catalog/pages/MerchantDetailPage.tsx](../../apps/customer/src/features/catalog/pages/MerchantDetailPage.tsx)
- [apps/customer/src/features/checkout/pages/CheckoutPage.tsx](../../apps/customer/src/features/checkout/pages/CheckoutPage.tsx)
- [apps/customer/src/features/checkout/pages/PaymentPage.tsx](../../apps/customer/src/features/checkout/pages/PaymentPage.tsx)
- [apps/customer/src/features/location/pages/SelectLocationPage.tsx](../../apps/customer/src/features/location/pages/SelectLocationPage.tsx)
- [apps/customer/src/features/orders/pages/OrderDetailPage.tsx](../../apps/customer/src/features/orders/pages/OrderDetailPage.tsx)
- [apps/customer/src/features/orders/pages/OrdersPage.tsx](../../apps/customer/src/features/orders/pages/OrdersPage.tsx)
- [apps/customer/src/features/profile/pages/ProfilePage.tsx](../../apps/customer/src/features/profile/pages/ProfilePage.tsx)
- [apps/customer/src/features/search/pages/SearchPage.tsx](../../apps/customer/src/features/search/pages/SearchPage.tsx)
- [apps/customer/src/hooks/useCart.ts](../../apps/customer/src/hooks/useCart.ts)
- [apps/customer/src/hooks/useCustomerCatalog.ts](../../apps/customer/src/hooks/useCustomerCatalog.ts)
- [apps/customer/src/main.tsx](../../apps/customer/src/main.tsx)
- [apps/customer/src/services/customer.service.ts](../../apps/customer/src/services/customer.service.ts)
- [apps/customer/src/services/mapbox.service.ts](../../apps/customer/src/services/mapbox.service.ts)
- [apps/customer/src/shared/components/CancelOrderModal.tsx](../../apps/customer/src/shared/components/CancelOrderModal.tsx)
- [apps/customer/src/shared/types/customer.types.ts](../../apps/customer/src/shared/types/customer.types.ts)
- [apps/customer/src/shared/types/database.ts](../../apps/customer/src/shared/types/database.ts)
- [apps/customer/src/shared/utils/bagTiming.ts](../../apps/customer/src/shared/utils/bagTiming.ts)
- [apps/customer/src/shared/utils/cancellation.ts](../../apps/customer/src/shared/utils/cancellation.ts)
- [apps/customer/src/shared/utils/errors.ts](../../apps/customer/src/shared/utils/errors.ts)
- [apps/customer/src/shared/utils/imageCompression.ts](../../apps/customer/src/shared/utils/imageCompression.ts)
- [apps/customer/src/shared/utils/validation.ts](../../apps/customer/src/shared/utils/validation.ts)
- [apps/merchant/src/App.tsx](../../apps/merchant/src/App.tsx)
- [apps/merchant/src/components/analytics/index.tsx](../../apps/merchant/src/components/analytics/index.tsx)
- [apps/merchant/src/components/bags/index.tsx](../../apps/merchant/src/components/bags/index.tsx)
- [apps/merchant/src/components/layout/AppHeader.tsx](../../apps/merchant/src/components/layout/AppHeader.tsx)
- [apps/merchant/src/components/layout/DraggableQRFab.tsx](../../apps/merchant/src/components/layout/DraggableQRFab.tsx)
- [apps/merchant/src/components/orders/CameraQRScanner.tsx](../../apps/merchant/src/components/orders/CameraQRScanner.tsx)
- [apps/merchant/src/components/orders/GlobalQRScannerModal.tsx](../../apps/merchant/src/components/orders/GlobalQRScannerModal.tsx)
- [apps/merchant/src/components/orders/index.tsx](../../apps/merchant/src/components/orders/index.tsx)
- [apps/merchant/src/components/store/index.tsx](../../apps/merchant/src/components/store/index.tsx)
- [apps/merchant/src/hooks/useAnalytics.ts](../../apps/merchant/src/hooks/useAnalytics.ts)
- [apps/merchant/src/hooks/useAuth.ts](../../apps/merchant/src/hooks/useAuth.ts)
- [apps/merchant/src/hooks/useBags.ts](../../apps/merchant/src/hooks/useBags.ts)
- [apps/merchant/src/hooks/useNotifications.ts](../../apps/merchant/src/hooks/useNotifications.ts)
- [apps/merchant/src/hooks/useOrders.ts](../../apps/merchant/src/hooks/useOrders.ts)
- [apps/merchant/src/hooks/useStoreProfile.ts](../../apps/merchant/src/hooks/useStoreProfile.ts)
- [apps/merchant/src/pages/OrderManagementScreen.tsx](../../apps/merchant/src/pages/OrderManagementScreen.tsx)
- [apps/merchant/src/pages/SettingsScreen.tsx](../../apps/merchant/src/pages/SettingsScreen.tsx)
- [apps/merchant/src/services/analytics.service.ts](../../apps/merchant/src/services/analytics.service.ts)
- [apps/merchant/src/services/auth.service.ts](../../apps/merchant/src/services/auth.service.ts)
- [apps/merchant/src/services/bag.service.ts](../../apps/merchant/src/services/bag.service.ts)
- [apps/merchant/src/services/notification.service.ts](../../apps/merchant/src/services/notification.service.ts)
- [apps/merchant/src/services/order.service.ts](../../apps/merchant/src/services/order.service.ts)
- [apps/merchant/src/services/store.service.ts](../../apps/merchant/src/services/store.service.ts)
- [apps/merchant/src/services/utils.ts](../../apps/merchant/src/services/utils.ts)
- [apps/merchant/src/types/database.ts](../../apps/merchant/src/types/database.ts)
- [apps/merchant/src/utils/bagTiming.ts](../../apps/merchant/src/utils/bagTiming.ts)
- [apps/merchant/src/utils/browser.ts](../../apps/merchant/src/utils/browser.ts)
- [apps/merchant/src/utils/errors.ts](../../apps/merchant/src/utils/errors.ts)
- [apps/merchant/src/utils/feedback.ts](../../apps/merchant/src/utils/feedback.ts)
- [apps/merchant/src/utils/validation.ts](../../apps/merchant/src/utils/validation.ts)
- [apps/web/app/api/payos/cancel-payment/route.ts](../../apps/web/app/api/payos/cancel-payment/route.ts)
- [apps/web/app/api/payos/cleanup-expired/route.ts](../../apps/web/app/api/payos/cleanup-expired/route.ts)
- [apps/web/app/components/PWAInstallModal.tsx](../../apps/web/app/components/PWAInstallModal.tsx)
- [apps/web/app/page.tsx](../../apps/web/app/page.tsx)
- [docs/CHANGELOG.md](../../docs/CHANGELOG.md)
- [docs/ROADMAP.md](../../docs/ROADMAP.md)
- [docs/TESTING.md](../../docs/TESTING.md)
- [docs/reports/ESLINT_CLEANUP_2026-11-14.md](../../docs/reports/ESLINT_CLEANUP_2026-11-14.md)
