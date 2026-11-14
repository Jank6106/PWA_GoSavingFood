# ADR-010: Server-confirmed Merchant order transitions and pickup

Status: Accepted, 2026-11-14.

Merchant previously showed successful transitions and pickup before the database confirmed them. A rejected RPC, wrong QR, or failed connection could therefore appear successful. Historical order RPCs also lacked complete Merchant ownership checks.

Migration 0043 wraps the historical RPC implementations with identity, role, ownership, payment and state-transition checks; the unguarded implementations cannot be called by client roles. Pickup requires a valid exact code and a paid order ready for pickup. Merchant updates the interface and cache only after server confirmation. Customer payment displays a recoverable error with a retry action instead of presenting a loading state indefinitely.

Apply migration 0043 before deploying the updated Merchant application. Existing direct database update policies and the separately documented PayOS API authentication debt still need independent security review. No previous SQL migration is modified.
