# CHANGELOG.md

> Format follows Keep a Changelog. Only changes directly verified in Git history or current workspace are recorded.

## [Unreleased]

### Added
- Customer Finder uses OpenAI Responses API (gpt-5.4-mini -> gpt-5.4-nano), strict JSON Schema, no response storage, provenance and refusal handling. Both models passed text extraction, synthetic-label vision and forced-failover smoke tests; no upload UI added. See `hackathon/customer/AI_SETUP.md`.
- Customer Finder server adapter: authenticated `POST /api/ai/customer-search`, Gemini structured constraints and hedged model fallback adapted from Hanh `5dd09df`, bounded input/output and per-instance quotas. Client displays model provenance and explicit auth/provider failures; real-provider testing awaits a local key. Setup: `hackathon/customer/AI_SETUP.md`.
- Customer hackathon: Today Deals on Home, a dedicated Finder route, local Vietnamese budget/group/category/area/pickup filtering, optional server-constraints contract, and focused offline regression suites. Server AI integration and physical-device acceptance are pending; see `hackathon/customer/REVIEW.md`.
- 2026-11-14: Added a three-job GitHub Actions quality gate for lint/unit/build, isolated Docker Supabase integration, and Chromium E2E. Uses frozen pnpm installs, pnpm/build/browser caches, PR cancellation, failure artifacts retained seven days and unconditional Docker cleanup. Local configuration is generated from Docker status without Cloud secrets; E2E children retain Linux HOME/USER. See ADR-008 and the branch-protection guide in DEPLOYMENT.md.
- 2026-11-14: Added Playwright/Chromium E2E infrastructure, isolated local gateway servers, seeded Customer identities, auth/route-guard specs and a dual-context zero-VND order/Realtime/QR lifecycle. See `docs/reports/E2E_TESTING_2026-11-14.md`.
- 2026-11-13: Exported a schema-only Cloud baseline for Docker; added local compatibility adapters and synthetic prerequisite owner without copying Cloud user/order data.
- Added legacy filename mapping for 16 byte-preserved migration renames and local merchant/admin test fixtures.
- Added Docker Supabase database commands, a local test seed, and ignored `.env.test` configuration template.
- Added local and offline test commands; `pnpm test` now runs offline unit suites by default and local integration commands enforce loopback URLs.
- Project Memory Pack documentation structure (`README.md`, `AI_CONTEXT.md`, `AGENTS.md`, `docs/*.md`, `docs/adr/ADR-001..005.md`).
- Centralized root `.env` loader [`scripts/lib/env.mjs`](../scripts/lib/env.mjs) (with TypeScript declarations [`scripts/lib/env.d.ts`](../scripts/lib/env.d.ts)) and offline unit test [`tests/envHelper.test.ts`](../tests/envHelper.test.ts).

### Changed
- 2026-11-14: Switched Vercel Production AI configuration to GPT-6.1 Terra with GPT-6 Luna fallback, preserved the existing server API key and redeployed the Web backend.
- 2026-11-14: Configured Production OpenAI secrets/model chain (GPT-6 Luna, GPT-5.4 mini fallback) on Vercel Web and enabled Finder AI on Customer; both deployments READY. Verified configured health, model-key access and unauthenticated 401; no secrets committed. See docs/hackathon/customer/AI_SETUP.md.
- 2026-11-14: Integrated `master` (`798152e`) into `Hung` for PR conflict resolution, combining CI/Docker/E2E and React hook fixes with Finder routing, StrictMode-safe browser history, Mapbox fallbacks and cancelled location-search protection. Preserved both branches' documentation and ADR links. Merge validation: 137 offline tests, customer build, workspace lint and web typecheck passed; Docker/browser E2E and live providers were not rerun.
- Customer map search falls back to its searchable list when the Mapbox token is missing or the map fails to initialize/load, instead of crashing the entire app. Location selection shows a recoverable map error and keeps GPS/current-location selection usable.
- Root `pnpm test` includes Finder, coordinator regression and customer deal suites while remaining offline. Customer fallbacks carry `catalogSource: demo`, catalogue cache uses v6, and bag cards use semantic open/add controls with honest distance/image/price states.
- Customer navigation writes browser history outside state updaters, preventing StrictMode duplicate entries and incorrect Back/reload restoration. Finder preserves metre precision before display, including stores within 50 m. Local acceptance: 85 offline tests, customer build, scoped lint and browser mobile/desktop; evidence in `hackathon/customer/REVIEW.md`.
- 2026-11-14: Applied only migration 0042 to the configured Cloud DB for the user-requested Cloud-backed local dev session; verified payment RPC/cache schema and HTTP 200 on Web, Customer, Merchant and webhook health. No historical migrations were replayed.
- 2026-11-14: Fixed PayOS resume/idempotency with migration 0042: DB-reserved stable payment codes, server-priced links, exact QR/account cache, full 33-minute reservation TTL, and idempotent confirmation/refund handling. Removed browser-clock cancellation and unsafe direct status overwrite; added Docker payment regressions and browser resume coverage. Production requires applying 0042 before deploying the new API.

- 2026-11-14: Cleared Merchant ESLint debt (113 errors, 3 warnings) and existing Customer/Web diagnostics without disabling rules. Added typed database payloads and unknown-error narrowing, corrected React hook/ref usage, and moved Merchant browser utilities out of services to preserve UI layering. Verified workspace lint with zero diagnostics, all three builds, offline 14/14, Docker integration 42/42, and Playwright E2E 9/9. See `docs/reports/ESLINT_CLEANUP_2026-11-14.md` for changed files and terminal excerpts.
- Merchant startup and login now verify the server-side profile role before resolving a store; unverified local cache cannot open the dashboard. Auth event profile requests run after the SDK auth lock is released. Added explicit E2E gateway/base-path settings and kept Vitest specs separate.
- Docker acceptance: clean reset applied 42 migrations and seed; Studio HTTP 200; zero leftover test users. Workspace build passed from Turbo cache. Workspace lint failed in unchanged merchant source (113 errors, 3 warnings).
- Local Docker SMTP/OAuth configuration is isolated; production audit is explicit, and live tests bypass `.env.test`. Verified offline 14/14 and local 42/42 tests.
- Documented migration-history blockers that prevent a clean Docker database replay without changing the protected migration files.
- Extracted hardcoded `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`, and `DATABASE_URL` credentials out of `tests/` (`auth-backend.test.ts`, `production-backend-audit.test.ts`) and 13 `scripts/*.mjs` files into `.env` via `scripts/lib/env.mjs`.
- Replaced hardcoded PayOS fallback bank account/holder values in [`apps/web/app/api/payos/create-payment/route.ts`](../apps/web/app/api/payos/create-payment/route.ts) with `PAYOS_BANK_ACCOUNT` / `PAYOS_ACCOUNT_NAME` env vars, and removed the hardcoded fallback bank account from [`apps/customer/src/features/checkout/pages/PaymentPage.tsx`](../apps/customer/src/features/checkout/pages/PaymentPage.tsx).
- Replaced personal sample bank info in [`scripts/test-cancellation-lifecycle.mjs`](../scripts/test-cancellation-lifecycle.mjs) with synthetic test fixture values.
- Renamed `docs/architecture.md` -> `docs/ARCHITECTURE.md` and `docs/design-system.md` -> `docs/DESIGN_SYSTEM.md`, aligned with verified implementation.
- Updated `apps/customer/README.md` and `apps/merchant/README.md` to match current architecture.
- Redirected `scripts/db-inspect.mjs` and `scripts/show-rpc.mjs` output/input to gitignored `scratch/supabase-backend-raw.md`.

### Removed
- Cleaned up Group 2 & Group 3 unused media, dead UI components, and legacy scripts:
  - Removed unreferenced media/logo/font/QA captures in `apps/web` (`public/media/{hero.mp4,problem.mp4,problem-compatible.mp4,logo.png,logo.svg}`, `public/{logo.png,logo.svg,pwa-192x192.svg,pwa-512x512.svg}`, `app/fonts/{Manrope.ttf,Manrope-OFL.txt}`, `.impeccable/review/`) and unused `apps/merchant/public/logo.png`.
  - Removed unused UI components & CSS (`apps/customer/src/shared/components/{SearchField,StickyActions}.tsx`, `packages/ui/src/components/Badge/Chip.tsx`, and `.gsf-chip` rules in `packages/ui/src/styles/components.css`).
  - Removed 42 historical one-off migration/seed/check/ad-hoc test scripts from `scripts/`, retaining active operational, audit, deployment, and transaction-seeding tools.
- Cleaned up Group 1 unused/template/scratch files:
  - Removed `scratch/` directory (8 legacy tracked test/debug scripts and 3 untracked env backup files).
  - Removed unused Vite/Next.js starter templates (`apps/customer/src/App.css`, `apps/merchant/src/App.css`, `react.svg`, `vite.svg`, `hero.png`, `icons.svg`, `apps/customer/public/favicon.{png,svg}`, `apps/merchant/public/favicon.svg`, `apps/web/public/{file,globe,next,vercel,window}.svg`).
  - Removed duplicate `apps/customer/public/image-assets-manifest.json` (kept root [`image-assets-manifest.json`](../image-assets-manifest.json)), empty `apps/admin/` folder, and standalone `apps/web/{pnpm-lock.yaml,pnpm-workspace.yaml,tsconfig.tsbuildinfo}`.
- Removed obsolete `apps/customer/scratch_transition.cjs` containing a legacy hardcoded `service_role` key.
- Deleted obsolete, redundant, empty, and misformatted docs/rules (`docs/ai-rules.md`, `docs/integratePayOSDoc.md`, `docs/supabase-backend-raw.md`, `docs/MAPBOX_INTEGRATION.md`, `docs/GSF_Kich_Ban_Kiem_Thu_Giao_Tiep_Cus_Mer.docx`, `rules/*`, `apps/customer/docs/*`, `apps/merchant/docs/*`, `apps/web/CLAUDE.md`).

---

## Historical Milestones (`CONFIRMED` from `git log` up to `396f294c`)

### Added
- **0đ Voucher & Hidden Promo Support** (`3ad863c6`, migrations `0040`, `0041`): Added `is_hidden` on `vouchers`, seeded 100% discount code `TMU2026` (1 use/account), and auto-settled `<= 0đ` orders as `paid`/`success` bypassing PayOS.
- **Supabase Storage WebP Image Library** (`3d05f984`, `2afa48e5`, `8b2d283b`): Migrated store & bag assets to 5 public Supabase Storage buckets using direct binary WebP uploads and immutable cache headers.
- **PWA Install Guide & Mobile Safe Areas** (`09b7dd84`, `798820a0`, `4393206d`, `05c2956d`): Added Android/iOS install guide modal on `apps/web` and Dynamic Island / status-bar safe area handling in Customer & Merchant PWAs.
- **25/25 System Audit Suite** (`ad98e7de`): Added `scripts/comprehensive-system-audit.mjs` verifying zero DB orphans, 54 stores / 113+ bags, 1:1 `HANOI_BAGS` fallback sync, merchant isolation, and order/notification RLS.

### Fixed
- **Merchant Mobile Responsiveness** (`ccc457f0`): Eliminated horizontal overflow on Merchant order management screens on mobile viewports.
- **Merchant Login Store Re-Sync** (`e4b02942`): Re-synced `useStoreProfile`, `useBags`, `useOrders`, `useAnalytics` hooks when `storeId` changes on login.
- **PayOS Status Check & Order Detail Loading** (`da0d10f6`, `249af0c9`, `7b8e671a`, `427b00df`): Queried `/api/payos/check-status` with numeric `paymentOrderCode`, synchronized `supabaseUrl` fallbacks in PayOS API routes, and fixed deep-linking from notifications.
- **Merchant 1:1 Account Isolation** (`6633ddd2`): Dedicated credentials and strict 1:1 store isolation per merchant account.
- **Catalog Image & Fallback Sync** (`e0113cfd`, `4c7eadf7`): Sanitized all bag image URLs in DB and synchronized `HANOI_BAGS` fallback 1:1.

- 2026-11-14: Customer Finder primary switched to GPT-6 Luna with GPT-5.4 mini fallback, explicit reasoning=none. Live text, synthetic-label vision and forced failover passed; no image-upload UI or production deployment added.
