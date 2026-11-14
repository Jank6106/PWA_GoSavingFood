# ADR-009: Stable PayOS identity and full payment window

Status: Accepted, 2026-11-14.

Reopening payment previously generated a new code when cached QR had been cleared after payment; cleanup deadlines could shrink to pickup_end + five minutes, while the browser used a separate clock/session deadline and cancelled links itself. Repeated polling confirmations also incorrectly created duplicate-payment refunds.

Reserve one numeric code in PostgreSQL before calling PayOS. Reuse the exact cached QR; reconcile existing links before rendering them. An interrupted request retries/retrieves the same provider code. If legacy QR data is missing, expose its existing PayOS checkout link instead of synthesizing/replacing the QR. Use DB amounts and expiration for provider requests. Confirmations are idempotent and service-only; late payment enters refund handling without reviving terminal orders.

Give accepted new orders the full 33 minutes (30 plus three-minute buffer), replacing ADR-004's pickup-end cap. Orders may therefore settle after the listed pickup closing time; the product now prioritizes the guaranteed payment window. Bag admission/food-expiry checks remain unchanged. Existing terminal orders are not restored automatically.

The PWA clock is display-only; server order state determines expiry/payment success. Payment UI delegates to a hook and service. Provider account numbers and QR payloads are preserved exactly.

Rollout: apply 0042 first, then deploy API and PWA together. No Cloud schema/data changes are performed by local acceptance. Existing HTTP authentication/CORS and server-side order price calculation debt remain separate.

Provider contract: [PayOS API](https://payos.vn/docs/api/) documents numeric orderCode, expiredAt Unix seconds and payment-link status lookup. A duplicate webhook is not evidence of a second transfer.
