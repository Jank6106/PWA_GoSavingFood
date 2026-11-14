# DECISIONS.md — Architecture Decision Index

| ID | Decision | Status | ADR |
| :--- | :--- | :--- | :--- |
| ADR-001 | `pnpm` Workspaces + `Turborepo` Monorepo for Independent Apps | Accepted (`CONFIRMED`) | [`docs/adr/ADR-001-monorepo-pnpm-turborepo.md`](adr/ADR-001-monorepo-pnpm-turborepo.md) |
| ADR-002 | `apps/web` (Next.js) as Reverse Proxy Gateway & PayOS Server-Only API Host | Accepted (`CONFIRMED`) | [`docs/adr/ADR-002-nextjs-gateway-and-payos-api.md`](adr/ADR-002-nextjs-gateway-and-payos-api.md) |
| ADR-003 | Supabase (PostgreSQL 17 + PostGIS + Auth + Realtime + Storage) as Unified Backend | Accepted (`CONFIRMED`) | [`docs/adr/ADR-003-supabase-postgresql-postgis-backend.md`](adr/ADR-003-supabase-postgresql-postgis-backend.md) |
| ADR-004 | PayOS VietQR Online-Only Payments (Cash Disabled) + 0đ Voucher Fast-Path | Accepted (`CONFIRMED`) | [`docs/adr/ADR-004-payos-vietqr-and-zero-vnd-voucher-flow.md`](adr/ADR-004-payos-vietqr-and-zero-vnd-voucher-flow.md) |
| ADR-005 | State-Based Routing & Custom Service/Hook Layers in Vite PWAs | Accepted (`CONFIRMED`) | [`docs/adr/ADR-005-state-based-pwa-routing-and-service-layer.md`](adr/ADR-005-state-based-pwa-routing-and-service-layer.md) |
| ADR-006 | Customer Finder consumes constraints and rechecks the current catalogue | Accepted; server adapter implemented, production acceptance pending | [ADR-006 (Customer Finder)](adr/ADR-006-customer-finder-constraints.md) |
| ADR-006 | Docker database bootstrap and migration filename compatibility | Accepted | [ADR-006](adr/ADR-006-local-database-bootstrap.md) |
| ADR-007 | Isolated Playwright browser tests and verified Merchant startup | Accepted | [ADR-007](adr/ADR-007-local-browser-e2e.md) |
| ADR-008 | GitHub Actions quality gate with isolated Docker databases | Accepted | [ADR-008](adr/ADR-008-local-ci-quality-gate.md) |

Both branches independently assigned ADR-006. The distinct filenames and existing IDs are preserved for link compatibility; use the decision title to distinguish them.
| ADR-009 | Stable PayOS payment identity and full reservation deadline | Accepted | [ADR-009](adr/ADR-009-payment-lifecycle.md) |
| ADR-010 | Server-confirmed Merchant order transitions and pickup | Accepted | [ADR-010](adr/ADR-010-merchant-order-guards.md) |

