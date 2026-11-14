# GoSavingFood Customer PWA (`apps/customer`)

Customer-facing Progressive Web App served under `/explore/` (`gosavingfood.app/explore/`).

> **Project-wide context & rules**: See [`../../AI_CONTEXT.md`](../../AI_CONTEXT.md) and [`../../AGENTS.md`](../../AGENTS.md).

## Architecture (`CONFIRMED`)
```text
src/
├── app/layouts/      # AppHeader, AppLayout, BottomNav
├── contexts/         # AuthContext (Supabase PKCE + 0ms localStorage cache)
├── features/         # Feature modules (auth, cart, catalog, checkout, home, location, notifications, orders, profile, search)
├── hooks/            # Custom hooks (useAuth, useCart, useCustomerCatalog)
├── services/         # customer.service.ts, mapbox.service.ts, supabase.ts
├── shared/           # Shared UI components, types, bagTiming/imageCompression/validation utils
├── App.tsx           # State-based AppRoute + history.state navigation + lazy screen splitting
└── main.tsx
```

- **Strict Layering**: `features/*/pages|components` -> `hooks/` or `contexts/` -> `services/` -> Supabase / `/api/payos/*`.
- **Map Coordinates**: App models use `{ latitude, longitude }`; convert via `toLngLat` / `fromLngLat` in `src/services/mapbox.service.ts` for Mapbox GL `[lng, lat]`.

## Commands (from repo root)
```bash
pnpm --filter customer dev    # http://localhost:5173/explore/ (proxies /api -> localhost:3000)
pnpm --filter customer build  # tsc -b && vite build
pnpm --filter customer lint   # eslint .
```
