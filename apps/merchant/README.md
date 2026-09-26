# GoSavingFood Merchant PWA

Ứng dụng quản lý dành cho đối tác cửa hàng, được xây bằng React, TypeScript và Vite.

## Kiến trúc

```text
src/
├── types/       # Data contracts
├── mocks/       # Unified demo dataset
├── services/    # API/mock adapters, không phụ thuộc React
├── hooks/       # State, computed data và mutations
├── components/  # UI theo domain
├── pages/       # Screen composition
├── App.tsx      # Auth flow và tab shell
└── index.css    # Merchant design system + responsive layout
```

Luồng dữ liệu tuân theo `Types → Services → Hooks → UI`. Túi hàng được đồng bộ sang kệ hàng thông qua subscription trong inventory service.

## Chạy ứng dụng

Từ thư mục gốc workspace:

```bash
pnpm --filter=merchant dev
pnpm --filter=merchant build
pnpm --filter=merchant lint
```

Development server mặc định chạy tại `http://localhost:5174`.

Tài khoản demo được điền sẵn trên màn hình đăng nhập. Lần đăng nhập đầu tiên sẽ đi qua wizard thiết lập cửa hàng; trạng thái hoàn thành được lưu riêng theo từng tài khoản trong local storage của trình duyệt.
