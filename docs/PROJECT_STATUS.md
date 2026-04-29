# Project Status

**Updated:** 2026-04-29

## Summary

The project is a functional MVP/alpha for a licensed digital products marketplace. The main business surfaces already exist: public storefront, cart, authentication, customer cabinet, admin catalog management, RollyPay payment flow, license generation, installation stages, order chat, Redis caching, and a separate Socket.io server for real-time events.

The project is not production-ready yet. It needs stabilization, release hardening, and documentation discipline before a public launch.

## Current Stage

**Stage:** MVP/alpha, feature-complete enough for internal demos and scenario testing.

**Why not beta yet:**

- Automated coverage is still smoke-level and should be expanded into a broader test suite.
- Production readiness items remain open: restore drill, observability, and staging validation of security headers.
- Documentation was incomplete before this update: no PRD, no ADR index, no roadmap.
- Some data fields use string statuses instead of typed enums, which increases regression risk.

## Implemented Capabilities

- Public storefront with home page, catalog, category pages, product pages, cart.
- Email/password auth via NextAuth v5 credentials provider.
- Role-based access for `ADMIN` and `CUSTOMER`.
- Customer cabinet with profile, orders, licenses, and fullscreen order page.
- Admin dashboard for products, categories, orders, licenses, settings, cache, SEO pages.
- Prisma/PostgreSQL domain model for users, products, orders, SEO, reviews, stages, messages.
- RollyPay payment creation and webhook handling.
- Runtime environment validation for required production URLs and secrets.
- Baseline Content Security Policy and security headers configured in Next.js.
- Redis-backed rate limiting for license activation, payment creation/webhook, chat, uploads, and password changes.
- RollyPay webhook signature freshness checks.
- Payment webhook event storage and idempotency guard for duplicate provider delivery.
- License keys generated for paid order items.
- License activation endpoint for domain/IP binding.
- Admin license tools for domain/IP edits, binding reset, suspension, and key reissue.
- License audit events for activation checks, rejections, binding changes, status changes, and key reissues.
- Client download API disabled for customer product delivery.
- Installation stage templates copied into order stages after payment.
- Critical smoke script for paid order, license, activation, audit, and installation-stage flow.
- API security smoke script for webhook signatures, webhook idempotency, chat ownership, upload ownership, and stage permission/order scoping.
- Customer/admin order chat with file upload support.
- Socket.io real-time layer bridged through Redis Pub/Sub.
- Redis caching helpers and cache invalidation helpers.
- Deployment guide for Dokploy-style deployment.
- Production persistent storage volumes and backup/restore runbook.
- Security audit document with remaining recommendations.

## Verification Snapshot

Command run:

```bash
npm run lint
npm run build
npm run smoke:critical
npm run smoke:api-security
```

Result on 2026-04-29: passed locally after API security smoke coverage was added.

## Key Risks

| Area | Risk | Priority |
| --- | --- | --- |
| Release quality | Build/lint pass, but automated coverage is still smoke-level | High |
| Security | Baseline CSP exists, but staging should validate real payment, image, and WebSocket origins; webhook IP allowlisting/replay policy should be revisited before production | High |
| Payments | Webhook signature and duplicate-delivery behavior have smoke coverage, but provider edge cases still need broader tests | Medium |
| Licenses | License activation/revocation and audit events need automated tests | High |
| Files | Persistent storage and backup runbook exist, but restore must be tested in staging | High |
| Real-time | Redis/WS failure modes need graceful fallback and monitoring | Medium |
| Data model | Statuses and roles are mostly strings instead of Prisma enums | Medium |
| Documentation | Docs now exist but must be maintained as decisions change | Medium |

## Recommended Next Step

Move from MVP/alpha to beta readiness:

1. Expand automated tests beyond smoke scripts: auth, checkout UI, admin APIs, and provider edge cases.
2. Add automated tests for license domain/IP edits, suspension, revocation, reissue, and audit events.
3. Harden production security: tune CSP from staging reports, define webhook IP/provider policy, and document logging policy.
4. Stabilize deployment: health checks, migrations, restore drill, monitoring, rollback procedure.
5. Run an end-to-end paid order scenario in a staging environment.
