# AI_CONTEXT.md — Entry Point for All AI Agents

> **Rule**: Repository is the single source of truth. Do not rely on prior chat history.
> Labels used: `CONFIRMED` (verified in repo), `INFERRED` (derived from code), `UNKNOWN` (needs human confirmation), `PLANNED` (not implemented).

---

## 1. Product (`CONFIRMED`)
- **What it is**: GoSavingFood (GSF) is a surplus food rescue platform ("Surprise Bags") operating in Vietnam (currently seeded with Hanoi partner stores).
- **Problem solved**: Reduces daily food waste from bakeries, restaurants, cafés, and supermarkets while offering consumers food at discounted prices.
- **Primary users**:
  - **Customers** (`apps/customer`): Discover nearby stores/bags via Mapbox + PostGIS, purchase Surprise Bags online via PayOS VietQR (or 100% voucher), and pick up in-store using QR tokens.
  - **Merchants** (`apps/merchant`): Manage store profile/open status, publish daily or shelf-life Surprise Bags, process live orders, scan customer pickup QRs, and view analytics.
  - **Admins**: `UNKNOWN / PLANNED` (No `apps/admin` UI app exists yet; DB has `admin` role, `admin_audit_logs`, `settlements`, and `get_admin_dashboard_stats` RPC).
- **Core use cases**: Store/bag geo-discovery -> Checkout -> PayOS VietQR payment (or 0đ voucher) -> Merchant order preparation -> In-store QR pickup verification -> Customer review.

---

## 2. Current State & Project Snapshot (`CONFIRMED`)

### Project Snapshot
- **Last reviewed**: 2026-11-14 (customer local preview and Mapbox configuration verified)
- **Current version**: `1.0.0` (per root/app `package.json`; no Git semver tags exist)
- **Current implementation branch**: `Hung`, based on `2c912c4`; customer work was developed on `feat/customer-hackathon` and packaged on `Hung` for review. This snapshot does not establish remote push or production deployment state.
- **Production status**: `INFERRED` Active / Live (`gosavingfood.app`, `gsf-customer-pwa.vercel.app`, `gsf-merchant-pwa.vercel.app`, `api.gosavingfood.app` Cloudflare proxy, Supabase project `lblwvbedtlxjtkcuxmsf` — `UNKNOWN` exact live traffic/monitoring state)

### Working (`CONFIRMED`)
- Customer build, web typecheck and scoped lint pass; 137 offline tests pass. OpenAI Luna/Mini text, synthetic-label vision and forced-failover smoke tests pass; full monorepo build not rerun.
- Customer PWA (`apps/customer`): Email/phone & OAuth login, Mapbox search + PostGIS nearby bags/stores, cart, checkout, PayOS VietQR payment + 33-min QR cache + polling fallback, 0đ voucher flow (`TMU2026`), order tracking, notifications, reviews, account deletion.
- Merchant PWA (`apps/merchant`): 1:1 isolated merchant-store login, first-time setup wizard, bag CRUD (`daily` & `shelf_life`), order lifecycle management, HTML5 QR scanner (`verify_pickup_qr`), realtime notifications, analytics dashboard, mobile-responsive order screen.
- Landing Page (`apps/web`): Editorial landing page with GSAP animations, impact calculator, iOS/Android PWA install guide modal, standalone PWA redirect to `/explore/`, and 5 PayOS API routes.
- Database (`supabase/migrations/0009`–`0041`): PostgreSQL 17 + PostGIS 3.3.7, 16 public tables, 5 public WebP/image storage buckets, automated audit script passing 25/25 checks (`scripts/comprehensive-system-audit.mjs` verified in git history `ad98e7de`).
- Local Database Testing: Docker Supabase commands, isolated `.env.test`, offline default `pnpm test`, loopback-guarded `pnpm test:local`, and local `supabase/seed.sql` are configured. Fresh database replay remains blocked by the absence of a pre-0009 baseline and duplicate migration version prefixes; migrations `0009`–`0041` remain untouched.

### In Progress / Unfinished (`CONFIRMED`)
- **Customer hackathon**: Home Today Deals and Finder accepted for local preview. VITE_CUSTOMER_FINDER_API_ENABLED=true enables the authenticated OpenAI customer-search route on Hung. Primary gpt-6-luna, fallback gpt-5.4-mini; strict validated constraints, current catalogue results, actual model provenance. Both models passed live text and synthetic-label vision tests plus forced failover. Gemini remains inactive in source. Generic adapter supports images but Finder is text-only, no merchant upload UI added. Key stays server-side. Setup: docs/hackathon/customer/AI_SETUP.md. OpenAI integration prepared for branch Hung; production and physical-phone acceptance pending.
- Catalogue bags/stores now carry optional `catalogSource` (`remote` / `demo`); hardcoded fallbacks are tagged `demo`. `remote` identifies the data source only and does not verify merchant consent or partnership. Customer cache namespace is v6.
- **Admin Portal (`apps/admin`)**: `PLANNED` — no source files or app package exist yet (DB schema & admin RPCs partially exist).

### Known Issues & Technical Debt (`CONFIRMED`)
1. **Critical Security / Authorization Debt** (see [`docs/SECURITY.md`](docs/SECURITY.md)):
   - `apps/web/app/api/payos/{create-payment,check-status,cancel-payment,cleanup-expired}/route.ts` have `Access-Control-Allow-Origin: '*'` and **no JWT/caller authentication** (also `create-payment` trusts client-supplied `amount`).
   - Migration `0040_zero_vnd_order_flow.sql` rewrote `transition_order_status_transaction` (`SECURITY DEFINER`) and **omitted the `is_store_owner` / merchant role check** that existed in `0035`, allowing any authenticated user to invoke merchant transitions.
   - `create_order_transaction` (`0040`) trusts `p_total_discount_price` and `p_discount_amount` from the client instead of recomputing item totals and voucher discounts from DB tables.
   - Previously committed Supabase `service_role` JWT and `DATABASE_URL` credentials in Git history still require rotation in Supabase Dashboard (all hardcoded occurrences in working-tree `tests/`, `scripts/`, and `apps/` have now been moved to `.env` via `scripts/lib/env.mjs`).
2. **Build Type-Check Bypass**: `apps/web/next.config.ts` sets `typescript: { ignoreBuildErrors: true }`.
3. **Monolithic Service File**: `apps/customer/src/services/customer.service.ts` is ~4,956 lines (bundles API logic + hardcoded `HANOI_BAGS` fallback data that must stay 1:1 synced with DB).
4. **No CI/CD Pipeline**: No `.github/workflows` or automated test gate before deploy.
5. **Architecture Doc Drift (historical)**: Legacy docs claimed `react-router`, `@tanstack/react-query`, `zod`, `react-hook-form`, and `msw` — none of these are installed or used in `apps/customer` or `apps/merchant`.

### Next Recommended Work (`INFERRED`)
- Fix PayOS API route auth/CORS & `0040` RPC authorization/server-side price calculation.
- Rotate previously committed `service_role` and DB credentials in Supabase Dashboard (working-tree `tests/`, `scripts/`, and `apps/` now load credentials from `.env`).
- Split `customer.service.ts` into domain modules and remove hardcoded fallbacks where unneeded.
- Confirm roadmap for `apps/admin` and `settlements` / `refund_requests` workflows.

---

## 3. Architecture Summary (`CONFIRMED`)
- **Stack**: Monorepo (`pnpm` + `Turborepo`) -> `apps/web` (Next.js 16) + `apps/customer` (Vite/React 19) + `apps/merchant` (Vite/React 19) + `packages/ui` -> Supabase (PostgreSQL 17 + PostGIS 3.3.7) + PayOS + Mapbox.
- **Request & Deployment Topology**: `gosavingfood.app` (`apps/web` on Vercel) serves the Landing Page + `/api/payos/*` and rewrites `/explore/*` to Customer PWA (`gsf-customer-pwa.vercel.app`). Merchant PWA runs on `gsf-merchant-pwa.vercel.app` (with `/merchant` rewrite fallback). `api.gosavingfood.app` is a Cloudflare Worker proxy forwarding to Supabase.
- **Auth & Authorization**: Supabase Auth (Email/Phone-to-Email lookup via `get_email_by_phone`, OAuth PKCE for Customer) + PostgreSQL RLS + `SECURITY DEFINER` RPCs.
- **Data Flow in PWAs**: `Page / Component` -> `Custom Hook` (localStorage SWR/0ms cache + Supabase Realtime) -> `Service` -> `Supabase JS SDK / PayOS REST API`.

---

## 4. Important Decisions (Link to ADRs)
- [ADR-001](docs/adr/ADR-001-monorepo-pnpm-turborepo.md): Monorepo with `pnpm` workspaces and `Turborepo`
- [ADR-002](docs/adr/ADR-002-nextjs-gateway-and-payos-api.md): Next.js (`apps/web`) as reverse proxy gateway & PayOS server-only API host
- [ADR-003](docs/adr/ADR-003-supabase-postgresql-postgis-backend.md): Supabase (PostgreSQL + PostGIS + Auth + Realtime + Storage) as unified backend
- [ADR-004](docs/adr/ADR-004-payos-vietqr-and-zero-vnd-voucher-flow.md): PayOS VietQR online-only payments (cash disabled) + 0đ voucher fast-path
- [ADR-005](docs/adr/ADR-005-state-based-pwa-routing-and-service-layer.md): State-based SPA routing & custom Service/Hook layers (no `react-router` / TanStack Query)

---

## 5. Current Roadmap Summary (`INFERRED` / `UNKNOWN`)
- **Now**: Stabilizing Customer/Merchant PWAs, mobile responsiveness, PayOS & 0đ voucher edge cases (`CONFIRMED` from recent commits).
- **Next**: Security hardening (PayOS API auth, `0040` RPC RBAC, secret rotation), splitting `customer.service.ts` (`INFERRED` from code audit).
- **Later**: Admin dashboard (`apps/admin`), settlement payout automation, web push notifications (`PLANNED` / `UNKNOWN` — DB tables exist, UI missing).

---

## 6. AI Instructions
When working with this repository:
1. Read `AI_CONTEXT.md` (this file).
2. Read [`docs/PRODUCT.md`](docs/PRODUCT.md) for business rules and scope.
3. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for system boundaries.
4. Read relevant ADRs in `docs/adr/` and domain docs (`DATA_MODEL.md`, `API.md`, `SECURITY.md`, `DEPLOYMENT.md`) **only as needed for your task**.
5. Read [`AGENTS.md`](AGENTS.md) for strict engineering & security rules.
6. Inspect actual source files before editing; never assume docs are newer than code.
