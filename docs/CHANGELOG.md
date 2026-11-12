# CHANGELOG.md

> Format follows Keep a Changelog. Only changes directly verified in Git history or current workspace are recorded.

## [Unreleased]

### Added
- Project Memory Pack documentation structure (`README.md`, `AI_CONTEXT.md`, `AGENTS.md`, `docs/*.md`, `docs/adr/ADR-001..005.md`).
- Centralized root `.env` loader [`scripts/lib/env.mjs`](../scripts/lib/env.mjs) (with TypeScript declarations [`scripts/lib/env.d.ts`](../scripts/lib/env.d.ts)) and offline unit test [`tests/envHelper.test.ts`](../tests/envHelper.test.ts).

### Changed
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
