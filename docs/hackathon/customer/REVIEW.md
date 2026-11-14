# Customer — review tích hợp

Trạng thái: nghiệm thu customer client cho local preview ngày 13/11/2026, kiểm tra lại ngày 14/11/2026. Nhánh bàn giao `Hung`, phát triển trước đó trên `feat/customer-hackathon`; trạng thái push/deploy không được xác nhận bởi báo cáo này. Plan: [`CUSTOMER_HACKATHON_PLAN.md`](../../plans/CUSTOMER_HACKATHON_PLAN.md).

Review ghi bằng chứng từ diff, test/build/lint, browser mobile + desktop; các lỗi trả worker và kết quả sửa. Chưa có kết quả AI thật, điện thoại thật, checkout thật hoặc deploy trong đợt này. Các mục theo vòng bên dưới giữ lịch sử review; kết luận hiện tại ở mục nghiệm thu cuối.

## Vòng review Logic 1

Worker báo 34 test mục tiêu + tổng 48 offline pass. Root đọc service/hook và thêm `tests/customerFinder.review.test.ts`: 11 ca kiểm tra độc lập; kết quả 10 fail, 1 pass (exit 1). Chưa chấp nhận Logic.

- Pickup deadline đã qua vẫn nhận kết quả.
- Túi không có merchant trong catalogue, status expired, giá âm/NaN vẫn được đề xuất.
- Query chưa hỗ trợ trả cả catalogue, không có warning.
- `1,5 triệu` bị parse thành 15 triệu; `bún chay` thành meat.
- AI payload constraints rỗng và giờ `29:99` chưa bị từ chối.
- Hook có nguy cơ nhận snapshot catalogue cũ nếu tồn kho đổi trong lúc chờ API; cần revalidate bằng dữ liệu mới nhất khi resolve.

Trả AGY Logic sửa, chạy lại cả hai Finder suites và targeted lint. Lệnh `tsc --noEmit` từ tsconfig solution có `files: []` chưa chứng minh typecheck source: nghiệm thu dùng `tsc -b`/customer build.

## Vòng review Home/UI 1

- Browser Orca localhost:5173/explore, desktop và mobile 390x844: Home không tràn ngang (`scrollWidth=390`), entry Finder 358x56px dẫn đúng màn hình. Finder nhập query và trả danh sách qua hook; chưa nghiệm thu kết quả vì Logic đang sửa.
- `customer build` chạy thật exit 2: lỗi unused imports/process typing của Logic (đã giao worker sửa), không phải chứng cứ build toàn app pass.
- Home còn lỗi đổi merchant.distance dưới 50m thành km dù service trả mét; missing-coordinates distance có fallback 500m từ service cũ nên cần bỏ nhãn khi không có tọa độ.
- BagCard cần chặn giá Infinity/âm, trạng thái expired/archive và pickup shelf-life đã qua; discount 100% phải chính xác; không tạo button role lồng button.
- Finder UI có HSD suy từ expiresAt (thời hạn listing), tự gán giờ nhận và ảnh stock thay món; cần dùng placeholder và hiển thị chưa xác nhận khi thiếu dữ liệu. Copy không được gọi seed/fallback là dữ liệu cửa hàng thực tế đã xác minh.
- Root thêm optional catalogSource cho bag/store, tag demo cho fallback, remote cho query Supabase và đổi cache namespace v6 để nhãn nguồn không bị cache cũ che mất. Remote chỉ là nguồn dữ liệu, không chứng minh quán đối tác thật.

## Vòng review Logic 2 và khôi phục UI

- Logic đã sửa 10 lỗi vòng 1; worker cung cấp 67 offline tests, customer build và targeted lint pass. Root chưa lặp lại các lệnh đó khi chưa có thay đổi tích hợp mới.
- Review câu mẫu đầy đủ phát hiện regex category khớp `ga` trong `ngan` nên `cà phê dưới 100 ngàn` và `ngân sách 100k` bị thành meat. `quanh khu Dịch Vọng` còn giữ từ khu làm sai area match. Timeout abort chưa làm getSession pending settle. Root tái hiện bằng 4/4 fail trong `tests/customerFinder.final-review.test.ts` (fake timer, không network thật). Trả worker sửa root tests giữ nguyên.
- UI report ban đầu chưa chứa yêu cầu sửa: Orca follow-up `ctx_fbfd1da796d0` timeout ở agent_readiness, assigneeHandle/processIncarnation null, capability revoked và resource not_materialized; chưa giao được prompt. Khôi phục cùng task `task_d3e9a1763795` qua retry-of, không reset Run hay tạo task thay thế.

## Tích hợp Home sau lượt sửa

- Worker Home cung cấp 12 offline unit tests mới và báo build/lint pass; root đọc utility/card/selection thực tế, xác nhận sửa distance về mét, nhãn demo, giá hữu hạn, điều kiện thời gian và hai semantic button sibling.
- Root chuyển utility sang `shared/utils/customerDeals.ts` để BagCard dùng chung không phụ thuộc feature Home; cập nhật imports và giữ nguyên bộ test worker. Đây là điều chỉnh vị trí khi tích hợp, không đổi thuật toán.
- Root thêm tất cả suite mới vào `test:offline` để `pnpm test` tự chạy regression; cập nhật CHANGELOG, AI_CONTEXT, ROADMAP, TESTING và ADR-006. Chưa ghi nhận tổng nghiệm thu pass khi Logic/UI còn lượt sửa.
- Sau relocation và bổ sung guard giá/click theo thời gian mới nhất: root chạy `vitest run tests/customerDeals.test.ts` = 12/12 pass; targeted ESLint Home/TodayDeals/shared utility/BagCard/PriceDisplay exit 0. Chờ Logic và UI kết thúc trước lượt browser xác nhận cuối.

## Kiểm tra tích hợp Logic

- Root chạy `pnpm test` sau khi Logic sửa và Home tích hợp: 7 suites, 83/83 tests pass, exit 0. Lệnh mặc định chỉ chạy offline suites đã liệt kê, không discover live DB suites.
- Root sửa thêm đơn vị đồng tường minh: `500đ` phải là 500 VND, không nhân thành 500.000 VND. Thêm regression trong final-review suite; cần cập nhật kết quả test cuối sau thay đổi này.

## Nghiệm thu cuối — coordinator

Ba nhóm AGY đã bàn giao và sửa các finding theo phạm vi. Root đọc lại code, ráp route/hook/source metadata, giữ nguyên root regression tests. Chấp nhận customer client để preview với local rules filter; không đánh dấu AI backend hoàn thành.

| Worker | Kết quả cuối | Báo cáo riêng |
|---|---|---|
| AGY Finder Logic | Chấp nhận parser/filter, cancellation/timeout, validate contract và cập nhật catalogue | [Logic review](logic-review.md) |
| AGY Home | Chấp nhận entry Finder, TodayDeals và card giá/khoảng cách/trạng thái | [Home review](home-review.md) |
| AGY Finder UI | Chấp nhận form, kết quả, empty/error/loading và accessibility của CTA | [Finder review](finder-review.md) |

Browser phát hiện thêm hai lỗi root đã sửa:

- `push` / `openTab` ghi `window.history.pushState` trong functional state updater. React StrictMode chạy lặp updater làm nhân đôi history entry: sau Back, UI về Home nhưng history.state vẫn Finder; F5 mở Finder. Chuyển ghi history ra event handler; kiểm tra lại Home → Finder → Back → F5 vẫn Home, Forward trở lại Finder, state index tương ứng 0/1.
- Logic làm tròn khoảng cách tới 0,1 km trước khi trả kết quả, khiến 34 m thành 0 m. Giữ khoảng cách Haversine gốc, chỉ format ở UI/reason; thêm regression 34 m trong final-review suite.

| Kiểm tra coordinator | Kết quả |
|---|---|
| `pnpm test` (7 offline suites được chỉ định) | 85/85 pass, exit 0; không chạy live DB/audit suites |
| `pnpm --filter customer build` (`tsc -b && vite build`) | Pass, exit 0; có cảnh báo Mapbox chunk 1,86 MB tồn tại từ nền app |
| Scoped ESLint Finder, HomePage, TodayDeals, hook/service Finder, shared card/price/deal/types | Pass, exit 0; không tuyên bố lint toàn repo |
| `git diff --check` | Pass; chỉ cảnh báo chuẩn hóa LF/CRLF trên Windows |
| Impeccable detector (một lần) | Một warning Inter trong Finder CSS; giữ font theo design system hiện hữu và brief mở rộng app |

### Kiểm thử trình duyệt Orca

Preview chính: `http://localhost:5173/explore/`. Danh mục remote được đọc ở chế độ khách; không tạo đơn, không đăng nhập, không thanh toán. Nguồn remote không chứng minh cửa hàng là đối tác đã xác minh.

| Luồng/trạng thái | Bằng chứng quan sát |
|---|---|
| Home mobile 390×844 | `scrollWidth=390`, entry Finder rõ ràng, TodayDeals tối đa 6 túi và không còn túi hết giờ trong danh sách sau refresh/focus |
| Home → Finder → chi tiết → quay lại | CTA mở đúng bag hiện có; Enter trên CTA mở chi tiết; không nút lồng nhau trên các thẻ mới |
| Back, reload, Forward | History state khớp UI sau sửa StrictMode như mô tả trên |
| Fixture `2 người 100k` | 1 túi phù hợp: 2 × 30.000 = 60.000đ; túi chay chỉ còn 1 suất bị loại |
| Nguồn/ảnh/HSD | Badge demo hiện; ảnh lỗi dùng SVG trung tính; thiếu expiryDate hiện “Chưa được cửa hàng xác nhận”, không dùng expiresAt 2099 làm HSD |
| Snapshot query | Sửa input sang `bánh 10k` chưa submit vẫn giữ kết quả cho query đã gửi, kèm notice chỉnh sửa |
| Stock thay đổi | Chuyển quantity về 0 làm số card về 0 ngay; khôi phục catalogue đưa card trở lại |
| Loading/error/retry catalogue | Hiện đồng bộ/lỗi cụ thể, không khẳng định hết món; retry phục hồi dữ liệu |
| Giới hạn input | 401 ký tự hiện lỗi và disable submit; input rỗng disable submit |
| Semantic CTA | Enter chỉ gọi callback một lần (`Chi tiết mở: 1`), chiều cao CTA Finder 44px, `button button = 0` |
| Demo Home/distance | 2 card demo có nhãn; merchant.distance 34 được hiển thị `34 m`; Finder cũng giữ 34 m từ tọa độ |
| Responsive | Finder width/scrollWidth bằng nhau ở 390px và 1440px; không tràn ngang |
| Local mode | “Bộ lọc theo nhu cầu”; `performance` ghi 0 request `/api/ai/` trong fixture |

Fixture component độc lập ở [`tests/fixtures/customer-finder.html`](../../../tests/fixtures/customer-finder.html). Nó truyền catalogue synthetic trực tiếp vào components/hooks, không gọi DB; không được đưa vào entry production. Để chạy lại: copy file vào `apps/customer/scratch/customer-fixture.html` (đã gitignore), chạy customer dev server, mở `/explore/scratch/customer-fixture.html`. Thử inject browser cache trước đó đã bị fetch catalogue thay thế, nên lượt đó không được dùng làm bằng chứng demo; các kết quả synthetic ở trên lấy từ fixture độc lập.

Ảnh nghiệm thu: [Home mobile](evidence/home-mobile.png), [Finder QA desktop](evidence/finder-qa-desktop.png), [Finder QA mobile](evidence/finder-qa-mobile.png). Ảnh QA là dữ liệu giả lập, không phải đối tác thật.

### Phần còn lại ngoài phạm vi client

- Triển khai và bảo vệ server `/api/ai/customer-search`, cấu hình model/key và kiểm chứng AI thật. Hợp đồng JSON ở [`logic-review.md`](logic-review.md); mặc định client không gọi endpoint.
- Thử PWA trên điện thoại thật, kill/restart app, mạng thực và quyền vị trí thực. Viewport mobile trên desktop không thay thế phép thử này.
- Kiểm thử giao dịch/checkout, Supabase integration, toàn monorepo, deploy và production monitoring không chạy trong đợt customer này.
- Bộ lọc cục bộ chỉ hỗ trợ các pattern được ghi trong test; yêu cầu khẩu vị/dị ứng không được xem là chứng nhận an toàn thực phẩm.

### Follow-up 2026-11-14 — màn hình trắng trên Chrome local

- Console Chrome ghi nhận `An API access token is required to use Mapbox GL` tại `SearchPage.tsx`: local không có token, khởi tạo Mapbox trong effect ném lỗi làm React unmount toàn app. Reload có thể khôi phục route tìm kiếm từ `history.state`, nên URL vẫn là `/explore/` khi trắng.
- SearchPage bỏ khởi tạo map nếu thiếu token, chuyển sang danh sách có thông báo; lỗi constructor/load cũng có fallback. SelectLocationPage có thông báo lỗi map và vẫn giữ GPS, xác nhận vị trí, nút quay lại. Chọn gợi ý cập nhật tọa độ cả khi không có map; cleanup debounce bỏ kết quả của truy vấn cũ.
- Kiểm tra trực tiếp: Chrome bên ngoài đã hiển thị thông báo fallback và danh sách sau HMR; Orca quan sát 115 thẻ, nhập `bánh` còn 79, quay lại được; trang chọn vị trí hiện fallback, nút GPS/xác nhận; Finder `2 người dưới 100k` vẫn trả kết quả. Không tạo giao dịch.
- Validation: 85/85 offline tests, customer build exit 0, ESLint hai trang exit 0 (5 cảnh báo dependency effect có sẵn), diff check pass. Không có test tự động mới cho map lifecycle; nhánh thiếu token được nghiệm thu trình duyệt, nhánh token hợp lệ/WebGL/API lỗi chưa thử thực tế. Mapbox thật cần cấu hình public token local.
- Sau khi người dùng thêm root `.env` (2026-11-14): Vite tự restart, xác nhận client nhận public token mà không ghi giá trị ra log. Bản đồ thật tải tiles Hà Nội, 37 marker/cluster; trang chọn vị trí tải bản đồ, tìm `Dịch Vọng Hà Nội` trả gợi ý và chọn gợi ý cập nhật địa chỉ/ghim, không còn fallback. Chưa thử nhánh WebGL/API lỗi. `.env` được Git ignore; `.env.test` chưa thấy ở gốc checkout này và không chạy test DB.
- Sau đó xác định file được đặt tên `env.test`; đã đổi tên thành `.env.test` để khớp loader và được Git ignore, giữ nguyên nội dung. Không chạy test DB. Trước khi đóng gói nhánh `Hung`, chạy lại 85/85 offline tests và customer build thành công với cấu hình local hiện tại. `origin/master` đã tiến tới `798152e`; nhánh bàn giao vẫn dựa trên `2c912c4`, chưa tích hợp master mới hoặc code merchant của Hanh.

### Follow-up AI adapter (14/11)

Theo yêu cầu người dùng, chuyển thể transport Gemini từ Hanh `5dd09df` sang `apps/web/lib/ai/gemini.ts`, không merge toàn branch. Endpoint customer-search xác thực Supabase user JWT, giới hạn input/body/quota/output, hủy/deadline model, trả constraints/model và cảnh báo. UI chỉ hiện AI thành công sau response hợp lệ, giữ explicit local fallback và catalogue revalidation.

120/120 offline tests (35 mới) qua, customer build/scoped lint và web tsc/scoped lint qua. Server Next.js cổng 3000 đã chạy; health và Vite proxy 200 `configured:false`, anonymous POST 401. Trình duyệt gửi yêu cầu hiện lỗi máy chủ chưa cấu hình, không giả thành kết quả AI. Người dùng yêu cầu để trống biến key trong `.env` để tự điền; credit OpenAI BTC chưa gửi, Gemini dùng tạm. Chưa gọi model thật. Setup và giới hạn: [`AI_SETUP.md`](AI_SETUP.md). Phần AI mới chưa commit/push.

## Live verification 2026-11-14
Key Gemini do nguoi dung dien da duoc doc thanh cong. Goi that: gemini-3.5-flash-lite ~1992 ms, gemini-3.6-flash ~4503 ms; ca hai tra dung 2 nguoi / tong 100000 VND / vegetarian / 20:00. gemini-3.8-flash tra provider 503 UNAVAILABLE trong luot probe, khong ket luan model hong vinh vien. Da doi fallback thanh gemini-3.6-flash,gemini-3.8-flash trong code, env va template. Test ep model chinh khong ton tai da chuyen sang 3.6 va thanh cong ~4641 ms. Mock tests van 120/120, bao gom hedge/timeout/cancel. UI that hien AI hieu yeu cau va provenance gemini-3.5-flash-lite; khong tao giao dich. So ket qua phu thuoc catalogue va gio nhan, khong dong nghia loi AI.
Server da restart de nhan key va thu tu fallback moi. Phan AI chua commit/push.

## OpenAI switch (2026-11-14)
Active Finder switched to OpenAI Responses API: gpt-5.4-mini -> gpt-5.4-nano. Live text and synthetic-label image tests passed for both; forced primary failure switched to Nano. No upload UI added. 136 offline tests, customer build, web typecheck/scoped lint pass. Key stays server-side; TLS verification retained with system CA store on this Windows host. Setup/evidence: docs/hackathon/customer/AI_SETUP.md. AI changes not committed/pushed.
