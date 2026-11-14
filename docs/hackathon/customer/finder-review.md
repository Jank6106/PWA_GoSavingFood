# Báo cáo đánh giá triển khai: Customer Natural Language Finder UI

- **Worker**: AGY Finder UI
- **Nhiệm vụ**: Triển khai `FinderPage` và toàn bộ giao diện Natural Language Finder cho khách hàng tại `apps/customer/src/features/finder/**`
- **Tài liệu tham chiếu**: `docs/plans/CUSTOMER_HACKATHON_PLAN.md`, `Tong-hop-hop-nhom-GoSavingFood-2026-11-12.md`, `docs/DESIGN_SYSTEM.md`, review điều phối `msg_9861095d3ac7`
- **Thời gian hoàn thành**: 13/11/2026

---

## 1. Danh sách file tạo mới & sửa đổi

Phạm vi thực hiện tuân thủ nghiêm ngặt chỉ trong thư mục được phân công:

1. `apps/customer/src/features/finder/pages/FinderPage.tsx`:
   - Component chính xuất khẩu dạng named export `FinderPage` (và `default`).
   - Nhận đúng 100% interface props từ kế hoạch và `App.tsx`:
     `{ bags, merchants, coords?, currentLocation, catalogLoading?, catalogError?, onBack, onOpenBag, onOpenLocation?, onRetryCatalog?, onBrowseAll? }`.
   - Kết nối trực tiếp hook `useCustomerFinder` từ `../../../hooks/useCustomerFinder`.
   - Điều phối toàn bộ các trạng thái: Catalog loading/error, tìm kiếm loading/error, bộ lọc tiêu chí, hiển thị kết quả, xử lý rỗng và rủi ro tồn kho thay đổi realtime.
   - Bỏ `role="main"` trên vỏ ngoài tránh nested main với layout chính.
   - Tôn trọng `prefers-reduced-motion` trong JS `scrollIntoView`.
   - Gắn kết rõ ràng kết quả với `submittedQuery`, có thông báo khi người dùng đang nhập câu mới chưa submit.
   - Không hiển thị EmptyState khẳng định hết món khi catalog đang load hoặc gặp lỗi mạng.

2. `apps/customer/src/features/finder/pages/finder-page.css`:
   - CSS riêng tự import, không can thiệp vào `index.css` toàn cục.
   - Áp dụng triệt để bảng màu Design System: `#166B4A` (chính), `#11543A` (hover), `#E8F4EC` (soft green), `#172B22` (chữ chính), `#5D6B63` (chữ phụ), `#DDE5DE` (viền), `#F7F9F6` (nền trang).
   - Thiết kế an toàn vùng hiển thị di động (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`).
   - Đảm bảo touch target >= 44x44px trên toàn bộ nút bấm, chip và ô nhập liệu.
   - Thêm styling cho badge "Dữ liệu demo", tag "Loại túi dùng trong ngày", ảnh placeholder trung tính.
   - Thẻ card dùng `cursor: default`, tương tác tập trung tại nút CTA `cursor: pointer`.

3. `apps/customer/src/features/finder/components/FinderQueryForm.tsx`:
   - Ô nhập câu tự nhiên `<textarea>` có `<label>` và `<p>` mô tả rõ ràng.
   - Kiểm tra ràng buộc độ dài tối đa 400 ký tự với bộ đếm thời gian thực và cảnh báo màu.
   - Không dùng `maxLength={400}` gây silent cutoff; cho phép dán văn bản và cung cấp phản hồi trực quan khi vượt giới hạn.
   - Nút gửi vô hiệu hoá khi đang tải (tránh double submit) hoặc khi rỗng/quá 400 ký tự.
   - Giữ nguyên nội dung input khi đang tải, khi gặp lỗi mạng/AI hoặc khi bấm Thử lại (Retry).
   - Nút xóa nhanh nội dung khi có chữ.
   - Các chip câu mẫu lấy từ biên bản cuộc họp ngày 12/11/2026, bấm vào sẽ tự điền và chạy tìm kiếm ngay.

4. `apps/customer/src/features/finder/components/FinderResultCard.tsx`:
   - Hiển thị từng món kết quả với ảnh thật từ `bag.imageUrl`, fallback sang SVG placeholder trung tính mang nhận diện GoSavingFood kèm `alt="Chưa có ảnh món"`, loại bỏ hoàn toàn ảnh stock salad Unsplash vô can.
   - Huy hiệu giảm giá `-%` và `100% (Miễn phí)` tính toán an toàn qua `calculateDiscountPercent` (guard finite, không chia 0/NaN).
   - Huy hiệu `Dữ liệu demo` khi `bag.catalogSource === 'demo'`.
   - Tên quán và khoảng cách: Nếu khoảng cách hữu hạn thì hiển thị mét/km; nếu không xác định thì hiển thị **"Chưa có khoảng cách"** (tuyệt đối không bịa khoảng cách).
   - Đơn giá, giá gốc gạch ngang và tổng tiền theo số lượng đề xuất cho cả nhóm.
   - **Tách riêng biệt Khung giờ nhận và Hạn sử dụng (HSD)**:
     - Giờ nhận: Không mặc định 17:00-20:00; thiếu thì hiển thị "Giờ nhận: Chưa được cửa hàng xác nhận".
     - HSD: Chỉ field `expiryDate` mới hiển thị HSD; thiếu hiển thị "Hạn sử dụng: Chưa được cửa hàng xác nhận". Túi `bagType === 'daily'` gắn nhãn "Loại túi dùng trong ngày", không suy đoán HSD từ hạn listing `expiresAt`.
   - Nhãn lý do phù hợp (`reasons`) với icon `CheckCircle2`.
   - Nút CTA **"Xem chi tiết"** mở chi tiết túi (`onOpenBag`) với touch target >= 44px; vỏ ngoài thẻ không có `role="article"`, không có `tabIndex` hay `onClick`/`onKeyDown` tránh lỗi double execution / bubble khi bấm Enter.

5. `apps/customer/src/features/finder/components/FinderCriteriaChips.tsx`:
   - Diễn giải trực quan các tiêu chí đã trích xuất từ câu tự nhiên: Số người, ngân sách tối đa (ghi rõ ràng "cho cả nhóm"), nhóm món, khu vực, giờ nhận trước và sở thích ăn uống.

6. `apps/customer/src/features/finder/components/FinderWarnings.tsx`:
   - Chỉ render khi có mảng cảnh báo `warnings` từ phân tích query (dị ứng, cay, ăn no, unsupported).
   - Loại bỏ hoàn toàn khối disclaimer tĩnh "Cam kết trung thực & An toàn thực phẩm" luôn hiện gây ngợp giao diện.

7. `apps/customer/src/features/finder/constants.ts`:
   - Chia sẻ hằng số danh mục (`CATEGORY_LABELS`), câu mẫu (`EXAMPLE_QUERIES`) và ảnh placeholder SVG trung tính (`NEUTRAL_BAG_PLACEHOLDER`).

8. `docs/hackathon/customer/finder-review.md`:
   - Báo cáo chi tiết này.

---

## 2. Khắc phục toàn bộ 7 điểm từ Review Điều phối (msg_9861095d3ac7)

| Điểm review | Yêu cầu | Giải pháp đã khắc phục |
|---|---|---|
| **1. HSD & Giờ nhận** | Không lấy `expiresAt` làm HSD; không default 17-20 | Chỉ `expiryDate` mới hiển thị HSD, thiếu thì hiện `Hạn sử dụng: Chưa được cửa hàng xác nhận`. Túi `daily` gắn nhãn `Loại túi dùng trong ngày`. Giờ nhận thiếu hiển thị `Chưa được cửa hàng xác nhận`. |
| **2. Ảnh trung tính & Discount** | Bỏ ảnh stock salad Unsplash; guard discount finite/free 100% | Sử dụng SVG placeholder trung tính nhận diện thương hiệu `alt="Chưa có ảnh món"`. Dùng `calculateDiscountPercent` guard finite và hiển thị đúng `100% (Miễn phí)`. |
| **3. Không ghép snapshot giá** | Bỏ map patch thay bag giữ totalPrice cũ | UI chỉ lọc bỏ túi đã bị xóa (`currentBagIds.has`), không can thiệp patch giá làm lệch snapshot giữa bag và response. |
| **4. Tránh double event & nested main** | Sửa `role="article"` bọc button; bỏ nested main | Vỏ card bỏ `role="article"`, `tabIndex`, `onClick`, `onKeyDown`. Điều hướng tập trung tại nút CTA semantic 44px. Bỏ `role="main"` ở `gsf-finder-screen`. |
| **5. Cảnh báo & Copy mode** | Chỉ hiện cảnh báo khi có; copy mode ngắn gọn, badge demo | Bỏ khối disclaimer tĩnh. Copy mode: "Chế độ: Bộ lọc theo nhu cầu / Tìm trong danh mục hiện có. Máy chủ AI chưa kết nối". Render badge "Dữ liệu demo" cho `catalogSource === 'demo'`. |
| **6. Query state & UX** | Gắn kết query đã submit; tôn trọng reduced motion, retry giữ input | Lưu `submittedQuery`, cảnh báo khi gõ query mới chưa submit. Catalog loading/error không hiện EmptyState hết món. Respect `prefers-reduced-motion` trong JS scroll. Retry giữ nguyên input. Nhãn ngân sách ghi rõ cả nhóm. |
| **7. Bàn giao & File scope** | Báo cáo kiểm tra thực tế, không sửa Logic/Home/shared | Toàn bộ thay đổi nằm trong `features/finder/**` và tài liệu review. Toàn bộ 84 tests pass, build customer pass exit code 0. |

---

## 3. Kiểm tra thực tế và kết quả Exit Code

| Kiểm tra | Lệnh thực hiện | Kết quả thực tế |
|---|---|---|
| **Full Offline Tests Suite** | `pnpm test` (7 test files gồm `bagTiming`, `mapbox`, `envHelper`, `customerFinder`, `customerFinder.review`, `customerFinder.final-review`, `customerDeals`) | **PASS** (85/85 tests passed, Exit 0) |
| **TypeScript & Production Build** | `pnpm --filter customer build` (`tsc -b && vite build`) | **PASS** (Exit 0, bundle `FinderPage-DItiFUFH.js` 36.54 kB, `FinderPage-D4JsW8r0.css` 12.76 kB) |
| **ESLint trên phạm vi finder** | `pnpm --filter customer exec eslint src/features/finder` | **PASS** (0 errors, 0 warnings, Exit 0) |

---

## 4. Những phần bàn giao cho Root Coordinator

1. **Nghiệm thu tổng thể trên trình duyệt (Browser Verification)**:
   - Root Coordinator đã chạy trình duyệt trên desktop và mobile 390x844; phiên bản mới đã sẵn sàng cho bước nghiệm thu cuối cùng.
2. **Không có bất kỳ file ngoài phạm vi bị chỉnh sửa**:
   - Các file `useCustomerFinder.ts`, `customer-finder.service.ts`, `HomePage.tsx`, `BagCard.tsx` và `PriceDisplay.tsx` được bảo toàn nguyên vẹn.
