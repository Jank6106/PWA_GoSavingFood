# ADR-007: Isolated local browser E2E tests

Status: Accepted, 2026-11-14.

## Context

The E2E plan requires Customer and Merchant UI tests on Docker without Cloud or PayOS traffic. The apps load root environment variables and use custom state/query routing; Merchant assets also need a base path when served through the Next gateway.

## Decision

Use Playwright Chromium with one worker and no server reuse. Start Next and two Vite servers through a Node harness with explicit local public environment variables, an allowlist for inherited system variables, and blank PayOS credentials. An explicit E2E flag skips root Cloud env loading in Next and preserves Merchant's `/merchant/` asset path. Browser requests and WebSockets to external hosts are blocked. Existing application routing and production base paths remain the default.

Seed local email identities and real Customer/Merchant Auth credentials. Inject only the Customer's real session to avoid automating Google; exercise Merchant auth, order checkout, preparation and manual QR handover through the UI. Assert actual Realtime frames and local DB invariants. Reset only the fixed E2E Customer's order data before/after each test. Keep Vitest's include pattern separate from Playwright.

The auth tests exposed a missing Merchant role guard. Verify `public.users.role` in the service before store resolution on login/restoration, initialize the hook without granting privileges to cached data, and defer Auth event queries until the SDK releases its lock. This adds a frontend guard without changing database authorization or historical migrations.

## Consequences

Tests require Docker and free ports 3000/5173/5174. Google redirects, physical camera recognition and real paid PayOS requests remain outside scope. Traces/screenshots can contain local sessions and therefore stay ignored. Existing workspace lint failures are reported explicitly rather than disabled.
