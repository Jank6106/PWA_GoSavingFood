# TESTING.md — Testing Strategy, Suites & Flow Verification

> Consolidates `rules/testingAPI.md`, Vitest suites (`tests/`), and audit scripts (`scripts/`).

---

## 1. Available Test & Audit Suites (`CONFIRMED`)

### Safe Offline Unit Tests
```bash
pnpm vitest run tests/bagTiming.test.ts tests/mapbox.test.ts tests/envHelper.test.ts
```
- `tests/bagTiming.test.ts`: Tests `daily` vs `shelf_life` bag availability and expiry rules (`customer` & `merchant`).
- `tests/mapbox.test.ts`: Tests `toLngLat` / `fromLngLat` coordinate conversion and Haversine distance calculation.
- `tests/envHelper.test.ts`: Tests root `.env` loading and validation helpers (`scripts/lib/env.mjs`).

### Live Supabase Integration & Audit Suites (Run with Care)
> [!WARNING]
> The suites below execute directly against the **live Supabase project** (`lblwvbedtlxjtkcuxmsf.supabase.co`). They create/delete temporary test users and orders during execution. All credentials (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) are loaded from root `.env` via `scripts/lib/env.mjs`.

```bash
pnpm test                                      # Runs ALL Vitest files (including live DB tests)
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
