# ADR-0003: NextAuth Credentials With JWT Sessions

**Status:** Accepted  
**Date:** 2026-04-28

## Context

The marketplace needs customer and admin authentication. The current product does not require OAuth providers, organization accounts, or external identity management.

## Decision

Use NextAuth v5 with the credentials provider and JWT session strategy. Store users in PostgreSQL with bcrypt password hashes and role values such as `ADMIN` and `CUSTOMER`.

## Consequences

- Authentication stays simple and self-contained.
- Middleware can protect admin and cabinet routes from a JWT token.
- WebSocket auth can issue short-lived tokens from the existing session.
- Password policy, rate limiting, and account recovery must be implemented by the app.
- Roles should eventually become typed Prisma enums to reduce string drift.
