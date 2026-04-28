# Project Status

**Updated:** 2026-04-28

## Summary

The project is a functional MVP/alpha for a digital products marketplace. The main business surfaces already exist: public storefront, cart, authentication, customer cabinet, admin catalog management, YooKassa payment flow, paid downloads, installation stages, order chat, Redis caching, and a separate Socket.io server for real-time events.

The project is not production-ready yet. It needs stabilization, release hardening, and documentation discipline before a public launch.

## Current Stage

**Stage:** MVP/alpha, feature-complete enough for internal demos and scenario testing.

**Why not beta yet:**

- `npm run lint` fails with existing errors.
- There is no automated test suite.
- Production readiness items remain open: rate limiting, CSP, secrets validation, storage strategy, observability, backup/restore process.
- Documentation was incomplete before this update: no PRD, no ADR index, no roadmap.
- Some data fields use string statuses instead of typed enums, which increases regression risk.
- The WebSocket server has generated `dist/` files included in the app lint surface.

## Implemented Capabilities

- Public storefront with home page, catalog, category pages, product pages, cart.
- Email/password auth via NextAuth v5 credentials provider.
- Role-based access for `ADMIN` and `CUSTOMER`.
- Customer cabinet with profile, orders, downloads, and fullscreen order page.
- Admin dashboard for products, categories, orders, settings, cache, SEO pages.
- Prisma/PostgreSQL domain model for users, products, orders, SEO, reviews, stages, messages.
- YooKassa payment creation and webhook handling.
- Digital download API with paid-order ownership checks.
- Installation stage templates copied into order stages after payment.
- Customer/admin order chat with file upload support.
- Socket.io real-time layer bridged through Redis Pub/Sub.
- Redis caching helpers and cache invalidation helpers.
- Deployment guide for Dokploy-style deployment.
- Security audit document with remaining recommendations.

## Verification Snapshot

Command run:

```bash
npm run lint
```

Result on 2026-04-28: failed with 36 errors and 51 warnings.

Main categories:

- `@typescript-eslint/no-explicit-any` in storefront and API files.
- `react-hooks/set-state-in-effect` in client components and hooks.
- `prefer-const` in upload/chat code.
- `react/no-unescaped-entities` on the home page.
- `ws-server/dist/**/*.js` is being linted as source output.
- Multiple unused imports/variables and `<img>` optimization warnings.

## Key Risks

| Area | Risk | Priority |
| --- | --- | --- |
| Release quality | Lint fails and there are no tests | High |
| Security | No rate limiting; CSP not configured; webhook IP logic should be revisited before production | High |
| Payments | Webhook handling should be idempotent and covered by tests | High |
| Files | Upload/download storage paths need production strategy and backup policy | High |
| Real-time | Redis/WS failure modes need graceful fallback and monitoring | Medium |
| Data model | Statuses and roles are mostly strings instead of Prisma enums | Medium |
| Documentation | Docs now exist but must be maintained as decisions change | Medium |

## Recommended Next Step

Move from MVP/alpha to beta readiness:

1. Fix lint and exclude generated/build output from linting.
2. Add a smoke test checklist and automated tests for auth, checkout, webhook, downloads, order stages, and chat APIs.
3. Harden production security: rate limiting, CSP, secrets validation, stricter webhook verification, logging policy.
4. Stabilize deployment: health checks, migrations, backups, monitoring, rollback procedure.
5. Run an end-to-end paid order scenario in a staging environment.
