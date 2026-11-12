# ADR-002: Next.js (`apps/web`) as Reverse Proxy Gateway & PayOS Server-Only API Host

Status: Accepted (`CONFIRMED`)

## Context
`apps/customer` and `apps/merchant` are pure client-side Vite SPAs/PWAs where all `VITE_*` environment variables are bundled into browser JavaScript. PayOS payment creation, webhook signature verification, and expired-link cancellation require secret credentials (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) that cannot be exposed in client bundles.

## Decision
Host PayOS server-only API routes inside `apps/web` (`/api/payos/*` on `gosavingfood.app`) and configure `apps/web/next.config.ts` to proxy `/explore/*` to the Customer PWA and `/merchant/*` to the Merchant PWA, while `apps/customer/vercel.json` rewrites `/api/:path*` back to `https://gosavingfood.app/api/:path*`.

## Rationale
Leverages Next.js App Router serverless functions on Vercel to secure PayOS/Supabase admin credentials and provides a unified public origin (`gosavingfood.app/explore/`) for SEO, OAuth callbacks (`/auth/callback`), and standalone PWA redirects without maintaining a separate Express/NestJS server.

## Consequences
### Positive
- Zero dedicated backend server to maintain outside Vercel + Supabase.
- Browser PWAs never touch PayOS secret keys or `SUPABASE_SERVICE_ROLE_KEY`.

### Negative
- Tight coupling between `apps/customer` production deployments and `https://gosavingfood.app` API routes.
- Currently lacks caller JWT authentication on non-webhook `/api/payos/*` routes (documented in `docs/SECURITY.md`).

## Alternatives
Supabase Edge Functions for PayOS APIs (`INFERRED` possible alternative, not used for PayOS; Vercel Next.js serverless routes were chosen instead).

## Evidence
- `apps/web/next.config.ts`
- `apps/web/app/api/payos/{create-payment,check-status,webhook,cancel-payment,cleanup-expired}/route.ts`
- `apps/web/app/auth/callback/page.tsx`
- `apps/customer/vercel.json`
- `apps/customer/vite.config.ts` (dev `/api` proxy to `localhost:3000`)
