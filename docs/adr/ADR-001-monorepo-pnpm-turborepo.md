# ADR-001: Monorepo with `pnpm` Workspaces and `Turborepo`

Status: Accepted (`CONFIRMED`)

## Context
GoSavingFood maintains three separate frontend web experiences (public Landing Page, Customer PWA, Merchant PWA) plus shared design tokens and UI primitives. Each app requires independent Vercel deployment and build pipelines while sharing UI primitives and root environment configuration.

## Decision
Use a `pnpm` workspace monorepo orchestrated by `Turborepo` with `apps/*` (`web`, `customer`, `merchant`, and planned `admin`) and `packages/*` (`ui`).

## Rationale
Allows `packages/ui` (`@gosavingfood/ui`) to be shared across apps via `workspace:*`, coordinates build order (`dependsOn: ["^build"]` in `turbo.json`), and centralizes root `.env` loading while enabling independent Vercel builds via `--filter=<app>`.

## Consequences
### Positive
- Single repository for frontend apps, SQL migrations, and audit scripts.
- Shared UI tokens and components without publishing private npm packages.
- Unified root `.env` configuration loaded by Next.js and Vite configs.

### Negative
- Root `package.json` holds backend/testing dependencies (`@supabase/supabase-js`, `pg`, `vitest`) shared with scripts.
- Requires careful Vercel `buildCommand` / `outputDirectory` configuration per project.

## Alternatives
Separate repositories per app (no direct evidence of prior multi-repo setup; `apps/web` uses Next.js while PWAs use Vite).

## Evidence
- `pnpm-workspace.yaml`
- `package.json`
- `turbo.json`
- `vercel.json`, `apps/customer/vercel.json`, `apps/merchant/vercel.json`, `apps/web/vercel.json`
