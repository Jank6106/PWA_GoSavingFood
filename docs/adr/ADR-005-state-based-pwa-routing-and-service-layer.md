# ADR-005: State-Based PWA Routing & Custom Service/Hook Layers

Status: Accepted (`CONFIRMED`)

## Context
Original architectural planning (`docs/architecture.md` legacy) proposed `react-router`, `@tanstack/react-query`, `zod`, `react-hook-form`, and `msw`. Actual implementation in `apps/customer` and `apps/merchant` evolved differently.

## Decision
1. Manage navigation via React state + `window.history.pushState`/`popstate` (`AppRoute` in `apps/customer/src/App.tsx`) and `?tab=` query state (`TabRoute` in `apps/merchant/src/App.tsx`) with `React.lazy` screen splitting, without installing `react-router`.
2. Manage server data via domain service modules (`apps/*/src/services/*.ts`) paired with custom React hooks (`apps/*/src/hooks/*.ts`) using `localStorage` SWR/0ms caches and Supabase Realtime subscriptions, without `@tanstack/react-query` or `msw`.

## Rationale
`Rationale: UNKNOWN – historical context not available.`

## Consequences
### Positive
- Smaller dependency footprint and instant 0ms UI hydration from `localStorage` user/catalog caches on mobile PWAs.
- Lazy-loading `SearchPage` / `SelectLocationPage` isolates `mapbox-gl` (~1.86 MB minified chunk) from initial boot.

### Negative
- Deep-linking relies on custom `history.state` / URL param parsing rather than declarative route matching.
- `apps/customer/src/services/customer.service.ts` grew into a single 4,956-line file mixing API calls and hardcoded `HANOI_BAGS` fallback data.
- Mismatch with outdated docs caused confusion for contributors/AI agents.

## Alternatives
`react-router` + `@tanstack/react-query` + `zod` + `msw` (documented in legacy `docs/architecture.md`, never installed in `package.json`).

## Evidence
- `apps/customer/package.json` & `apps/merchant/package.json`
- `apps/customer/src/App.tsx`
- `apps/customer/vite.config.ts` (`modulePreload` & `manualChunks`)
- `apps/merchant/src/App.tsx`
- `apps/merchant/src/hooks/{useBags,useOrders,useStoreProfile,useAnalytics}.ts`
