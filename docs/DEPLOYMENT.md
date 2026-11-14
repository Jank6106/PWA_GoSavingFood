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
pnpm test          # Offline unit suites only
```
- **Caveat on `apps/web` build**: `apps/web/next.config.ts` sets `typescript: { ignoreBuildErrors: true }`. Run `tsc --noEmit` inside `apps/web` manually if strict TypeScript validation is desired.
- Run backend integration with `pnpm test:local`; Cloud verification is explicit via `pnpm test:live` or `pnpm test:audit`.

---

## 3. Production Hosting & Infrastructure (`CONFIRMED`)

- **Docker**: Supabase CLI manages the local test stack; production hosting remains Vercel/Supabase Cloud.
- **CI/CD**: `.github/workflows/ci.yml` implements the CI quality gate described below. Required checks must also be enabled in GitHub repository settings.
- **Vercel Deployments** (3 separate projects inferred from 3 `vercel.json` files + root `vercel.json`):
  1. **`apps/web`** (root `vercel.json` -> `pnpm --filter=web build`, output `apps/web/.next`): Primary domain **`gosavingfood.app`** (`www.gosavingfood.app` permanently redirects to apex). Rewrites `/explore/*` to `CUSTOMER_APP_URL` (`https://gsf-customer-pwa.vercel.app`) and `/merchant/*` to `MERCHANT_APP_URL` (`https://gsf-merchant-pwa.vercel.app`).
  2. **`apps/customer`** (`apps/customer/vercel.json` -> `pnpm --filter=customer build`, output `dist`): Hosted at `https://gsf-customer-pwa.vercel.app`, base path `/explore/`. Rewrites `/api/:path*` -> `https://gosavingfood.app/api/:path*`.
  3. **`apps/merchant`** (`apps/merchant/vercel.json` -> `pnpm --filter=merchant build`, output `dist`): Hosted at `https://gsf-merchant-pwa.vercel.app`.
- **Cloudflare Worker Proxy (`scripts/deploy-worker.mjs`, `scripts/cloudflare-dns.mjs`)**:
  - Worker `gsf-api-proxy` routes `api.gosavingfood.app` -> `lblwvbedtlxjtkcuxmsf.supabase.co` (`Host` header rewritten).

---

## 4. Local Docker Database (`CONFIRMED`)

```bash
pnpm db:start    # Start Supabase services in Docker
pnpm db:status   # Show local URLs and keys
pnpm db:reset    # Recreate the local database, apply migrations, and load supabase/seed.sql
pnpm db:stop
```

Create the ignored root `.env.test` from `.env.test.example`, then copy the local anon and service-role keys from `pnpm db:status`. Local integration tests use this file before `.env` when `NODE_ENV=test` or `USE_LOCAL_DB=true`; values already exported by the shell still take precedence. `pnpm test:local` checks that API and database URLs are loopback hosts before it runs.

Fresh local databases replay `0000_baseline_schema.sql`, historical migrations, then `seed.sql`. Renumbering preserves SQL bytes and lexical order. The custom Cloud runner recognizes old filenames through `supabase/migration-renames.json` and skips the bootstrap snapshot on existing databases. Never repair or renumber Cloud migration history to match the local CLI ledger.

Local SMTP uses Mailpit (54324), and external Google OAuth is disabled in the local config. If pnpm is absent from PATH, use `corepack.cmd pnpm` on Windows. Studio: http://localhost:54323.

## 5. Database Migrations (`CONFIRMED`)

- Migrations reside in `supabase/migrations/` (`0009_*.sql` through `0041_*.sql`).
- Managed by custom Node runner [`scripts/db-migrate.mjs`](../scripts/db-migrate.mjs) using `DATABASE_URL` from root `.env`:
  ```bash
  node scripts/db-migrate.mjs list   # Show applied vs pending migrations (tracked in public._migrations)
  node scripts/db-migrate.mjs        # Apply pending migrations inside individual transactions
  ```
- **Rule**: SQL migration files must **NOT** contain `BEGIN;` / `COMMIT;` statements because `db-migrate.mjs` wraps each file in a transaction automatically.
- **Schema Inspection**: `node scripts/db-inspect.mjs` (used to generate raw snapshots).

---

## 6. Required Environment Variables (`.env.example`, `turbo.json`, `next.config.ts`)

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

## 7. Observability, Backup & Rollback (`CONFIRMED` / `UNKNOWN`)
- **Observability**: `console.log` / `console.warn` / `console.error` in Next.js API routes and Vite apps; no external APM/Sentry/Datadog integration found in repo (`CONFIRMED`).
- **Backup**: `UNKNOWN` (relies on Supabase Cloud managed backups; no backup scripts in repo).
- **Rollback**:
  - **App**: Vercel deployment rollback (`UNKNOWN` exact Vercel project team workflow).
  - **Database**: No down-migration scripts exist in `supabase/migrations/`. Rollback requires writing a new corrective forward SQL migration (`CONFIRMED`).


---

## 8. GitHub Actions CI quality gate

Workflow: [.github/workflows/ci.yml](../.github/workflows/ci.yml), decision: [ADR-008](adr/ADR-008-local-ci-quality-gate.md).
Runs on pushes/PRs targeting master or main and manual workflow dispatch.

| Job ID | Required status check | Work |
| --- | --- | --- |
| quality-check | Fast Quality Gate & Build | Lint, 14 offline tests, all three app builds |
| database-integration | Docker Supabase Integration Tests | Fresh local Supabase migrations/seed and 42 tests |
| e2e-playwright | E2E Playwright Tests | Separate fresh local DB, Chromium, 9 browser tests |

Jobs run sequentially on separate ubuntu-latest runners, Node 22 and pnpm 11.13.1. Supabase CLI is pinned to 3.1.0. Installs use frozen-lockfile; pnpm store, Turbo/Next build cache and Chromium binaries are cached. Chromium Linux system dependencies are installed even after a browser cache hit. Concurrency cancels older runs for the same PR/ref. Each Docker job stops the stack with always(), including test failures.

CI needs no Supabase Cloud, PayOS or deployment secrets. Do not add the production .env to checkout, caches or artifacts; the workflow rejects a root .env. Build uses loopback URLs and a non-secret build-only anon placeholder. DB jobs pipe local Supabase status JSON into scripts/ci-local-env.mjs, which validates loopback URLs, masks credentials in GitHub logs and fills .env.test.example into ignored .env.test. Simply copying the template without replacing keys will fail authentication.

The E2E harness forwards Linux HOME/USER, uses local server/client URLs and blank PayOS credentials. Browser external HTTP/WebSocket requests are blocked by fixtures. Failure reports from playwright-report/ and test-results/ are uploaded with actions/upload-artifact@v4 for seven days; treat artifacts as internal because they may contain local test sessions. Raw environment/status documents are never uploaded.

### Activate branch protection for master

1. Push the workflow and let it run once so GitHub knows the three check names.
2. Open repository Settings -> Branches -> Add branch protection rule (or the equivalent branch ruleset), targeting master.
3. Enable Require a pull request before merging, Require status checks to pass before merging, and Require branches to be up to date before merging.
4. Select all three exact status-check names in the table above. Scope them to GitHub Actions when the UI allows selecting a source.
5. Apply the rule to administrators / disallow bypassing, and restrict direct pushes. Do not enable force pushes or deletion. Confirm with a deliberately failing test PR that merging stays blocked and E2E failures produce artifacts.

Creating this workflow does not change repository settings. If GitHub does not offer branch protection for the repository's visibility/plan, that setting must be resolved by the repository administrator.

Vercel Git integration may continue to create PR previews and production deployments after protected merges to master. This workflow contains no deployment step. A push-triggered workflow alone cannot delay Vercel's direct-push deployment; required protected PR merges establish the release gate. Check all three Vercel projects use master as their production branch and restrict manual production deploys separately if required.

### Verification and runtime budget

Local acceptance: pnpm test:offline, pnpm test:local, pnpm test:e2e and pnpm build. YAML/schema is checked with actionlint. Windows local success does not prove an Ubuntu Actions run; verify the first GitHub run and its timing before marking runner acceptance complete. Target under five minutes with warm caches; cold Docker pulls on two fresh runners can exceed it. Job timeouts bound runaway jobs but do not guarantee the runtime target.

Verified locally on 2026-11-14 (Windows, Node 24.13.0): offline 14/14, Docker 42/42, E2E 9/9 (43.6 seconds), and build 3/3 apps passed. Actionlint v1.7.12 passed; Node syntax checks passed for all three test/server scripts. The local env generator succeeded against the running Docker stack and rejected non-loopback API/DB URLs and missing fields without overwriting the existing test configuration. Node 22/Ubuntu execution and the total Actions runtime remain to be verified on GitHub.
