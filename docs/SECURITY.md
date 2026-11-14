# SECURITY.md — Security Architecture & Findings

> **Status labels**: `Implemented` | `Partially Implemented` | `Missing` | `Planned`
> All claims below are strictly verified against repository source code and SQL migrations.

---

## 1. Security Controls Overview

| Control Area | Status | Evidence & Notes (`CONFIRMED`) |
| :--- | :--- | :--- |
| **Authentication (Supabase Auth)** | `Implemented` | Email/password, phone-to-email lookup (`get_email_by_phone` RPC), OAuth PKCE (`apps/customer/src/services/supabase.ts`). |
| **Database Row Level Security (RLS)** | `Implemented` | RLS enabled on all 16 `public` tables (verified via `scripts/db-inspect.mjs` snapshot `2026-10-24`) + `storage.objects` policies. |
| **PayOS Webhook Signature Verification** | `Implemented` | HMAC-SHA256 sorted-key payload verification with `crypto.timingSafeEqual` in `apps/web/app/api/payos/webhook/route.ts`. |
| **Cash Payment Block & Idempotency** | `Implemented` | `create_order_transaction` blocks `'cash'` and enforces `idempotency_keys` per user. |
| **Account Deletion Hardening** | `Implemented` | `0035_production_security_hardening.sql` revokes `PUBLIC`/`anon` execute on `delete_user_account` & `delete_user_by_identifier`; restricts cross-user deletion to `admin` or `service_role`. |
| **PayOS Serverless API Authentication** | `Missing` | `/api/payos/{create-payment,check-status,cancel-payment,cleanup-expired}` have `Access-Control-Allow-Origin: '*'` and **zero JWT / caller authorization**. |
| **Merchant RPC Ownership Enforcement** | `Partially Implemented` (Regressed) | Hardened in `0035`, **regressed in `0040_zero_vnd_order_flow.sql`**: `transition_order_status_transaction` checks customer ownership and admin role, but **omits `is_store_owner` and merchant role verification**. |
| **Server-Side Price & Discount Calculation** | `Partially Implemented` | `0040` verifies `final_amount >= total_discount_price - discount_amount`, but **trusts client-passed `p_total_discount_price` and `p_discount_amount`** without summing `surprise_bags.discount_price` or validating `vouchers.discount_value` on the server. |
| **Secret Management (Scripts & Tests)** | `Implemented` (Working Tree) / `Rotation Pending` | Hardcoded `service_role`, `DATABASE_URL`, and fallback bank details removed from `tests/`, `scripts/`, and `apps/`; scripts/tests now load `.env` via `scripts/lib/env.mjs`. Key rotation in Supabase Dashboard is still advised for Git history. |
| **Storage Upload Scoping** | `Partially Implemented` | `storage.objects` allows `INSERT`/`UPDATE` for any `authenticated` user (per DB policy inspection), without visible bucket/folder ownership checks on `storage.objects` policies. |
| **Audit Logging** | `Partially Implemented` | `admin_audit_logs` table exists with Admin-only RLS (`CONFIRMED`), but no application code writes to it yet (`INFERRED` — `apps/admin` does not exist). |
| **CI/CD Security Scanning / Dependency Audit** | `Missing` | CI quality gate exists, but Dependabot and dedicated SAST/secret scanning are not configured. CI uses local Docker credentials only. |

---

## 2. Authentication & Session Management (`CONFIRMED`)
- **PWAs**: Sessions are managed by `@supabase/supabase-js` with `persistSession: true`, `autoRefreshToken: true`, stored in `window.localStorage`. Customer app uses `flowType: 'pkce'`.
- **UI Hydration Cache**: Customer caches profile JSON in `gsf_cached_customer_user`. Merchant retains `gsf_merchant_cached_user` as a profile cache but waits for session and `public.users.role = 'merchant'` verification before granting dashboard access. Both login and session restoration reject Customer roles before calling `ensureUserStore`. This frontend guard supplements existing RLS; the RPC findings below remain unchanged.
- **Phone Login**: `get_email_by_phone(p_phone)` RPC maps a phone number to the user's email before calling `signInWithPassword`.

---

## 3. Authorization Model (`CONFIRMED`)
- **Roles (`user_role` enum)**: `'customer'`, `'merchant'`, `'admin'`.
- **RLS Policies (`public` schema)**:
  - `orders`: Customers select/insert own (`customer_id = auth.uid()`); store owners select/update orders for stores they own; admins view/update all.
  - `order_items`: Select scoped to owning customer or owning store.
  - `stores` / `surprise_bags`: Public read for active/available records; `ALL` / `UPDATE` scoped to store owner or admin.
  - `notifications`: Select/update own (`user_id = auth.uid()`).
  - `refund_requests`: Customers select own; `service_role` manages all.
  - `settlements`: Merchants read own store settlements; admins manage all.
  - `vouchers`: Public read for active vouchers (`is_hidden` added in `0041` — note: public SELECT RLS on `vouchers` may expose hidden voucher codes to direct REST queries unless restricted; `UNKNOWN` if RLS was updated outside `migrations/`).
- **`SECURITY DEFINER` Functions**: Core mutations (`place_order`, `create_order_transaction`, `transition_order_status_transaction`, `confirm_payos_payment`, `verify_pickup_qr`, `delete_user_account`) bypass RLS and must enforce authorization internally.

---

## 4. Secret Management (`CONFIRMED`)
- **Intended Pattern**: Root `.env` (gitignored) stores secrets; PWAs use `VITE_*` (`anon` key + Mapbox public token); Next.js server routes use `PAYOS_*` and `SUPABASE_SERVICE_ROLE_KEY`; Node scripts and Vitest integration suites load `.env` via [`scripts/lib/env.mjs`](../scripts/lib/env.mjs).
- **Fallback Keys in Client Code**: `apps/customer/src/services/supabase.ts` and `apps/merchant/src/services/supabase.ts` embed fallback `SUPABASE_URL` and `SUPABASE_ANON_KEY` (safe for `anon` role only if RLS + RPC security hold).
- **Historical Secret Exposure**: Hardcoded `service_role` JWTs and `DATABASE_URL` connection strings were previously committed in `tests/`, `scripts/`, and `apps/customer/scratch_transition.cjs`. All working-tree occurrences have been removed and moved to `.env`, though rotating those credentials in Supabase Dashboard remains necessary if the Git history was shared.

---

## 5. Known Security Risks & Technical Debt (`CONFIRMED`)

1. **[CRITICAL] Broken Authorization in `transition_order_status_transaction` (`0040_zero_vnd_order_flow.sql`)**:
   - Migration `0040` overwrote `transition_order_status_transaction` (`SECURITY DEFINER`, granted to `authenticated`) and removed the `is_store_owner` check on merchant actions (`preparing`, `ready_for_pickup`, `completed`, `cancelled`). Any authenticated user can pass `p_actor_role = 'merchant'` and alter any store's order status.
2. **[CRITICAL] Client-Trusted Pricing in `create_order_transaction` (`0040_zero_vnd_order_flow.sql`)**:
   - The RPC validates `p_final_amount >= p_total_discount_price - p_discount_amount`, **but both `p_total_discount_price` and `p_discount_amount` come directly from client input**. An attacker calling `place_order` RPC directly could pass `p_total_discount_price = 0, p_discount_amount = 0, p_final_amount = 0` to place 0đ orders without a voucher.
3. **[HIGH] Unauthenticated PayOS Next.js Endpoints (`apps/web/app/api/payos/*`)**:
   - `POST /api/payos/create-payment`: No Supabase JWT check, no ownership check on `orderId`, reads the payment amount from DB after 0042, and sets `Access-Control-Allow-Origin: '*'`.
   - `POST /api/payos/cancel-payment`: Any unauthenticated caller knowing an `orderId` or `orderCode` can cancel a PayOS payment link.
   - `GET/POST /api/payos/cleanup-expired`: Publicly triggerable without a cron secret/Bearer token.
   - `GET /api/payos/check-status`: Includes a self-healing direct DB update fallback (`service_role`) if RPC fails, without authenticating the caller.
4. **[HIGH] Historical `service_role` JWT & `DATABASE_URL` in Git History**:
   - Working-tree hardcoded credentials in `tests/`, `scripts/`, and `apps/customer/scratch_transition.cjs` have been removed and replaced with `.env` loading via `scripts/lib/env.mjs`. Rotation of the `service_role` JWT and DB password in Supabase Dashboard is still required if Git history is or was ever shared/public.
5. **[MEDIUM] Permissive `storage.objects` Policies & Overly Broad Grants**:
   - Any `authenticated` user can `INSERT` or `UPDATE` objects in storage (per DB policy inspection); `expire_unpaid_orders()` in `0027` was granted to `anon` as well as `authenticated`.
6. **[MEDIUM] `typescript: { ignoreBuildErrors: true }` in `apps/web/next.config.ts`**:
   - Type errors in Next.js API routes or UI are silently ignored during `next build`.
7. **[RESOLVED] Hardcoded Fallback Bank Details**:
   - `apps/web/app/api/payos/create-payment/route.ts` now preserves provider account details in the DB cache, and `apps/customer/src/features/checkout/pages/PaymentPage.tsx` no longer embeds a fallback personal bank account number.
8. **[INFO] Hidden Voucher Visibility via RLS**:
   - `vouchers` has `SELECT: Public can view active vouchers`; adding `is_hidden = true` (`0041`) without updating the RLS `SELECT` predicate allows querying `vouchers` directly via Supabase REST `anon` key to discover hidden promo codes like `TMU2026`.
