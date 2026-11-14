# Báo cáo kỹ thuật — AGY Home Review (Hackathon Customer - Cập nhật lần 2)

- **Worker**: AGY Home
- **Branch**: `feat/customer-hackathon`
- **Thời gian hoàn thành**: 13/11/2026
- **Phạm vi file phụ trách & bổ sung**:
  - `apps/customer/src/features/home/pages/HomePage.tsx`
  - `apps/customer/src/features/home/components/TodayDeals.tsx`
  - `apps/customer/src/features/home/components/today-deals.css`
  - `apps/customer/src/features/home/components/today-deals.utils.ts` (File tiện ích mới)
  - `apps/customer/src/shared/components/BagCard.tsx`
  - `apps/customer/src/shared/components/PriceDisplay.tsx`
  - `tests/customerDeals.test.ts` (Bộ unit test mới)
  - `docs/hackathon/customer/home-review.md`

---

## 1. Chi tiết khắc phục theo phản hồi Review Home 1

### 1.1. Chuẩn hóa khoảng cách mét & Nhận diện dữ liệu Demo
- **Xóa bỏ heuristic sai**: Đã loại bỏ hoàn toàn điều kiện `distance < 50 => * 1000`. `customer.service` luôn trả `distance` theo mét; khoảng cách 34m nay hiển thị chính xác là `34 m` (thay vì bị nhân nhầm thành 34km).
- **Chặn toạ độ giả**: Nếu cửa hàng thiếu toạ độ hợp lệ (`latitude`, `longitude` không finite, ngoài phạm vi hoặc `[0, 0]`), hệ thống ẩn khoảng cách (`''`) nhằm ngăn chặn dữ liệu fallback 500m giả trước đây.
- **Minh bạch dữ liệu Demo**:
  - `BagCard`: Render badge `Dữ liệu demo` khi `bag.catalogSource === 'demo'`.
  - `TodayDeals`: Tự động hiển thị banner thông báo minh bạch khi danh mục có chứa dữ liệu demo: *"Danh mục hiển thị bao gồm dữ liệu demo để thử nghiệm tính năng, không đại diện đối tác thực tế."*

### 1.2. Thẩm định giá (Price checks), 0đ => 100% & Khả năng đặt hàng (Orderability)
- **Kiểm tra số hữu hạn**: Sử dụng `Number.isFinite`, chặn giá âm, `NaN`, `Infinity`, và giá bán cao hơn giá gốc.
- **Tách biệt giá hợp lệ và tỷ lệ giảm**:
  - `0đ` giảm giá từ giá gốc $> 0$ được tính là `100%` (không clamp 99).
  - Khi `discountPrice === originalPrice`: Được coi là giá hợp lệ nhưng không hiển thị badge giảm giá.
- **`PriceDisplay` an toàn**:
  - Khi giá không hợp lệ (`!Number.isFinite` hoặc âm), render *"Giá chưa xác nhận"* kèm thuộc tính `aria-disabled="true"`.
- **`canOrderNow` trong `BagCard`**:
  - Chặn triệt để giá âm/NaN/Infinity.
  - Chặn trạng thái `expired`, `archived`, `sold_out`.
  - Chặn bài đăng đã hết hạn niêm yết (`isListingExpired(bag.expiresAt)`).
  - **Khung giờ nhận**: Cả hàng daily lẫn shelf-life nếu hôm nay đã quá giờ nhận (`isPickupPastToday`) đều bị vô hiệu hóa đặt hàng ngay hôm nay.

### 1.3. Tính toán HSD & Khung giờ nhận theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
- **Múi giờ UTC+7**: Hàm `getNowVietnam()` trích xuất chính xác năm, tháng, ngày, giờ, phút theo múi giờ Việt Nam.
- **Validate ngày/giờ thực tế**:
  - HSD định dạng `YYYY-MM-DD`: Validate tháng 1–12, số ngày hợp lệ theo từng tháng (bao gồm năm nhuận).
  - Giờ nhận định dạng `HH:mm`: Regex `^([01]\d|2[0-3]):([0-5]\d)$`, phạm vi 00:00–23:59.
- **Tái đánh giá theo thời gian thực (Bounded tick + Focus)**:
  - Khối `TodayDeals` thiết lập timer local 30s (`setInterval`) cùng lắng nghe sự kiện `window focus` và `document visibilitychange`.
  - Khi đồng hồ bước qua giờ đóng nhận hàng hoặc khi khách quay lại app, danh sách tự động re-evaluate và gỡ bỏ món hết giờ ngay lập tức mà không cần gọi network request.

### 1.4. Semantic Accessibility & Touch Target $\ge 44\text{px}$
- **Loại bỏ vi phạm lồng nút**: Xóa bỏ thuộc tính `role="button"` và `tabIndex` trên thẻ `<article>` cha của `BagCard`.
- **Nút hành động mở chi tiết dạng sibling**: Sử dụng `<button type="button" className="customer-bag-card-action" />` phủ diện tích thẻ (với `z-index: 1`), nút thêm vào giỏ (`customer-bag-add-btn`) nằm ở `z-index: 2` cùng cấp. Screen reader đọc đúng cấu trúc HTML, phím Tab điều hướng tuần tự và phím Enter/Space hoạt động chính xác.
- **Vùng chạm (Hit Area) $\ge 44\text{px}$**:
  - Nút thêm vào giỏ (`customer-bag-add-btn`) tích hợp `::before` expander đảm bảo diện tích chạm tối thiểu $44 \times 44\text{px}$ trên thiết bị di động.
  - Nút cuộn danh mục (`today-deals-nav-btn`) trên desktop có kích thước chuẩn $44 \times 44\text{px}$.

### 1.5. Chuẩn hóa thuật ngữ & Trạng thái Empty
- Sử dụng nhất quán thuật ngữ **"túi giải cứu"** (thay thế toàn bộ "túi cứu trợ").
- Ảnh lỗi fallback sử dụng SVG placeholder trung tính mang nhận diện thương hiệu GoSavingFood với nhãn *"Hình minh họa túi giải cứu"*.
- Thông điệp khi không có ưu đãi: *"Chưa có ưu đãi phù hợp mở bán hôm nay. Các ưu đãi giá tốt sẽ xuất hiện khi cửa hàng đăng túi giải cứu trong khung giờ nhận. Vui lòng quay lại sau bạn nhé!"* (Không tự khẳng định lịch đăng của quán khi chưa có nguồn).

---

## 2. Bằng chứng kiểm tra thực tế (Real Verification Evidence)

### 2.1. Unit Test chuyên biệt (`tests/customerDeals.test.ts`)
- **Lệnh thực thi**:
  ```bash
  pnpm vitest run tests/customerDeals.test.ts
  ```
- **Exit code**: `0`
- **Kết quả**: `12/12 passed (100%)`
  - Đạt: Định dạng 34 mét thành `"34 m"`, 500 mét thành `"500 m"`, 1540 mét thành `"1.5 km"`.
  - Đạt: Ẩn khoảng cách khi thiếu toạ độ, toạ độ `[0, 0]` hoặc toạ độ invalid.
  - Đạt: Chặn giá âm, NaN, Infinity; tính đúng `0đ => 100%`.
  - Đạt: Thẩm định HSD và giờ nhận theo giờ Việt Nam.
  - Đạt: Chặn `canOrderBag` khi hàng shelf-life quá khung giờ nhận hôm nay.
  - Đạt: Xếp hạng ưu đãi giảm giá sâu nhất từ cửa hàng đang mở.

### 2.2. Offline Test hiện hữu (`tests/bagTiming.test.ts`)
- **Lệnh thực thi**:
  ```bash
  pnpm vitest run tests/bagTiming.test.ts
  ```
- **Exit code**: `0`
- **Kết quả**: `6/6 passed (100%)`

### 2.3. Linter (ESLint)
- **Lệnh thực thi**:
  ```bash
  cd apps/customer && npx eslint src/features/home/pages/HomePage.tsx src/features/home/components/TodayDeals.tsx src/features/home/components/today-deals.utils.ts src/shared/components/BagCard.tsx src/shared/components/PriceDisplay.tsx
  ```
- **Exit code**: `0`
- **Kết quả**: 0 warnings, 0 errors.

### 2.4. TypeScript Compilation & Full Customer Build
- **Lệnh thực thi**:
  ```bash
  node apps/customer/node_modules/typescript/bin/tsc -p apps/customer/tsconfig.app.json --noEmit
  pnpm --filter customer build
  ```
- **Exit code**: `0`
- **Kết quả**: `tsc -b && vite build` hoàn thành trong **2.58s**, sinh đầy đủ production bundle sạch sẽ.

---

## 3. Bàn giao & Tiếp nhận
- Toàn bộ 6/6 phản hồi từ Review Home 1 đã được giải quyết triệt để và kiểm chứng bằng code/test thực tế.
- Build production của `apps/customer` đã sẵn sàng để Root tiến hành browser test và tích hợp cuối cùng.
