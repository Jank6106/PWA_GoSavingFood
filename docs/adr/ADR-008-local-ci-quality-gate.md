# ADR-008: GitHub Actions quality gate with isolated Docker databases

Status: Accepted, 2026-11-14.

## Context

Offline, Docker integration and browser suites already exist. A required PR gate must run them without production Supabase/PayOS credentials on Ubuntu. The plan's template contains placeholder keys and cannot be used unchanged.

## Decision

Use three sequential jobs on fresh Ubuntu runners: lint/unit/build, Docker integration, then Docker browser E2E. Each DB job starts its own pinned Supabase CLI stack, applies migrations/seed at startup, and generates the ignored test configuration from the template and local status JSON. Validate loopback URLs and mask local credentials before writing them. CI does not receive production secrets.

Keep the existing Node child-process scripts; preserve Linux HOME/USER alongside Windows system variables in the E2E allowlist. Use frozen pnpm installs, dependency/build/browser caches, read-only repository permissions, PR concurrency cancellation, and unconditional Docker cleanup. Retain failed browser reports for seven days.

## Consequences

Required GitHub status checks must be enabled outside the workflow. Vercel's Git integration remains responsible for deployment after protected merges; this workflow does not itself block a direct production deploy. Cold Docker image pulls on two separate runners can exceed the five-minute target. Measure runner timings before claiming that target is met. No staging Cloud project is required.
