# GoSavingFood (GSF) — Web & PWA Monorepo

> **Status tags**: `CONFIRMED` = verified from repository | `INFERRED` = reasoned from code | `UNKNOWN` = requires owner confirmation | `PLANNED` = intended, not implemented.

GoSavingFood is a food-rescue marketplace connecting consumers with surplus food ("Surprise Bags") from local restaurants, bakeries, cafés, and stores at discounted prices (`CONFIRMED` from `apps/web`, `apps/customer`, `apps/merchant`).

## Repository Structure

```text
.
├── apps/
│   ├── web/            # Next.js 16 Landing Page, SEO, PWA install guide, & PayOS API routes
│   ├── customer/       # React 19 + Vite Customer PWA (served under /explore/)
│   ├── merchant/       # React 19 + Vite Merchant PWA (store, bags, QR verification, orders, analytics)
│   └── admin/          # Empty directory (node_modules only, no source code yet — PLANNED/UNKNOWN)
├── packages/
│   └── ui/             # @gosavingfood/ui shared design tokens & React UI primitives
├── supabase/
│   └── migrations/     # PostgreSQL + PostGIS schema, RPCs, RLS policies, and triggers (0009–0041)
├── scripts/            # DB inspection, migration runner, storage sync, Cloudflare DNS/Worker, & E2E audit
├── tests/              # Vitest suites (auth/RPC, backend RLS/stress audit, bagTiming, mapbox)
└── docs/               # Project Memory Pack (Product, Architecture, Security, Data Model, API, ADRs)
```

## Tech Stack (`CONFIRMED`)

- **Monorepo**: `pnpm@11.13.1` workspaces + `turbo@^2.10.12`
- **Landing & Payment API (`apps/web`)**: Next.js `16.3.3` (App Router), React `19.2.8`, Tailwind CSS v4, GSAP
- **Customer PWA (`apps/customer`)**: React `19.2.8`, Vite `8.2.2`, TypeScript, `@supabase/supabase-js`, `mapbox-gl`, `qrcode.react`, `@gosavingfood/ui`
- **Merchant PWA (`apps/merchant`)**: React `19.2.8`, Vite `8.2.2`, TypeScript, `@supabase/supabase-js`, `html5-qrcode`, `@gosavingfood/ui`
- **Backend**: Supabase (PostgreSQL `17.11`, PostGIS `3.3.7`, Auth, Realtime, Storage) + Next.js Serverless PayOS API + Cloudflare Worker proxy (`api.gosavingfood.app`)
- **Testing**: Vitest `5.0.5` + custom Node E2E audit script (`scripts/comprehensive-system-audit.mjs`)

## Quick Start

### 1. Prerequisites
- Node.js (tested on Node 24 in workspace) & `pnpm` (`11.13.1`)
- Environment variables configured in root `.env` (see [`.env.example`](.env.example) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))

### 2. Install & Run Locally
```bash
pnpm install

# Run all apps in parallel
pnpm dev
# Or individually:
pnpm dev:web       # Next.js on http://localhost:3000 (proxies /explore -> :5173, /merchant -> :5174)
pnpm dev:customer  # Vite Customer PWA on http://localhost:5173/explore/
pnpm dev:merchant  # Vite Merchant PWA on http://localhost:5174
```

### 3. Build, Lint & Test
```bash
pnpm build         # Runs `turbo build` across @gosavingfood/ui, web, customer, merchant
pnpm lint          # Runs `turbo lint`
pnpm test          # Runs `vitest run` (WARNING: tests/auth-backend.test.ts & production-backend-audit.test.ts hit live Supabase!)
node scripts/comprehensive-system-audit.mjs  # End-to-end DB, Auth, RLS & Order audit against live DB
```

## Documentation Index (Project Memory Pack)

- **Start here for AI agents**: [`AI_CONTEXT.md`](AI_CONTEXT.md) & [`AGENTS.md`](AGENTS.md)
- **Product & Business Rules**: [`docs/PRODUCT.md`](docs/PRODUCT.md)
- **System Architecture**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Security & Known Risks**: [`docs/SECURITY.md`](docs/SECURITY.md)
- **Database Schema & Lifecycle**: [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md)
- **API & Supabase RPCs**: [`docs/API.md`](docs/API.md)
- **Deployment & Env Vars**: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **Design System & Testing**: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md), [`docs/TESTING.md`](docs/TESTING.md)
- **Roadmap, Decisions & History**: [`docs/ROADMAP.md`](docs/ROADMAP.md), [`docs/DECISIONS.md`](docs/DECISIONS.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md)
