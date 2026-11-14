# API.md — HTTP Endpoints, Supabase RPCs & External APIs

> **OpenAPI Spec**: None exists in the repository (`CONFIRMED`).
> All endpoints below are verified directly in `apps/web/app/api/**` and `apps/{customer,merchant}/src/services/**`.

---

## 1. Next.js Serverless API (`apps/web/app/api/payos/*`)

In production, `apps/customer` calls `https://gosavingfood.app/api/payos/*` (or via Vercel rewrite `/api/:path*` -> `https://gosavingfood.app/api/:path*`). Locally, Vite proxies `/api` -> `http://localhost:3000`.

| Method | Endpoint | Purpose | Auth / Authz (`CONFIRMED`) | Input | Output | Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/payos/create-payment` | Creates PayOS payment link & caches VietQR for 33m | **None** (`Missing` JWT/ownership check); CORS `*` | `{ orderId, amount, description?, items?, returnUrl?, cancelUrl? }` | `{ success, orderCode, paymentLinkId, checkoutUrl, qrCode, accountNumber, accountName, bin, amount, description }` | `400` missing fields; `500` PayOS/config error. Deduplicates concurrent `orderId` calls via in-memory `Map`. |
| `GET` | `/api/payos/check-status` | Polls PayOS `v2/payment-requests/{orderCode}` & confirms order in DB if `PAID` | **None** (`Missing` auth); CORS `*`; uses `service_role` | Query: `orderCode` (numeric `payment_order_code`) and/or `orderId` (UUID) | `{ success, status, paid, updated }` | `400` missing params or PayOS error (falls back to DB status check); `500` missing credentials. |
| `POST` | `/api/payos/webhook` | Receives PayOS payment confirmation webhooks | PayOS `signature` HMAC-SHA256 verified (`timingSafeEqual`) | `{ data: { orderCode, paymentLinkId, ... }, signature }` or `{ test: true }` | `{ success: true, result }` | `400` invalid signature or missing `orderCode`; `500` missing key / RPC error. |
| `GET` | `/api/payos/webhook` | Webhook health check | Public | None | `{ status: 'online', message, timestamp }` | — |
| `POST` | `/api/payos/cancel-payment` | Cancels an active PayOS payment link | **None** (`Missing` auth); CORS `*` | `{ orderCode?, orderId?, cancellationReason? }` | `{ success: true, status: 'CANCELLED', data }` | `400` missing IDs or PayOS non-`00`; `500` server error. |
| `GET` / `POST` | `/api/payos/cleanup-expired` | Runs `cleanup_expired_pending_orders` RPC & cancels expired PayOS links | **None** (`Missing` cron/auth header); CORS `*` | None | `{ success: true, expiredCount, cancelledPayOSCount }` | `500` RPC/DB config error. |

### Important Validation Notes
- `create-payment` strips Vietnamese diacritics from `description` and truncates to **25 ASCII characters** per PayOS limits.
- `check-status` **must receive numeric `paymentOrderCode`** (not textual `GSF-...` orderCode); if `orderCode` is omitted and `orderId` is provided, the route looks up `payment_order_code` in `orders`.

---

## 2. Supabase PostgreSQL RPCs Called by Clients (`CONFIRMED`)

Invoked via `supabase.rpc(name, params)` using `SUPABASE_ANON_KEY` + user JWT session:

| RPC Name | Caller App(s) | Purpose | Key Parameters | Auth / Security Model |
| :--- | :--- | :--- | :--- | :--- |
| `list_stores_nearby` | `customer` | Spatial store discovery via PostGIS (`ST_DWithin`, `ST_Distance`) | `p_lat, p_lng, p_radius, p_category, p_page, p_limit` | `SECURITY DEFINER`; returns active, non-deleted stores |
| `list_bags_nearby` | `customer` | Spatial active bag discovery filtering expiry & daily pickup window | `p_lat, p_lng, p_radius, p_category, p_page, p_limit` | `SECURITY DEFINER`; filters `quantity > 0`, `is_available`, VN time/date |
| `place_order` | `customer` | Auto-creates missing `public.users` row & delegates to `create_order_transaction` | `p_id, p_store_id, p_idempotency_key, p_items, p_voucher_code, p_pickup_time, p_payment_method, p_note, p_total_original_price, p_total_discount_price, p_discount_amount, p_final_amount, p_qr_code, p_recipient_name, p_recipient_phone` | Requires `auth.uid()`; blocks `'cash'`; *warning: trusts client discount/price inputs (`0040`)* |
| `transition_order_status_transaction` | `customer`, `merchant` | Advances or cancels order status, restores stock/vouchers, creates `refund_requests` | `p_order_id, p_target_status, p_actor_id, p_actor_role, p_reason?, p_bank_info?` | Requires `auth.uid()`; enforces customer ownership & admin role; **warning: merchant ownership check regressed in `0040`** |
| `verify_pickup_qr` | `merchant` | Validates customer `pickup_token` QR at store pickup | `p_token, p_store_id` | `SECURITY DEFINER` |
| `update_order_note` | `customer` | Updates order note | `p_order_id, p_note` | `SECURITY DEFINER` |
| `cleanup_expired_pending_orders` | `customer`, `apps/web` | Expires unpaid orders > TTL & restores stock/voucher | None | `SECURITY DEFINER` |
| `get_email_by_phone` | `customer`, `merchant` | Resolves phone number to login email before `signInWithPassword` | `p_phone` | `SECURITY DEFINER` |
| `create_store` | `merchant` | Creates merchant's 1:1 store with PostGIS point | `p_owner_user_id, p_name, ..., p_latitude, p_longitude, ...` | `SECURITY DEFINER` |
| `toggle_store_status` | `merchant` | Toggles `stores.is_open` | `p_store_id, p_is_open` | `SECURITY DEFINER` |
| `delete_user_account` / `delete_user_by_identifier` | `customer`, `merchant` | Hard-deletes user data across tables + `auth.users` | `p_user_id` / `p_identifier` | `0035`: Revoked from `anon`/`PUBLIC`; cross-user delete restricted to `admin`/`service_role` |

---

## 3. External Integrations (`CONFIRMED`)
- **PayOS v2 REST (`https://api-merchant.payos.vn/v2/payment-requests`)**: Authenticated with `x-client-id`, `x-api-key`, and `PAYOS_CHECKSUM_KEY` HMAC-SHA256 signatures.
- **Mapbox APIs (`apps/customer/src/services/mapbox.service.ts`)**:
  - Search Box API v1 (`https://api.mapbox.com/search/searchbox/v1/forward`) with `country=vn&language=vi`
  - Automatic fallback to Geocoding v6 & v5 (`INFERRED` from comments and code structure in `mapbox.service.ts`)
  - Mapbox GL JS vector tiles (`mapbox-gl@^3.32.0`)
- **Supabase Cloud (`lblwvbedtlxjtkcuxmsf.supabase.co` / Cloudflare Proxy `api.gosavingfood.app`)**: Direct REST (`/rest/v1/`), Auth (`/auth/v1/`), Realtime (`/realtime/v1/`), and Storage (`/storage/v1/`) via `@supabase/supabase-js`.
- **Resend SMTP (`RESEND_API_KEY`, `RESEND_SMTP_PASS`)**: Listed in `.env.example` (likely used in Supabase Auth SMTP settings — `UNKNOWN` if called from application code; no direct `resend` SDK import in `apps/`).
