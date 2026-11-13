# ADR-006: Local Docker database bootstrap

Status: Accepted, 2026-11-13 (explicit project-owner authorization).

The repository lacked its initial schema and had eight duplicate migration versions. A schema-only Cloud export now bootstraps an empty local database before replaying historical migrations. No Cloud user/order rows were exported.

Historical SQL contents remain byte-identical; duplicate prefixes use suffix digits 1/2, preserving lexical order. The filename map preserves identity in the custom Cloud runner. Do not repair Cloud migration history or push this baseline into an existing app schema; the baseline rejects that case.

Local compatibility is confined to the new baseline: PostGIS lives in public for historical SECURITY DEFINER search paths, enum ILIKE delegates to text ILIKE, and one synthetic public profile satisfies migration 0036's owner foreign key. The imported historical catalog remains additive to local seed data.

The new baseline is not a pure unmodified Cloud snapshot: it intentionally includes these bootstrap adapters. It cannot be regenerated blindly without reapplying them.

Tests run against loopback URLs with synthetic merchant/admin fixtures and cleanup. Cloud dataset audit is a separate explicit command. Local SMTP uses Mailpit and external OAuth is disabled.
