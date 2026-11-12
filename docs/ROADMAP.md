# ROADMAP.md — GoSavingFood Product & Engineering Roadmap

> **Rule**: Derived strictly from repository evidence (`apps/`, `supabase/migrations/`, `scripts/`, recent commits). Items without code/issue evidence are not invented.

---

## NOW (Recently Completed / Active Stabilization — `CONFIRMED`)
- **Customer & Merchant PWA Stabilization** (`CONFIRMED` from commits `ccc457f0`, `7b8e671a`, `e4b02942`, `da0d10f6`):
  - Goal: Eliminate mobile horizontal overflow on Merchant orders, fix order detail deep-linking from notifications, re-sync hooks on `storeId` change, fix PayOS `check-status` with numeric `paymentOrderCode`, and support 0đ voucher orders (`TMU2026`).
  - Status: Merged to `master` (`396f294c`); verified with `pnpm turbo build` and `25/25` audit script (`ad98e7de`).

---

## NEXT (High-Priority Technical & Security Fixes — `INFERRED` from Audit)

1. **Fix Critical RPC & PayOS API Authorization Gaps**
   - **Goal**: Restore `is_store_owner` & merchant role validation in `transition_order_status_transaction` (`0040`), enforce server-side price/voucher calculation in `create_order_transaction`, and add Supabase JWT / cron-secret verification + restricted CORS on `apps/web/app/api/payos/*`.
   - **Status**: `Not Started` (`INFERRED` urgent technical debt).
   - **Dependencies**: New SQL migration (`0042_*`) + `apps/web` API route updates + Customer PWA sending `Authorization: Bearer` header.
   - **Technical Impact**: Prevents unauthorized order manipulation, 0đ price tampering, and unauthenticated PayOS link cancellation.

2. **Rotate Exposed `service_role` Key & Clean Up Test Scripts**
   - **Goal**: Remove hardcoded `SERVICE_KEY` / `DATABASE_URL` from `tests/` and `scripts/`, read from `.env`, and rotate keys in Supabase Dashboard.
   - **Status**: `Partially Completed` (Working-tree `tests/`, `scripts/`, and `apps/` cleaned up to read `.env` via `scripts/lib/env.mjs`; key rotation in Supabase Dashboard still pending).
   - **Dependencies**: Root `.env` / test runner config + Supabase Dashboard key rotation.
   - **Technical Impact**: Eliminates working-tree secret leakage; test/audit scripts require root `.env` or CI env vars.

3. **Modularize `apps/customer/src/services/customer.service.ts` & Remove Build Ignore**
   - **Goal**: Split the 4,956-line `customer.service.ts` by domain (`catalog`, `orders`, `profile`, `payos`) and remove `typescript: { ignoreBuildErrors: true }` from `apps/web/next.config.ts`.
   - **Status**: `Not Started`.
   - **Technical Impact**: Improves maintainability and catches type errors in Next.js API routes at build time.

---

## LATER (Longer-Term Product Capabilities — `PLANNED` / `UNKNOWN`)

1. **Admin Portal (`apps/admin`)**
   - **Goal**: Build admin UI for platform stats (`get_admin_dashboard_stats`), store approval/suspension, banner management (`banners`), issue resolution (`issues`), refund processing (`refund_requests`), and merchant payouts (`settlements`).
   - **Status**: `PLANNED` (DB schema + RLS + RPCs partially exist; `apps/admin` currently contains only `node_modules/`).
   - **Technical Impact**: Enables manual/automated settlement & refund operations currently lacking UI.

2. **Web Push Notifications (`push_subscriptions`)**
   - **Goal**: Enable background OS-level push notifications via Service Workers alongside in-app Supabase Realtime.
   - **Status**: `PLANNED` (DB table exists; VAPID keys & `sw.js` push handlers not implemented).

3. **CI/CD Pipeline & Isolated Test Database**
   - **Goal**: Add GitHub Actions (`lint`, `typecheck`, `build`, unit tests) and separate staging Supabase project so Vitest integration tests do not run against production.
   - **Status**: `PLANNED` / `UNKNOWN`.
