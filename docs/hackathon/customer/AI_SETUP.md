# Customer Finder — OpenAI local setup

Active provider on `Hung`: OpenAI Responses API, primary `gpt-6-luna`, fallback `gpt-5.4-mini`. Both support image input/structured output, verified in docs and live smoke tests. The earlier Gemini adapter from Hanh remains in source for historical tests, but the active route never calls it or silently switches provider.

## Configuration

Root `.env` (Git ignored; never use VITE_/NEXT_PUBLIC_ for a key):

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-6-luna
OPENAI_FALLBACK_MODELS=gpt-5.4-mini
VITE_CUSTOMER_FINDER_API_ENABLED=true
```

Run two terminals from repo root:

```powershell
# This Windows host requires system CA trust. TLS verification remains enabled.
# Tested Node v26.5.1; this option requires a supporting Node version.
$env:NODE_OPTIONS='--use-system-ca'
npx --yes pnpm@11.13.1 --filter web exec next dev --port 3000 --hostname 127.0.0.1
```

```powershell
npx --yes pnpm@11.13.1 dev:customer
```

Vite proxies `/api` to port 3000. Restart Next.js after editing root `.env`. `.env.test` is for database tests. Log in to Customer and open `http://localhost:5173/explore/?view=finder`. Submit `Hai người ăn chay tổng dưới 100 nghìn nhận trước 8 giờ tối`. Only a valid provider response produces **AI hiểu yêu cầu** and actual model provenance. Prices/stock/expiry/results come from the current catalogue; dietary/portion safety needs merchant confirmation.

## Contract and boundaries

- GET customer-search returns `{configured,requiresAuth:true}`, no provider call.
- POST requires verified Supabase user JWT and `{query}` (400 characters/4096 bytes), no service-role or DB writes.
- Output `{constraints,model,warnings}` validated at server and client. OpenAI strict JSON Schema, `store:false`. Refusal stops without trying another model; incomplete/invalid output or retryable HTTP failures can use fallback.
- Per-instance user quota 12/minute, max 3 models, 5-second hedge, 25-second provider deadline, 35-second client workflow; abort cancels provider attempts. Distributed quotas not implemented.
- Generic server adapter accepts bounded base64 PNG/JPEG/WebP images (max 2, about 1 MiB each). Finder HTTP route stays text-only; no upload UI or merchant vision endpoint was added.
- 401 login; 422 rephrase refused query; 429 wait; 503 config/auth unavailable; 502/504 provider error/deadline. Local filtering remains an explicit user choice.

## Live verification — 2026-11-14

| Test | Observed result | Time (one sample) |
|---|---|---|
| Mini text | gpt-5.4-mini-2026-03-17: 2 people, 100000 VND total, vegetarian, before 20:00 | 2232 ms |
| Nano text | gpt-5.4-nano-2026-03-17: same constraints | 1509 ms |
| Mini vision | Synthetic Milk bread label: MFG 2026-11-14, EXP 2026-11-20, both correct | 4190 ms |
| Nano vision | Same synthetic label, both dates correct | 1319 ms |
| Forced primary failure | Nonexistent primary switched to Nano and returned valid constraints | 1842 ms |

Smoke tests only, not OCR quality benchmarks or latency percentiles. No real food safety or account credit balance claims. Fixtures/live scripts stay in ignored scratch; no key logging. 137 offline tests cover mocked auth/schema/image bounds/refusal/failover/hedge/deadline/cancel. Customer build, web typecheck and scoped lint pass. OpenAI integration is ready for branch Hung; production deployment remains pending.

Sources: [Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [Nano](https://developers.openai.com/api/docs/models/gpt-5.4-nano), [vision](https://developers.openai.com/api/docs/guides/images-vision), [structured output](https://developers.openai.com/api/docs/guides/structured-outputs).

## Luna switch — 2026-11-14

Primary `gpt-6-luna`, fallback `gpt-5.4-mini`; explicitly use reasoning effort `none` to preserve the extraction latency budget (Luna otherwise defaults to medium). Live adapter tests: Luna text 2034 ms, correct 2 people/100000 VND/vegetarian/20:00; Luna synthetic-label vision 1391 ms, both MFG/EXP dates correct; forced invalid primary fell back to Mini in 2231 ms. Single samples, not quality/latency benchmarks. Historical Mini/Nano results above are retained. [Luna documentation](https://developers.openai.com/api/docs/models/gpt-6-luna).


## Vercel Production configuration — 2026-11-14

Configured OPENAI_API_KEY (server-side sensitive), OPENAI_MODEL=gpt-6-luna and OPENAI_FALLBACK_MODELS=gpt-5.4-mini for Production on gsf_landingpage. Enabled VITE_CUSTOMER_FINDER_API_ENABLED=true on gsf-customer-pwa. Values came from the user-supplied env file; only these four AI-related variables were updated. Existing database/payment configuration was preserved.

Redeployed each project's current Production revision to apply environment changes:
- Web: dpl_2ZbPvTGcffx9rQBMnAKB4JdtTx72 — READY.
- Customer: dpl_2w2NXMVw3TNCCwfk84GeeGDzyZXe — READY.

Verification: OpenAI model access for the supplied key returned success; GET https://gosavingfood.app/api/ai/customer-search returned HTTP 200 with configured=true and requiresAuth=true; unauthenticated POST returned HTTP 401. No authenticated production inference was performed. Open https://gosavingfood.app/explore/?view=finder and sign in to use AI search. Supabase secrets were not changed because this model adapter runs on Vercel.


## Production model switch — 2026-11-14

At the user's request, Production now uses OPENAI_MODEL=gpt-6.1-terra and OPENAI_FALLBACK_MODELS=gpt-6-luna. The existing sensitive OPENAI_API_KEY was preserved; the placeholder in the user's example was not stored as a key. Customer's Finder flag remains enabled.

Both model IDs were accessible with the existing key. Backend redeployment: dpl_5UaEecHgmdWTnXcPnxNzkks6M89i. This environment override supersedes the earlier Production Luna/Mini chain; repository defaults are unchanged. No source commit/push is required to activate the Vercel environment override.


## Authenticated Production verification and auth configuration repair — 2026-11-14

The earlier configured=true health check was insufficient: a real authenticated probe on both gosavingfood.app and gsf-customer-pwa.vercel.app returned 401 before reaching the provider. Resynchronized the Web project's Production SUPABASE_URL/SUPABASE_ANON_KEY with the validated Cloud auth configuration, preserving model/key settings and all auth checks. Deployment dpl_92pbc75KNtqH45STWGgGZQsXof5R reached READY.

After redeploy, the same sample request with a valid customer session returned HTTP 200 and model gpt-6.1-terra on both domains (single samples: 5782 ms and 4032 ms). Extracted constraints: 2 people, 100000 VND, vegetarian, pickup before 20:00. Browser verification at 390x844 also submitted the live Finder form successfully, displayed AI model provenance and 11 matching catalogue results. The screenshot is in ignored scratch/finder-production-diagnostic.png.

Checks used temporary synthetic Customer accounts with email confirmation set administratively (no email sent), no orders/payment actions, and automatic deletion in finally. All temporary accounts were removed. No auth guard was bypassed. Source code and model defaults were not changed for this configuration repair.
