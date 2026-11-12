# DEPLOYMENT.md — Local Development, Build, Migrations & Hosting

> All commands and configurations verified from `package.json`, `turbo.json`, `vercel.json`, `next.config.ts`, `vite.config.ts`, and `scripts/`.

---

## 1. Local Development (`CONFIRMED`)

```bash
pnpm install

# Run all apps in parallel (via pnpm)
pnpm dev
# Or via Turborepo:
pnpm dev:turbo

# Individual apps:
pnpm dev:web       # Next.js on http://localhost:3000
pnpm dev:customer  # Vite on http://localhost:5173/explore/ (proxies /api -> :3000)
pnpm dev:merchant  # Vite on http://localhost:5174
```

- **Unified `.env`**: Both `apps/web/next.config.ts` and `apps/{customer,merchant}/vite.config.ts` load environment variables from the **monorepo root `.env`** (`envDir: '../../'`).
- **Local OAuth Callback**: `apps/web/app/auth/callback/page.tsx` detects `localhost` / LAN IPs and redirects to `http://localhost:5173/explore/`.

---

## 2. Build & Verification (`CONFIRMED`)

```bash
pnpm build         # Runs `turbo build`: builds @gosavingfood/ui -> web, customer, merchant
pnpm lint          # Runs `turbo lint` across packages
pnpm test          # Runs `vitest run`
```
- **Caveat on `apps/web` build**: `apps/web/next.config.ts` sets `typescript: { ignoreBuildErrors: true }`. Run `tsc --noEmit` inside `apps/web` manually if strict TypeScript validation is desired.
- **Caveat on `pnpm test`**: `tests/auth-backend.test.ts` and `tests/production-backend-audit.test.ts` execute live requests against production Supabase (`lblwvbedtlxjtkcuxmsf.supabase.co`). `tests/bagTiming.test.ts` and `tests/mapbox.test.ts` are pure unit tests.

---

## 3. Production Hosting & Infrastructure (`CONFIRMED`)

- **Docker**: None. No `Dockerfile` or `docker-compose.yml` exists in the repository.
- **CI/CD**: None. No `.github/workflows` or automated CI pipeline exists in the repository.
- **Vercel Deployments** (3 separate projects inferred from 3 `vercel.json` files + root `vercel.json`):
  1. **`apps/web`** (root `vercel.json` -> `pnpm --filter=web build`, output `apps/web/.next`): Primary domain **`gosavingfood.app`** (`www.gosavingfood.app` permanently redirects to apex). Rewrites `/explore/*` to `CUSTOMER_APP_URL` (`https://gsf-customer-pwa.vercel.app`) and `/merchant/*` to `MERCHANT_APP_URL` (`https://gsf-merchant-pwa.vercel.app`).
  2. **`apps/customer`** (`apps/customer/vercel.json` -> `pnpm --filter=customer build`, output `dist`): Hosted at `https://gsf-customer-pwa.vercel.app`, base path `/explore/`. Rewrites `/api/:path*` -> `https://gosavingfood.app/api/:path*`.
  3. **`apps/merchant`** (`apps/merchant/vercel.json` -> `pnpm --filter=merchant build`, output `dist`): Hosted at `https://gsf-merchant-pwa.vercel.app`.
- **Cloudflare Worker Proxy (`scripts/deploy-worker.mjs`, `scripts/cloudflare-dns.mjs`)**:
  - Worker `gsf-api-proxy` routes `api.gosavingfood.app` -> `lblwvbedtlxjtkcuxmsf.supabase.co` (`Host` header rewritten).

---

## 4. Database Migrations (`CONFIRMED`)

- Migrations reside in `supabase/migrations/` (`0009_*.sql` through `0041_*.sql`).
- Managed by custom Node runner [`scripts/db-migrate.mjs`](../scripts/db-migrate.mjs) using `DATABASE_URL` from root `.env`:
  ```bash
  node scripts/db-migrate.mjs list   # Show applied vs pending migrations (tracked in public._migrations)
  node scripts/db-migrate.mjs        # Apply pending migrations inside individual transactions
  ```
- **Rule**: SQL migration files must **NOT** contain `BEGIN;` / `COMMIT;` statements because `db-migrate.mjs` wraps each file in a transaction automatically.
- **Schema Inspection**: `node scripts/db-inspect.mjs` (used to generate raw snapshots).

---

## 5. Required Environment Variables (`.env.example`, `turbo.json`, `next.config.ts`)

Never commit actual secrets. Required variables in root `.env` / Vercel project settings:

| Variable | Scope | Purpose |
| :--- | :--- | :--- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` | Server / Scripts | Supabase admin client & PostgreSQL migration connection |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Customer & Merchant PWAs (public) | Browser Supabase client |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `apps/web` (public) | Next.js Supabase client |
| `MAPBOX_PUBLIC_TOKEN` / `VITE_MAPBOX_TOKEN` | Customer PWA (public) | Mapbox GL tiles & Search/Geocoding APIs |
| `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | `apps/web` Server Only | PayOS v2 API auth & webhook signature verification |
| `PAYOS_BANK_ACCOUNT`, `PAYOS_BANK_NAME`, `PAYOS_ACCOUNT_NAME` | `apps/web` / Config | Merchant payout bank metadata (`.env.example`) |
| `CUSTOMER_APP_URL`, `MERCHANT_APP_URL` | `apps/web` Server | Next.js rewrite targets in production |
| `VITE_API_URL`, `VITE_BASE_PATH` | Customer PWA (optional) | Override PayOS API base URL or Vite base path |
| `RESEND_API_KEY`, `RESEND_SMTP_PASS` | `.env.example` | Email / Supabase SMTP (`UNKNOWN` exact usage) |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_GLOBAL_KEY`, `CLOUDFLARE_EMAIL` | Infra scripts | Cloudflare Worker & DNS deployment (`scripts/deploy-worker.mjs`) |

---

## 6. Observability, Backup & Rollback (`CONFIRMED` / `UNKNOWN`)
- **Observability**: `console.log` / `console.warn` / `console.error` in Next.js API routes and Vite apps; no external APM/Sentry/Datadog integration found in repo (`CONFIRMED`).
- **Backup**: `UNKNOWN` (relies on Supabase Cloud managed backups; no backup scripts in repo).
- **Rollback**:
  - **App**: Vercel deployment rollback (`UNKNOWN` exact Vercel project team workflow).
  - **Database**: No down-migration scripts exist in `supabase/migrations/`. Rollback requires writing a new corrective forward SQL migration (`CONFIRMED`).
