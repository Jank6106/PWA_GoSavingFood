# ADR-006: Customer Finder constraints and current catalogue validation

Status: Accepted for customer implementation on `feat/customer-hackathon`. Server implementation is pending.

## Context

The meeting of 12 November proposes natural-language food discovery. Stock, price, store opening and pickup deadlines can change while a request is running. A generated recommendation must not introduce invented bag IDs or prices. Customer already has a catalogue hook and service layering.

## Decision

- Preserve state-based navigation and Page -> Hook -> Service layering. Finder is lazy loaded; shared price/time/deal predicates live under `shared/utils/customerDeals.ts`.
- Default Finder uses an explicitly labelled local rules filter. `VITE_CUSTOMER_FINDER_API_ENABLED=true` enables the optional `POST /api/ai/customer-search` request through the service. There is no provider secret in the browser.
- The server contract returns validated normalized constraints, not authoritative bags or prices. The client computes results from the current catalogue and revalidates after asynchronous responses, catalogue updates and time/focus events. The server must still enforce actual order/price/stock authorization at checkout.
- On API failure the user chooses local filtering explicitly; the app does not quietly present a local fallback as successful AI execution.
- Tag hardcoded fallbacks as demo. A `remote` catalogue source means fetched data, not independent verification of merchant consent, safety or real partnership.

## Consequences

Customer can be developed and tested without an AI account, database writes or a provider dependency. Local parsing is intentionally limited and reports unsupported terms. A separately implemented server must validate authentication, input, quotas, returned constraints and privacy; this client work does not establish that server as secure or deployed. Physical-phone AI/restart acceptance is still pending.
