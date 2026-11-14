# Payment lifecycle repair — 2026-11-14

## Findings

- Creation previously allocated random codes and could recreate a paid order's link after confirmation cleared its cached QR.
- The order RPC shortened the 33-minute deadline to pickup-end plus five minutes; Customer also invented its own deadline and expired order status from browser time.
- Browser countdown/focus handling cancelled payment links before reconciling paid status.
- Repeated confirmation calls created duplicate refund requests. Status polling had an unconditional fallback update that could regress fulfillment or revive a terminal order.

## Implementation

Migration 0042 reserves one numeric code under an order row lock, guarantees a full 33-minute deadline, makes confirmation/refunds idempotent, and restricts payment-confirmation RPCs to service_role. Original migrations are unchanged.

API creation uses DB amount and expiry, reuses the cached provider QR/account details exactly, reconciles existing links, and retries/retrieves the same code after interruptions. Legacy links missing QR use their existing checkout page. Paid/terminal orders never receive a replacement link. Polling trusts the DB order/code mapping and never directly overwrites state; webhook amount/event validation and terminal-only cancellation provide additional guards.

Customer payment logic now lives in usePayment and payment.service; the UI has no direct Supabase calls. Countdown only displays time, pending orders remain pending until the server expires them, session recovery is scoped to the current order, and successful resume preserves advanced fulfillment state. Expired/cancelled/refund-pending messages are distinct. Direct DB cleanup fallback is removed so it cannot bypass API reconciliation failure.

## Verification

- Workspace ESLint: zero errors/warnings.
- Build: all three apps pass; existing Vite bundle-size warning remains.
- Offline: 14/14.
- Local Docker: 47/47 (42 existing plus five PayOS regression cases).
- Playwright: 11/11 (nine existing plus resume/focus and pending-tab regressions).
- Customer TypeScript build and whitespace diff checks pass.

Backend regression tests use real local PostgreSQL/PostgREST and a simulated PayOS fetch handler that rejects other external hosts. E2E payment responses are simulated; no real-money payment was performed. Local migration application succeeded with supabase migration up --local. Raw command output is in ignored scratch/lint-cleanup-{lint,build,offline,local,e2e}.log.

## Deployment

Apply [0042](../../supabase/migrations/0042_payment_idempotency_and_deadline.sql) to Cloud through the repository migration workflow **before** deploying the API/PWA. Cloud has not been migrated by this task. Existing terminal orders are not automatically revived; any historical real payment discrepancy needs reconciliation against provider transactions.

The full window intentionally supersedes the pickup-end cap (see [ADR-009](../adr/ADR-009-payment-lifecycle.md)). An accepted order near closing may therefore settle after the pickup closing time. Repeated notifications are not treated as proof of an additional transfer; genuine overpayments require transaction-level reconciliation. Existing API caller authentication/CORS and order-price-calculation debt are documented separately in SECURITY.md.


## Follow-up: Cloud-backed local launch (2026-11-14)

At the user's request to run the full app locally with the real database, applied only 0042 to the configured Cloud DB in a transaction and recorded that filename in public._migrations. Existing historical ledger was empty, so the broad migration runner was not used to apply historical files. PostgREST schema verification confirms reserve_payos_payment, payos_account_name and payos_bin are present.

Background dev servers run Web/gateway on http://localhost:3000, Customer on http://localhost:3000/explore/ and Merchant on http://localhost:5174/. All three URLs and the local webhook health endpoint returned HTTP 200. Cloud credentials are loaded from ignored root env; the local API uses real PayOS credentials. No real-money payment was initiated during startup verification. This follow-up supersedes the earlier statement that Cloud has not been migrated; production application deployment remains separate.
