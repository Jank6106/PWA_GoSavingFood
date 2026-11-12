# ADR-004: PayOS VietQR Online-Only Payments (Cash Disabled) + 0đ Voucher Fast-Path

Status: Accepted (`CONFIRMED`)

## Context
Surprise Bags have limited daily quantities and short pickup windows. Unpaid reservations lock inventory (`surprise_bags.quantity`), and cash-on-pickup increases no-show risk without payment guarantee. Additionally, promotional campaigns require 100% discount vouchers resulting in 0đ orders.

## Decision
1. Disable cash payments at the database RPC level (`CASH_PAYMENT_NOT_SUPPORTED` in `create_order_transaction`).
2. Route paid orders (`final_amount > 0`) through PayOS VietQR with a **33-minute TTL** (30m + 3m buffer, capped at `pickup_end + 5m` for `daily` bags), caching `payos_qr_code` in `orders` and confirming via both PayOS Webhook and `/api/payos/check-status` polling using numeric `payment_order_code`.
3. Auto-settle `final_amount <= 0` orders immediately as `status = 'paid'`, `payment_status = 'success'` inside `create_order_transaction`, bypassing PayOS.

## Rationale
Prevents ghost cash orders, eliminates PayOS errors on 0đ amounts, handles flaky webhook delivery via polling fallback, and ensures expired unpaid orders restore inventory/vouchers via lazy cleanup + `pg_cron` (`expire_unpaid_orders`).

## Consequences
### Positive
- Reliable payment state reconciliation using numeric `payment_order_code`.
- Seamless 0đ promotional checkout (e.g., `TMU2026`).

### Negative
- Current `0040` RPC validates `p_final_amount >= p_total_discount_price - p_discount_amount` using client-supplied values rather than recalculating prices from DB tables (`docs/SECURITY.md`).
- Cancelling paid orders (`> 0đ`) requires manual bank refund processing tracked via `refund_requests`.

## Alternatives
Cash on pickup (`payment_method` enum still contains `'cash'`, explicitly blocked in RPC).

## Evidence
- `supabase/migrations/0015_payos_integration.sql`
- `supabase/migrations/0026_safe_payment_buffer_and_auto_refund.sql`
- `supabase/migrations/0028_add_payos_qr_cache_and_lifecycle_cleanup.sql`
- `supabase/migrations/0040_zero_vnd_order_flow.sql`
- `supabase/migrations/0041_add_hidden_voucher_tmu2026.sql`
- `apps/web/app/api/payos/*`
