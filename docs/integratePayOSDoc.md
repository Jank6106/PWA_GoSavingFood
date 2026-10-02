Bạn là một senior full-stack engineer.
Tôi đã có website React + Vite đã kết nối Supabase (Supabase Auth và PostgreSQL Database), đang deploy trên Vercel. Bây giờ tôi muốn tích hợp payOS để tạo luồng hoàn chỉnh như sau:
Hồ sơ người dùng -> Ví người dùng -> Nạp tiền -> Hiện mã QR VietQR -> Thanh toán thành công -> Cộng credit vào ví người dùng -> Lưu lịch sử giao dịch -> Tiền về tài khoản ngân hàng của tôi trong payOS.

Yêu cầu bắt buộc:

1. Giữ nguyên website hiện tại, chỉ mở rộng tính năng, không làm lại toàn bộ giao diện.
2. Dùng Supabase Authentication để xác định user đang đăng nhập.
3. Dùng Supabase Database (PostgreSQL) để lưu users, wallets, paymentOrders, walletTransactions.
4. Dùng backend server-only hoặc serverless API để gọi payOS. Không bao giờ gọi payOS secret API từ frontend.
5. Tạo trang Hồ sơ hoặc Ví hiển thị: tên người dùng, email, số dư ví, tổng số tiền đã nạp, lịch sử giao dịch.
6. Tạo modal hoặc card Nạp tiền với các gói có thể chọn.
7. Khi người dùng chọn gói và bấm thanh toán:
   - gọi API create-topup-order
   - backend tạo order trong cơ sở dữ liệu với trạng thái PENDING
   - backend gọi payOS tạo payment link
   - frontend nhận checkoutUrl, paymentLinkId, qrCode và hiển thị mã QR VietQR
8. Sau khi thanh toán thành công:
   - backend xác nhận bằng webhook hoặc polling trạng thái payOS
   - cập nhật order thành PAID
   - cộng credit vào ví bằng transaction
   - ghi một record vào bảng walletTransactions
   - cập nhật totalTopup trong users
9. Giao diện phải cập nhật realtime số dư ví bằng Supabase Realtime (postgres_changes) hoặc cơ chế tương đương.
10. Không cho người dùng tự sửa balance từ frontend.
11. Thiết lập Row Level Security (RLS) trên Supabase để user chỉ đọc được dữ liệu ví, order, transaction của chính họ.
12. Sinh mã nguồn sạch, dễ hiểu, có comments ở các chỗ quan trọng.
13. Tạo file .env.example đầy đủ với các biến sau:

- VITE_SUPABASE_URL=REPLACE_WITH_YOUR_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY=REPLACE_WITH_YOUR_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_YOUR_SUPABASE_SERVICE_ROLE_KEY
- PAYOS_CLIENT_ID=REPLACE_WITH_YOUR_PAYOS_CLIENT_ID
- PAYOS_API_KEY=REPLACE_WITH_YOUR_PAYOS_API_KEY
- PAYOS_CHECKSUM_KEY=REPLACE_WITH_YOUR_PAYOS_CHECKSUM_KEY
- APP_URL=REPLACE_WITH_YOUR_WEBSITE_URL
- PAYOS_RETURN_URL=REPLACE_WITH_YOUR_RETURN_URL
- PAYOS_CANCEL_URL=REPLACE_WITH_YOUR_CANCEL_URL
- PAYOS_WEBHOOK_URL=REPLACE_WITH_YOUR_WEBHOOK_URL

14. Tạo các route/trang/components gợi ý như:

- src/pages/ProfilePage.tsx
- src/pages/WalletPage.tsx
- src/pages/PaymentResultPage.tsx
- src/components/wallet/TopupModal.tsx
- src/components/wallet/PaymentQRCode.tsx
- src/components/wallet/TransactionHistory.tsx
- src/hooks/useWallet.ts
- src/lib/payments.ts
- api/index.ts hoặc các API route server-only tương đương

15. Tạo các endpoint gợi ý:

- POST /api/create-topup-order
- GET /api/check-payos-status/:orderCode
- POST /api/payos-webhook

16. Nếu webhook payOS chưa ổn định, hãy build thêm polling fallback an toàn để hỏi trạng thái đơn hàng và chỉ cộng ví đúng 1 lần.
17. Viết actual code và nội dung file, không chỉ giải thích lý thuyết.

Ngữ cảnh dự án của tôi:

- Framework: REPLACE_WITH_FRAMEWORK_DETAILS
- Domain: REPLACE_WITH_APP_URL
- Đơn vị ví: REPLACE_WITH_CURRENCY_UNIT_OR_CREDITS
- Gói nạp tiền: REPLACE_WITH_TOPUP_PACKAGES
- Tôi muốn hiển thị lịch sử giao dịch ở: REPLACE_WITH_PROFILE_OR_WALLET_PAGE
- Tôi muốn tiền thanh toán đi về tài khoản ngân hàng đã liên kết trong payOS.

Hãy trả về:

1. Kiến trúc triển khai
2. Cấu trúc Database (PostgreSQL / Tables)
3. Supabase RLS (Row Level Security) Policies
4. .env.example
5. Code backend server-only cho payOS
6. Code frontend cho ví và lịch sử giao dịch
7. Hướng dẫn tích hợp với Vercel
8. Ghi chú bảo mật và các bẫy thường gặp
