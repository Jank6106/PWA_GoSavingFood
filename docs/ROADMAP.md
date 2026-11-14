# ROADMAP.md — GoSavingFood Product & Engineering Roadmap

> **Rule**: Derived strictly from repository evidence (`apps/`, `supabase/migrations/`, `scripts/`, recent commits). Items without code/issue evidence are not invented.

---

## NOW (Recently Completed / Active Stabilization — `CONFIRMED`)
- **Customer AI integration follow-up** (`Hung`): Next.js adapter implemented using Gemini transport from Hanh, JWT/input/output validation and per-instance quota. 120 offline tests, customer build, web typecheck and scoped lint pass. Local env has placeholders for the user to supply a Gemini key; OpenAI event credit and actual provider acceptance remain pending. See [`AI_SETUP.md`](hackathon/customer/AI_SETUP.md). This supersedes the backend-pending portion of the original client-only acceptance below.
- **Customer hackathon client** (`Hung`, accepted for local preview): Home Today Deals, Finder navigation and a local rules filter are implemented; 85 offline tests, customer build, scoped lint and browser 390px/1440px pass. AI endpoint `/api/ai/customer-search`, model configuration, physical-phone restart demo and production deployment remain unverified/not implemented in this customer-only scope. Plan and acceptance evidence: [`CUSTOMER_HACKATHON_PLAN.md`](plans/CUSTOMER_HACKATHON_PLAN.md), [`REVIEW.md`](hackathon/customer/REVIEW.md).
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
   - **Status**: `PLANNED` (DB schema + RLS + RPCs partially exist; no `apps/admin` app code exists yet).
   - **Technical Impact**: Enables manual/automated settlement & refund operations currently lacking UI.

2. **Web Push Notifications (`push_subscriptions`)**
   - **Goal**: Enable background OS-level push notifications via Service Workers alongside in-app Supabase Realtime.
   - **Status**: `PLANNED` (DB table exists; VAPID keys & `sw.js` push handlers not implemented).

3. **CI/CD Pipeline & Isolated Test Database**
   - **Goal**: Add GitHub Actions (`lint`, `typecheck`, `build`, unit tests) and separate staging Supabase project so Vitest integration tests do not run against production.
   - **Status**: `PLANNED` / `UNKNOWN`.

Customer AI follow-up: user supplied the Gemini key; live primary, fallback and forced-failover tests passed. See AI_SETUP.md live verification, superseding the key-pending status above.

## OpenAI switch (2026-11-14)
Active Finder switched to OpenAI Responses API: gpt-5.4-mini -> gpt-5.4-nano. Live text and synthetic-label image tests passed for both; forced primary failure switched to Nano. No upload UI added. 136 offline tests, customer build, web typecheck/scoped lint pass. Key stays server-side; TLS verification retained with system CA store on this Windows host. Setup/evidence: docs/hackathon/customer/AI_SETUP.md. AI changes not committed/pushed.

- 2026-11-14: Customer Finder primary switched to GPT-6 Luna with GPT-5.4 mini fallback, explicit reasoning=none. Live text, synthetic-label vision and forced failover passed; no image-upload UI or production deployment added.
