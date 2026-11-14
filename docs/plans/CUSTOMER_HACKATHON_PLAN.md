# Customer hackathon — kế hoạch thực hiện

Ngày 13/11/2026. Leader: Codex. Workers: AGY qua Orca. Source: `../../../Tong-hop-hop-nhom-GoSavingFood-2026-11-12.md`. Repo triển khai: `PWA_GoSavingFood`, branch bàn giao `Hung` (phát triển trước đó trên `feat/customer-hackathon`), base `2c912c4`. Bản ZIP `PWA_GoSavingFood-master` chỉ tham khảo.

## Mục tiêu và giới hạn

Khách tìm món phù hợp ngân sách, khu vực, số người và giờ nhận; nhìn rõ giá hiện tại, tồn kho, thời gian nhận; mở chi tiết rồi dùng giỏ hàng/đặt món hiện có. Bổ sung Natural Language Finder và “Hời nhất hôm nay” vào customer PWA. Giữ identity xanh, Inter và UI primitives hiện có. Đây là mở rộng sản phẩm, không thay toàn bộ giao diện.

Chỉ thực hiện customer. Backend AI, merchant, schema, thanh toán, seed DB và deploy không thuộc đợt này. Không gọi AI trả phí hoặc thử đặt hàng thật. Endpoint AI là hợp đồng tích hợp chưa triển khai; khi chưa cấu hình phải ghi rõ “Bộ lọc”, không mô tả AI đang hoạt động. Dữ liệu catalogue hiện tại có seed/fallback; không coi đó là bằng chứng đối tác thật, không bịa khoảng cách, độ an toàn, khẩu vị hay dị ứng. Không tự động nới ngân sách/đổi danh mục để tạo kết quả.

## Kiến trúc và phân công

Các agent dùng chung checkout, quyền ghi không chồng nhau, không commit hoặc đổi branch. Root quản lý App.tsx, customer.types.ts, shared Finder contract, package/lock/install, docs chung, tích hợp và validation cuối.

| Worker | Phạm vi ghi | Đầu ra |
|---|---|---|
| AGY Finder Logic | `services/customer-finder.service.ts`, `hooks/useCustomerFinder.ts`, `tests/customerFinder.test.ts`, `docs/hackathon/customer/logic-review.md` | Parse/filter có kiểm tra budget cho cả nhóm, cửa hàng mở, stock, availability/time, khoảng cách thật; request cancellation; optional AI contract, local mode rõ ràng; offline tests |
| AGY Finder UI | `features/finder/**`, `docs/hackathon/customer/finder-review.md` | FinderPage nhập câu + ví dụ, diễn giải tiêu chí, kết quả giá/stock/pickup, loading/error/retry/empty, mở chi tiết, CSS riêng responsive |
| AGY Home | `features/home/pages/HomePage.tsx`, `features/home/components/TodayDeals.tsx`, `features/home/components/today-deals.css`, `shared/components/BagCard.tsx`, `docs/hackathon/customer/home-review.md` | Entry tìm theo nhu cầu; Hời nhất hôm nay từ catalogue, sắp theo tiết kiệm thực; bỏ khoảng cách mặc định giả; keyboard accessible |

## Contract cố định để làm song song

Types tại `shared/types/finder.types.ts`. Service exports `filterCustomerCatalog(input): FinderResponse` và `searchCustomerCatalog(input, options?: { signal?: AbortSignal }): Promise<FinderResponse>`. Hook `useCustomerFinder({ bags, merchants, coords? })` trả `{ query, setQuery, response, isLoading, error, search(queryOverride?: string): Promise<void>, reset() }`.

FinderPage props: `{ bags, merchants, coords?, currentLocation: string, catalogLoading?: boolean, catalogError?: string | null, onBack(), onOpenBag(bag), onOpenLocation?(), onRetryCatalog?(), onBrowseAll?() }`. Export named `FinderPage`. Home thêm optional `onFinder?: () => void`; fallback dùng onSearch. Root thêm route `finder` và nối callbacks. Không sửa route search/map hiện có.

AI optional: `VITE_CUSTOMER_FINDER_API_ENABLED=true` mới gọi `POST /api/ai/customer-search` qua service với Bearer access token nếu có; server chỉ trả constraints đã validate, tuyệt đối không render món/giá do model bịa. Không có config => local không network. Lỗi endpoint phải hiện lỗi, người dùng chủ động chọn bộ lọc; không fallback âm thầm. Worker logic ghi exact JSON contract.

## Cổng nghiệm thu

1. Root đọc diff thực từng worker; check layering, bounds, unknown data, no invented food-safety facts, freshness/realtime, single-store cart intact.
2. Chạy focused offline Finder tests + safe offline suites, customer TypeScript/Vite build, targeted lint; không chạy test live/audit.
3. Browser kiểm tra một lượt mobile 390px + desktop và các trạng thái chính, sau đó một lượt xác nhận sửa lỗi. Không fake báo đã thử điện thoại thật.
4. Review bằng chứng theo từng worker trong `docs/hackathon/customer/REVIEW.md`; issue trả lại worker qua Orca, không chỉ nhận summary.
5. Cập nhật CHANGELOG/AI_CONTEXT/ROADMAP theo phần thực sự hoàn thành. Tài liệu tách implemented, API integration pending, real-phone/real-AI untested.

## Tiến độ

- [x] Đọc biên bản và source; xác nhận customer đang dùng state router + hook/service, chưa có backend Finder.
- [x] Tạo branch riêng và contract/types cho workers.
- [x] Ba AGY triển khai song song trong Orca; phản hồi các vòng review bằng task follow-up.
- [x] Root ráp navigation, kiểm tra và xử lý lỗi, gồm history StrictMode và khoảng cách mét.
- [x] Review độc lập + bàn giao preview, docs và các giới hạn. 85/85 offline tests; customer build; scoped ESLint; browser 390px/1440px đã xác nhận.

Client được nghiệm thu cho local preview. Backend AI/model, điện thoại thật/PWA restart, giao dịch và deploy nằm ngoài nghiệm thu này. Bằng chứng và cách chạy lại fixture: [`REVIEW.md`](../hackathon/customer/REVIEW.md).

Mỗi worker báo file, kiểm tra thực tế, lỗi/giới hạn, rồi worker_done. Root tiếp tục khi nhận mail Orca, không polling terminal.
