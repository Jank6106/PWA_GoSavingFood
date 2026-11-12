# AI Engineering Instructions (`AGENTS.md`)

## Before making changes
1. Read [`AI_CONTEXT.md`](AI_CONTEXT.md).
2. Read [`docs/PRODUCT.md`](docs/PRODUCT.md).
3. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
4. Read relevant ADRs in [`docs/adr/`](docs/adr/) and domain specs (`DATA_MODEL.md`, `API.md`, `SECURITY.md`, `TESTING.md`, `DESIGN_SYSTEM.md`) only for areas touched by your task.
5. Inspect the existing implementation directly before editing.
6. Do not assume documentation is newer than code.
7. If documentation and implementation conflict, identify the conflict before modifying the system.

## Engineering Principles
- Preserve existing architecture unless change is justified.
- Prefer incremental, minimal-scope changes over unnecessary rewrites; only touch files in the direct dependency path of the task.
- Do not introduce new dependencies without a clear reason.
- Preserve backward compatibility unless explicitly instructed otherwise.
- Never hardcode secrets (`SUPABASE_SERVICE_ROLE_KEY`, `PAYOS_*`, `DATABASE_URL`, `RESEND_*`, `CLOUDFLARE_*`). Never expose secrets under `VITE_*` or `NEXT_PUBLIC_*`.
- Validate untrusted input.
- Follow existing authentication and authorization patterns (and do not weaken RLS/RPC checks).
- Database changes require numbered SQL migrations in `supabase/migrations/` (never mutate production schema ad-hoc without a migration file).
- New behavior should have tests where practical.

## Repository-Specific Rules (`CONFIRMED` from codebase)
1. **Strict PWA Layering**:
   - In `apps/customer`: `features/*/pages|components` -> `hooks/` or `contexts/` -> `services/` -> Supabase/API. UI components must NOT call `supabase` or `fetch('/api/...')` directly.
   - In `apps/merchant`: `pages/` or `components/` -> `hooks/` -> `services/` -> Supabase. UI components must NOT import from `services/`.
2. **Coordinate Convention (Mapbox vs PostGIS)**:
   - App domain models & Supabase RPC parameters use `{ latitude, longitude }` (or `p_lat, p_lng`).
   - Mapbox GL & GeoJSON use `[longitude, latitude]`. Always convert via `toLngLat` / `fromLngLat` in `apps/customer/src/services/mapbox.service.ts`.
3. **Offline & PWA Rules**:
   - Service Workers (`public/sw.js`) only cache app shell & static assets; Supabase requests (`/rest/v1/`, `/auth/v1/`, `/storage/v1/`, `/realtime/v1/`) MUST remain NetworkOnly.
   - Never queue mutations (placing orders, payments, inventory updates, QR verification) offline.
4. **PayOS & Order Rules**:
   - Cash payment is disabled at DB level (`CASH_PAYMENT_NOT_SUPPORTED`); only online PayOS VietQR or 0đ voucher orders are valid.
   - Always pass numeric `paymentOrderCode` (not textual `orderCode`) to `/api/payos/check-status`.
   - Keep `apps/web/AGENTS.md`'s `<!-- BEGIN:nextjs-agent-rules -->` block intact if working in `apps/web` (Next.js 16 regenerates it on `next dev`).
5. **UI & Design System**:
   - Check `packages/ui/src/components/` before creating basic primitives (`Button`, `Input`, `Dialog`, `Badge`, `Card`, `Skeleton`, `EmptyState`, `ErrorState`).
   - `apps/customer` & `apps/merchant` share the green food-first palette (`#166B4A` / `#1B4D3E`); `apps/web` landing uses its own warm editorial palette (`apps/web/DESIGN.md`). Respect mobile safe areas (`env(safe-area-inset-*)`).
6. **Fallback Data Sync**:
   - `apps/customer/src/services/customer.service.ts` currently embeds `HANOI_BAGS` fallback data; changes to seeded DB bag IDs/images will break 1:1 audit checks in `scripts/comprehensive-system-audit.mjs` unless updated or removed.

## Security
- Treat all external input (including webhook payloads, URL params, client prices/amounts, and RPC parameters) as untrusted.
- Enforce authentication and authorization server-side (Next.js API routes, RLS, `SECURITY DEFINER` RPCs using `auth.uid()`).
- Do not expose secrets, tokens, or PII in logs or client bundles.
- Do not weaken security controls merely to make implementation easier.
- **Warning on Tests**: `tests/auth-backend.test.ts` and `tests/production-backend-audit.test.ts` execute against the live Supabase project, not an isolated local DB. Run with care.

## Before finishing a task
1. Run relevant builds & tests (`pnpm turbo build`, `pnpm test` or targeted vitest/audit scripts).
2. Review security impact (especially RLS, `SECURITY DEFINER` functions, and `/api/payos/*`).
3. Review backward compatibility (DB migrations, mobile PWA caches, PayOS API payloads).
4. Update documentation if behavior or architecture changed.
5. Update [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
6. Create/update an ADR in [`docs/adr/`](docs/adr/) and index it in [`docs/DECISIONS.md`](docs/DECISIONS.md) when an architectural decision is introduced.
7. Update [`AI_CONTEXT.md`](AI_CONTEXT.md) (Project Snapshot) and [`docs/ROADMAP.md`](docs/ROADMAP.md) if product state changed materially.
