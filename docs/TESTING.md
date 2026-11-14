# TESTING.md — Testing Strategy, Suites & Flow Verification

> Consolidates `rules/testingAPI.md`, Vitest suites (`tests/`), and audit scripts (`scripts/`).

---

## 1. Available Test & Audit Suites (`CONFIRMED`)

### Safe Offline Unit Tests
- `tests/customerOpenAI.test.ts`: Mocked Responses API schema/provenance, image bounds, failover, refusal stop, incomplete output, hedge, deadline/cancellation; no real provider calls in `pnpm test`.
- `tests/customerAi.test.ts`: Server input/output, client contract compatibility, JWT route guards, user quota, mocked Gemini fallback/hedging/deadline/cancellation. Included in offline tests, no real Supabase/Gemini calls. Setup: `hackathon/customer/AI_SETUP.md`.
```bash
pnpm test
# Equivalent explicit command:
pnpm test:offline
```
- `tests/bagTiming.test.ts`: Tests `daily` vs `shelf_life` bag availability and expiry rules (`customer` & `merchant`).
- `tests/mapbox.test.ts`: Tests `toLngLat` / `fromLngLat` coordinate conversion and Haversine distance calculation.
- `tests/envHelper.test.ts`: Tests root `.env` loading and validation helpers (`scripts/lib/env.mjs`).
- `tests/customerFinder*.test.ts`: Local Finder constraints, inventory/time/price validation, server response mocks, timeout and coordinator regressions; no real AI calls.
- `tests/customerDeals.test.ts`: Deal ranking, metre distances and price/pickup/expiry guards. All of these run through `pnpm test`; do not replace this with an unrestricted `vitest run`, which also discovers live suites.

### Local Docker Supabase Integration Suites
Local integration suites are guarded by `scripts/test-local.mjs`: they refuse to start unless both the API and PostgreSQL URLs resolve to loopback hosts. The root `.env.test` is ignored by Git; copy `.env.test.example` and replace the keys with the values printed by `pnpm db:start` / `pnpm db:status`.

```bash
pnpm db:start
pnpm db:status
pnpm db:reset
pnpm test:local
pnpm db:stop
```

Supabase Studio is available at `http://127.0.0.1:54323`. `pnpm db:reset` resets only the local Docker database, applies migrations, then runs `supabase/seed.sql`.

The new `0000_baseline_schema.sql` exports the Cloud schema without data and adds compatibility for immutable historical SQL (PostGIS in public, enum ILIKE, a synthetic legacy owner). Duplicate prefixes were renamed with contents unchanged; see `supabase/migration-renames.json`. Auth tests create and clean up synthetic local merchant/admin fixtures. Historical migration 0036 also inserts its catalog; the local seed is additive.

Verified 2026-11-13: offline 14/14 tests; local 42/42 tests across five suites.
Clean local reset applied 42 migrations and seed; Studio returned HTTP 200. Build passed from Turbo cache. Workspace lint reported 113 errors and 3 warnings in unchanged merchant files.

Reverified after ESLint cleanup on 2026-11-14: Merchant and workspace lint both completed with zero errors/warnings, all three apps built, offline 14/14, Docker integration 42/42 and Playwright E2E 9/9 passed. No lint rules were disabled and no migrations were changed by this cleanup. See `docs/reports/ESLINT_CLEANUP_2026-11-14.md` for the current acceptance results and file list; the preceding reset result is historical.

### Live Supabase Integration & Audit Suites (Run with Care)
> [!WARNING]
> The suites below execute directly against the **live Supabase project** (`lblwvbedtlxjtkcuxmsf.supabase.co`). They create/delete temporary test users and orders during execution. All credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) are loaded from root `.env` via `scripts/lib/env.mjs`.

```bash
pnpm test:audit                                # Cloud dataset audit; not required for local seed
pnpm test:live                                 # Runs ALL Vitest files; may reach live DB
node scripts/comprehensive-system-audit.mjs    # 25-check DB integrity, 1:1 merchant isolation, HANOI_BAGS sync & E2E order/RLS audit
node scripts/api-smoke-test.mjs                # API smoke checks
```

### Browser E2E (Playwright, local Docker only)

```bash
pnpm install
pnpm exec playwright install chromium
pnpm db:start
pnpm db:reset
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:debug
```

On Windows without a pnpm shim, prefix these commands with `corepack.cmd` (for example `corepack.cmd pnpm test:e2e`). Configure local credentials in the ignored `.env.test` as above; E2E refuses non-loopback API/database URLs. The local seed supplies `customer.local@gosavingfood.test` and `merchant.local@gosavingfood.test`, both with the synthetic password `LocalTest123!`.

Playwright starts its own gateway on 3000 and Vite servers on 5173/5174 via `scripts/e2e-servers.mjs`; stop other dev servers on these ports first. Existing servers are intentionally not reused. The harness passes explicit local URLs/anon keys to both PWAs, local server credentials to Next, and no PayOS credentials. Browser HTTP and WebSocket traffic to external hosts is blocked. Service workers are disabled for reproducible browser runs.

Nine sequential Chromium cases run with one worker: four auth/route-guard cases at Pixel 7 and desktop viewports, plus a two-context order lifecycle. Customer login injects a real local Auth session using the SDK's actual `sb-127-auth-token` key; Google OAuth itself is not automated. Merchant login/logout, checkout, voucher application, preparation and QR handover use the UI. The order test requires actual `postgres_changes` frames on both pages, zero payment-creation requests, paid/zero-amount state, stock deduction, and completion/review UI. QR is entered through the scanner's manual entry mode; physical camera decoding is outside this suite.

Customer deep links use `/explore/?view=bag&id=...`, not `/explore/bag/:id`. Guest login is under the profile tab, and completion exposes a review action rather than automatically opening a review modal. Tests follow those existing product behaviors. Bag search and manual bag creation are excluded as planned.

Before and after each case, the DB helper deletes only the seeded Customer's order state, restores the test bag and voucher, and keeps its order window open in Vietnam time. Both browser contexts are closed. Vitest includes only `tests/*.test.ts`, so it never executes Playwright specs.

Reports: `playwright-report/index.html`, `test-results/e2e-results.json`, failure screenshots and first-retry traces (including both lifecycle contexts). These artifacts and `.env.test` are ignored by Git. See [the acceptance report](reports/E2E_TESTING_2026-11-14.md) for commands, results and changed files.

### Build Verification
```bash
pnpm turbo build                               # Builds @gosavingfood/ui, apps/web, apps/customer, apps/merchant
pnpm turbo lint                                # Runs ESLint across workspace packages
```

---

## 2. API & Flow Debugging Rules (`CONFIRMED` from legacy `rules/testingAPI.md`)
1. **Test one flow at a time**: Trace strictly along `UI Action -> Hook/Context -> Service -> Request -> Response -> State -> UI`.
2. **Fix at the root layer**: Do not patch symptoms in UI if the bug is in a service, RPC, or hook.
3. **Avoid redundant network calls**: Do not refetch when only local UI state changes; reuse state or update locally after mutations where safe.
4. **Verify all 4 states**: Every async flow must handle `Loading`, `Success`, `Error`, and `Empty` without leaving UI stuck.
5. **Prevent duplicate mutations**: Guard double-clicks and concurrent submits (see `inFlightRequests` in `create-payment/route.ts` and `idempotency_keys` in `place_order`).
6. **Verify Realtime Customer <-> Merchant sync**:
   - Store open/close (`stores.is_open`) -> Customer bag availability/badges.
   - Bag stock/price updates (`surprise_bags`) -> Customer stepper limits & Sold Out state.
   - Order transitions (`orders.status`, `payment_status`) -> Live screen updates and `notifications` inserts on both apps.
