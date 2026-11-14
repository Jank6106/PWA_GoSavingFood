# ADR-003: Supabase (PostgreSQL 17 + PostGIS + Auth + Realtime + Storage) as Unified Backend

Status: Accepted (`CONFIRMED`)

## Context
GoSavingFood requires geospatial nearby search for stores and bags, transactional inventory locking during concurrent orders, realtime order notifications between Customer and Merchant PWAs, authentication, and image storage.

## Decision
Use Supabase Cloud (PostgreSQL `17.11` with PostGIS `3.3.7`, `pg_cron`, Supabase Auth, Supabase Realtime `postgres_changes`, and 5 public Storage buckets) as the primary backend, fronted by a Cloudflare Worker proxy (`api.gosavingfood.app` -> `lblwvbedtlxjtkcuxmsf.supabase.co`).

## Rationale
- PostGIS (`ST_DWithin`, `ST_Distance`) provides a single source of truth for spatial queries (`list_stores_nearby`, `list_bags_nearby`) rather than relying on Mapbox search.
- PL/pgSQL `SECURITY DEFINER` RPCs (`place_order`, `transition_order_status_transaction`, `verify_pickup_qr`) enforce atomic transactions and inventory locks (`FOR UPDATE`).
- Cloudflare Worker proxy (`scripts/deploy-worker.mjs`): `Rationale: UNKNOWN – historical context not available` (likely custom domain / connectivity resilience).

## Consequences
### Positive
- Rapid development without a custom REST/WebSocket microservice backend.
- Database triggers automatically drive in-app notifications (`notify_store_new_order`, `notify_customer_order_status`) and store ratings (`update_store_rating`).

### Negative
- Business logic is distributed across 30+ PL/pgSQL migrations (`0009`–`0041`), increasing risk of authorization regressions when RPCs are rewritten (observed in migration `0040`).
- `SECURITY DEFINER` functions bypass RLS and require strict manual `auth.uid()` and role checks.

## Alternatives
MSW mocks + separate REST backend API (referenced in legacy `docs/architecture.md`, replaced in production by direct Supabase SDK calls).

## Evidence
- `supabase/migrations/0009_*.sql` through `0041_*.sql`
- `apps/customer/src/services/mapbox.service.ts`
- `apps/customer/src/services/supabase.ts`
- `apps/merchant/src/services/supabase.ts`
- `scripts/deploy-worker.mjs`
