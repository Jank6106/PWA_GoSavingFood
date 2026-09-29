# API TESTING RULES

## 1. Test từng Flow

Chỉ xử lý **1 flow tại một thời điểm**.

```text
UI → Hook/Context → Service → API → Response → State → UI
```

Test xong flow hiện tại mới chuyển sang flow tiếp theo.

## 2. Strict Scope

- Chỉ inspect/sửa các file thuộc flow và dependency trực tiếp.
- Không sửa feature khác.
- Không refactor code không liên quan.
- Không thay đổi behavior hiện tại ngoài yêu cầu.
- Nếu lỗi ở đâu → sửa **đúng layer đó**.

## 3. Khi Flow lỗi

Trace theo thứ tự:

```text
UI Action
→ Handler
→ Hook/Context
→ Service
→ Request
→ Response
→ State
→ UI
```

Tìm **root cause**, không sửa symptom.

Sau khi sửa:

```text
Test lại Flow
→ Check direct dependencies
→ STOP
```

## 4. API Optimization

Tránh:

- Duplicate API calls.
- Refetch không cần thiết.
- Fetch lại khi chỉ UI state thay đổi.
- Gọi tuần tự các request độc lập.

Ưu tiên:

```text
Reuse data
→ Update local state
→ Refetch only when necessary
```

## 5. Data Sync

Sau `POST / PUT / PATCH / DELETE` phải đảm bảo:

```text
Backend
↕
Frontend State
↕
UI
```

Kiểm tra:

- Response đúng.
- State cập nhật.
- UI cập nhật.
- Navigation/refresh không hiển thị data cũ.

## 6. API States

Mỗi flow cần xử lý:

```text
Loading
Success
Error
Empty
```

Không để request lỗi làm UI treo hoặc state sai.

## 7. Duplicate / Race Condition

Kiểm tra:

- Double click.
- Request trùng.
- Request cũ ghi đè request mới.
- Component unmount khi request đang chạy.

Chỉ dùng `AbortController`, debounce, request deduplication... khi thực sự cần.

## 8. Final Checklist

```text
[ ] Request đúng
[ ] Response đúng
[ ] Loading/Error/Empty đúng
[ ] State sync đúng
[ ] UI sync đúng
[ ] Không API call dư thừa
[ ] Không duplicate/race condition
[ ] Không ảnh hưởng flow khác
[ ] Không sửa ngoài scope
```

> **One Flow → Trace → Find Root Cause → Minimal Fix → Sync → Optimize → Regression Check → STOP**
