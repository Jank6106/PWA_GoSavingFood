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

### Local Docker Supabase Integration & Audit Suites
Local integration suites are guarded by `scripts/test-local.mjs`: they refuse to start unless both the API and PostgreSQL URLs resolve to loopback hosts. The root `.env.test` is ignored by Git; copy `.env.test.example` and replace the keys with the values printed by `pnpm db:start` / `pnpm db:status`.

```bash
pnpm db:start
pnpm db:status
pnpm db:reset
pnpm test:local
pnpm test:audit
pnpm db:stop
```

Supabase Studio is available at `http://127.0.0.1:54323`. `pnpm db:reset` resets only the local Docker database, applies migrations, then runs `supabase/seed.sql`.

> [!IMPORTANT]
> The committed migrations currently start at `0009` and assume an existing database schema; do not use them as a fresh-install baseline. The Supabase CLI also requires unique migration versions, while this repository currently has duplicate version prefixes. Until these repository constraints are resolved without rewriting migrations `0009`–`0041`, a fresh local `db reset` may fail before loading the seed.

### Live Supabase Integration & Audit Suites (Run with Care)
> [!WARNING]
> The suites below execute directly against the **live Supabase project** (`lblwvbedtlxjtkcuxmsf.supabase.co`). They create/delete temporary test users and orders during execution. All credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) are loaded from root `.env` via `scripts/lib/env.mjs`.

```bash
pnpm test:live                                 # Runs ALL Vitest files; may reach live DB
node scripts/comprehensive-system-audit.mjs    # 25-check DB integrity, 1:1 merchant isolation, HANOI_BAGS sync & E2E order/RLS audit
node scripts/api-smoke-test.mjs                # API smoke checks
```

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
