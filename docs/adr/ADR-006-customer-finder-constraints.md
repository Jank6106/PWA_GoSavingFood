# ADR-006: Customer Finder constraints and current catalogue validation

Status: Accepted on `Hung` (initial client on `feat/customer-hackathon`). Server adapter implemented locally; real-provider acceptance awaits configuration.

## Context

The meeting of 12 November proposes natural-language food discovery. Stock, price, store opening and pickup deadlines can change while a request is running. A generated recommendation must not introduce invented bag IDs or prices. Customer already has a catalogue hook and service layering.

## Decision

- Preserve state-based navigation and Page -> Hook -> Service layering. Finder is lazy loaded; shared price/time/deal predicates live under `shared/utils/customerDeals.ts`.
- Default Finder uses an explicitly labelled local rules filter. `VITE_CUSTOMER_FINDER_API_ENABLED=true` enables the optional `POST /api/ai/customer-search` request through the service. There is no provider secret in the browser.
- The server contract returns validated normalized constraints, not authoritative bags or prices. The client computes results from the current catalogue and revalidates after asynchronous responses, catalogue updates and time/focus events. The server must still enforce actual order/price/stock authorization at checkout.
- On API failure the user chooses local filtering explicitly; the app does not quietly present a local fallback as successful AI execution.
- Tag hardcoded fallbacks as demo. A `remote` catalogue source means fetched data, not independent verification of merchant consent, safety or real partnership.

## Consequences

Customer can be developed and tested without an AI account or database writes. Local parsing is intentionally limited. The Next.js customer-search route adapts Gemini transport from Hanh `5dd09df`, validates Supabase user JWT/input/output and applies per-instance quotas. It does not impose merchant ownership, because customer search is a different capability. Provider deadline is 25 seconds and client deadline 35 seconds. Real-provider, deployment and physical-phone acceptance remain pending; see [`AI_SETUP.md`](../hackathon/customer/AI_SETUP.md).

## OpenAI switch (2026-11-14)
Active Finder switched to OpenAI Responses API: gpt-5.4-mini -> gpt-5.4-nano. Live text and synthetic-label image tests passed for both; forced primary failure switched to Nano. No upload UI added. 136 offline tests, customer build, web typecheck/scoped lint pass. Key stays server-side; TLS verification retained with system CA store on this Windows host. Setup/evidence: docs/hackathon/customer/AI_SETUP.md. AI changes not committed/pushed.
