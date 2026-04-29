# ADR-0009: Add License Audit Log

**Status:** Accepted  
**Date:** 2026-04-29

## Context

Licenses are now part of the core delivery and support workflow. Admins can bind domains/IPs, reset bindings, suspend licenses, and reissue keys. Installed products also call the activation endpoint, which can accept or reject a license check.

Without event history, support decisions are hard to explain and security incidents are hard to investigate.

## Decision

Add a `LicenseEvent` table linked to `License`.

Record events for:

- successful activation/checks;
- rejected activation/checks;
- admin domain/IP binding updates;
- admin binding resets;
- admin status changes;
- admin key reissues.

Keep event records compact: event type, actor type, optional actor id, domain, IP, message, and small JSON metadata stored as text.

## Consequences

- Admins can see recent license history directly in the license list and order detail pages.
- Support can explain why a license was rejected or when a binding changed.
- Security review has a starting point for suspicious activation attempts.
- Future work should add richer filtering, export, retention policy, and immutable audit guarantees if licensing becomes business-critical at higher scale.
