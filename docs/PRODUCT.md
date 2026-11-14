# PRODUCT.md — GoSavingFood (GSF)

> **Status labels**:
> - Feature status: `EXISTING` (verified in source/DB) | `PLANNED` (schema/folders exist, UI/flow incomplete) | `IDEA` (not confirmed)
> - Epistemic tags: `CONFIRMED` | `INFERRED` | `UNKNOWN`

---

## 1. Product Vision & Problem Statement
- **Product Vision (`CONFIRMED` from `apps/web` & `apps/customer/public/manifest.json`)**: Build a food-rescue platform in Vietnam connecting food businesses with surplus end-of-day or near-expiry food ("Surprise Bags") to local consumers at discounted prices.
- **Problem Statement (`CONFIRMED` from `apps/web/app/components/ShockingReality.tsx` & `SolutionGoSavingFood.tsx`)**: Restaurants, bakeries, cafés, and supermarkets generate edible surplus food daily that would otherwise be wasted, while consumers seek affordable, quality meals.
- **Geographic Focus (`CONFIRMED` from `0036_expand_merchants_and_yindii_bags.sql` & `customer.service.ts`)**: Currently seeded and operating with **54 partner stores and 113+ Surprise Bags in Hanoi, Vietnam** (default proximity coordinates `[105.8542, 21.0285]`).

---

## 2. Target Users & Personas

| User Role | Status | Primary App | Description (`CONFIRMED` from code) |
| :--- | :--- | :--- | :--- |
| **Customer** | `EXISTING` | `apps/customer` (`/explore/`) | Consumers browsing nearby Surprise Bags, purchasing via VietQR/voucher, and picking up in-store using a QR token. |
| **Merchant (Store Partner)** | `EXISTING` | `apps/merchant` | 1:1 store owner managing store status, Surprise Bag listings/stock, order fulfillment, QR pickup verification, and revenue analytics. |
| **Platform Admin** | `PLANNED` | `apps/admin` (chưa tạo app) | DB schema defines `user_role = 'admin'`, `admin_audit_logs`, `settlements`, and `get_admin_dashboard_stats()`, but no Admin frontend exists in the repo (`CONFIRMED`). |

- **Detailed Marketing Personas (`UNKNOWN`)**: Specific demographic/marketing persona profiles are not documented in source code.

---

## 3. Core Use Cases (`EXISTING`, `CONFIRMED`)

1. **Discover Surplus Food Nearby**: Customer grants GPS or picks an address via Mapbox Search -> queries PostGIS (`list_stores_nearby`, `list_bags_nearby`) by radius & category -> views store/bag details and reviews.
2. **Purchase Surprise Bag (VietQR or 0đ Voucher)**: Customer adds bags from a store to cart -> selects pickup time & enters recipient name/phone -> optionally applies voucher (including hidden 100% promo codes like `TMU2026`) -> places atomic order (`place_order` RPC) -> pays via PayOS VietQR (or auto-completes payment if `final_amount <= 0`).
3. **Order Fulfillment & QR Pickup**: Paid order notifies Merchant in realtime -> Merchant moves order through `paid` -> `preparing` -> `ready_for_pickup` -> Customer shows `pickup_token` QR -> Merchant scans QR via `html5-qrcode` (`verify_pickup_qr` RPC) -> order completes.
4. **Cancellation, Expiration & Refund Tracking**:
   - Unpaid orders expire after **33 minutes** (30 min + 3 min buffer, capped at `pickup_end + 5 minutes` for daily bags) via lazy cleanup on new orders, frontend cleanup, or `pg_cron` (`expire_unpaid_orders`).
   - Paid orders cancelled by customer before `preparing` (or cancelled by merchant with required reason) restore stock/voucher and insert a `refund_requests` record (for `final_amount > 0`).
   - Paid `ready_for_pickup` orders where customer fails to show up 15 minutes past `pickup_end` auto-expire (`expire_noshow_orders`), restoring dry-food stock while retaining merchant revenue (`0032_dry_food_inventory_lifecycle.sql`).
5. **Store & Bag Management (Merchant)**: First-time onboarding setup wizard -> open/close store toggle -> create/edit/pause `daily` (recurring time-window) or `shelf_life` (expiry-date) bags -> view revenue analytics & notifications.

---

## 4. Core Features Breakdown

### Existing Features (`EXISTING`, `CONFIRMED`)
- **Web Landing (`apps/web`)**: Editorial scroll storytelling, impact calculator, partner showcase, Android/iOS PWA installation guide modal (`PWAInstallModal.tsx`), standalone PWA auto-redirect to `/explore/`.
- **Customer PWA (`apps/customer`)**:
  - Email/Phone + Password login (`get_email_by_phone`), Google/OAuth PKCE login, profile completion enforcement (name + 10-digit VN phone), account deletion (`delete_user_account`).
  - Mapbox Search Box v1 + Geocoding v6/v5 fallback, PostGIS spatial search, brand & category filters (`bakery`, `beverage`, `vegetarian`, `meat`, `seafood`, `raw_food`, `other`).
  - Single-store cart, checkout, PayOS VietQR QR display & 33-minute QR reuse cache, realtime + polling payment verification, hidden/public vouchers, order history, cancellation modal with bank info for refunds, store rating & reviews.
- **Merchant PWA (`apps/merchant`)**:
  - Dedicated 1:1 merchant account-to-store isolation, first-time setup wizard (`FirstTimeSetupScreen`).
  - Surprise Bag management (`daily` vs `shelf_life` bags, image upload to Supabase Storage with client compression).
  - Live order board with audio/modal notifications, mandatory cancellation reason, camera QR pickup scanner (`OrderManagementScreen` + `DraggableQRFab`).
  - Store settings (open/close status, hours, GPS location update) & revenue/order analytics (`AnalyticsScreen`).

### Planned / Incomplete Features (`PLANNED`)
- **Admin Dashboard (`apps/admin`)**: Not created yet; DB already contains `admin_audit_logs`, `settlements`, `banners`, `issues`, `refund_requests`, and `get_admin_dashboard_stats()` RPC, but no UI exists.
- **Web Push Notifications (`PLANNED`)**: `push_subscriptions` table and RLS exist in PostgreSQL (`CONFIRMED`), but `apps/customer` and `apps/merchant` currently use Supabase Realtime + in-app `notifications` table rather than active VAPID Web Push subscription flows (`INFERRED` — no VAPID key in `.env.example` or push registration in `sw.js`).
- **Merchant Settlements & Refund Disbursement UI (`PLANNED`)**: `settlements` and `refund_requests` tables exist in DB; payout/refund execution UI is `Missing` / `UNKNOWN`.
- **Customer Issue Reporting UI (`PLANNED`)**: `issues` table and `issue_status`/`reporter_role` enums exist in DB; UI integration status is `UNKNOWN / Not verified in frontend`.

---

## 5. Business Rules (`CONFIRMED` from SQL Migrations & Source Code)

1. **Cash Payments Prohibited**: `create_order_transaction` (`0040`) raises `CASH_PAYMENT_NOT_SUPPORTED` if `p_payment_method = 'cash'`. Only online PayOS VietQR (`payos_vietqr` / `banking` / `momo` / `zalopay` normalized enum) or 0đ voucher orders are allowed.
2. **Bag Lifecycle Types (`0032`, `0040`)**:
   - `daily`: Must be ordered within `[pickup_start, pickup_end]` in timezone `Asia/Ho_Chi_Minh`. Unsold stock resets/cycles via `cron_daily_bag_cycle`.
   - `shelf_life`: Valid until `expiry_date >= current VN date`; not restricted by daily `pickup_start`/`pickup_end` ordering windows.
   - `auto_deactivate_bag` trigger: Automatically sets `is_available = false, status = 'sold_out'` when `quantity <= 0`, and reactivates to `active` when `quantity > 0` (unless `archived` or soft-deleted).
3. **Payment Expiration & Buffer (`0026`, `0040`)**: Default payment TTL is **33 minutes** (30 min UI window + 3 min grace buffer). For `daily` bags, deadline is capped at `pickup_end + 5 minutes` if earlier.
4. **Cancellation & Refund Policy (`0029`, `0040`)**:
   - Customers can cancel only in `pending_payment` or `paid` states (blocked once `preparing` or `ready_for_pickup`).
   - Merchants must supply a non-empty `cancel_reason`.
   - Cancelling a paid order (`final_amount > 0`) sets `payment_status = 'refund_pending'` and inserts a row into `refund_requests`; 0đ orders skip `refund_requests` and set `payment_status = 'refunded'`.
5. **No-Show Dry-Food Policy (`0032`)**: Orders in `ready_for_pickup` > 15 minutes past `pickup_end` expire automatically; stock is returned to `surprise_bags` (dry food policy), while payment/revenue stays with the merchant.
6. **Vouchers (`0040`, `0041`)**: One active non-cancelled/non-expired use per customer account per `voucher_code`; `is_hidden = true` vouchers (e.g., `TMU2026`, 1,000,000đ fixed discount) require manual code entry.
7. **Merchant 1:1 Isolation (`comprehensive-system-audit.mjs`, `auth.service.ts`)**: Each merchant account owns 1 store via `stores.owner_user_id`.

---

## 6. Out of Scope & Constraints
- **Out of Scope (`CONFIRMED`)**: Cash-on-pickup (`cash` blocked in RPC), offline order/payment queuing (`sw.js` enforces NetworkOnly for Supabase).
- **Constraints (`CONFIRMED`)**:
  - PayOS descriptions max 25 ASCII characters (`create-payment/route.ts`).
  - PayOS `orderCode` must be a numeric integer (not textual `GSF-...` code).
  - Storage upload bucket limit is 5 MB (`5242880` bytes), images only (`png`, `jpeg`, `webp`, `gif`).
- **Success Metrics (`UNKNOWN`)**: Business KPIs / conversion targets are not defined in the repository.
