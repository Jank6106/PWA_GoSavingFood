# AI EDITING RULES — `apps/customer`

## 1. Scope First

* Chỉ sửa đúng **feature/page/component** được yêu cầu.
* Chỉ đọc các file nằm trong **dependency trực tiếp** của phần cần sửa.
* Không scan, refactor hoặc chỉnh sửa feature khác nếu không cần thiết.
* Nếu có thể giải quyết bằng 1 file → không tự ý sửa thêm file.

## 2. Preserve Architecture

Giữ nguyên kiến trúc:

```text
Page / Component
      ↓
Hook / Context
      ↓
Service
      ↓
API
```

* **UI** → `features/*/pages`, `features/*/components`, `shared/components`
* **State / logic dùng lại** → `hooks`
* **Auth global state** → `contexts/AuthContext.tsx`
* **API / REST** → `services/customer.service.ts`
* **Types / interfaces / enums** → `shared/types`
* **Reusable UI** → `shared/components`
* **Global CSS** → `index.css`
* **Routing / app-level flow** → `App.tsx`

Không đặt API, business logic hoặc data access trực tiếp vào UI nếu layer tương ứng đã tồn tại.

## 3. Minimal Change

> **Make the smallest change that completely satisfies the request.**

Không tự ý:

* Refactor code không liên quan.
* Đổi architecture.
* Đổi tên biến/component không cần thiết.
* Di chuyển file.
* Tạo hook/service/component mới nếu chưa cần.
* Format lại toàn bộ file.
* Thay đổi API/data model.
* Chỉnh global CSS cho một thay đổi cục bộ.
* Sửa behavior hiện tại ngoài yêu cầu.

## 4. Data Separation

Không hard-code dữ liệu nghiệp vụ nếu dữ liệu đã thuộc:

```text
API → Service → Hook/Context → UI
```

Phân biệt rõ:

```text
UI constant ≠ State ≠ Computed data ≠ API data
```

Không duplicate type, data hoặc logic đã tồn tại.

## 5. Feature Isolation

Mỗi feature phải độc lập:

```text
features/catalog/*
features/cart/*
features/checkout/*
features/orders/*
features/profile/*
...
```

Không để thay đổi ở feature A làm thay đổi behavior của feature B.

Chỉ sửa module khác khi có **dependency trực tiếp và bắt buộc**.

## 6. Shared Rules

Chỉ đưa component vào `shared/components` khi nó thực sự reusable giữa nhiều feature.

Không đưa business logic của một feature vào `shared`.

Không tạo dependency:

```text
shared → feature
```

## 7. App.tsx Rule

`App.tsx` chỉ xử lý:

* Routing / navigation
* App-level state
* Global hooks
* Global actions
* Screen rendering

Không đưa UI/business logic chi tiết của feature vào `App.tsx`.

## 8. Before Editing

Xác định:

```text
TARGET:
- Feature:
- File:
- Function/behavior:
- Direct dependencies:

FILES TO MODIFY:
- ...
```

Chỉ mở rộng phạm vi khi thực sự bắt buộc.

## 9. After Editing

Chỉ kiểm tra:

* TypeScript/import errors
* Behavior vừa thay đổi
* Direct dependencies
* Không phá behavior hiện tại

Không sửa thêm vấn đề ngoài scope.

## 10. STOP RULE

Sau khi yêu cầu đã được đáp ứng:

> **STOP. Do not continue refactoring or improving unrelated code.**

### Core Principle

```text
Understand → Scope → Minimal Change → Preserve Layers → Verify → STOP
```
