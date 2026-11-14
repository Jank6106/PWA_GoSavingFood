# GoSavingFood Merchant PWA (`apps/merchant`)

Store partner Progressive Web App (`gsf-merchant-pwa.vercel.app`).

> **Project-wide context & rules**: See [`../../AI_CONTEXT.md`](../../AI_CONTEXT.md) and [`../../AGENTS.md`](../../AGENTS.md).

## Architecture (`CONFIRMED`)
```text
src/
├── types/       # Domain types (BagItem, MerchantOrder, StoreProfile, AnalyticsMetrics, NotificationItem)
├── mocks/       # Fallback constants (STORE_ID)
├── services/    # Supabase adapters (auth, bag, order, store, notification, analytics)
├── hooks/       # SWR localStorage caches (60s TTL), Supabase Realtime sync, mutations
├── components/  # Domain UI components (bags, orders, layout, notifications, ui)
├── pages/       # BagManagementScreen, OrderManagementScreen, AnalyticsScreen, SettingsScreen, FirstTimeSetupScreen, LoginScreen
├── utils/       # bagTiming, validation
└── App.tsx      # Auth gating & ?tab= screen shell + global QR scanner FAB
```

- **Strict Layering**: `pages/` or `components/` -> `hooks/` -> `services/` -> Supabase. UI components must NOT import from `services/`.
- **1:1 Isolation**: Each merchant credential maps 1:1 to a single store via `stores.owner_user_id`.

## Commands (from repo root)
```bash
pnpm --filter merchant dev    # http://localhost:5174
pnpm --filter merchant build  # tsc -b && vite build
pnpm --filter merchant lint   # eslint .
```
