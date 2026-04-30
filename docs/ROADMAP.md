# Roadmap

**Updated:** 2026-04-30
**Current stage:** MVP/alpha

## Phase 0: Stabilize The Current MVP

**Goal:** Make the existing codebase reliable enough for beta testing.

- Fix `npm run lint`.
- Exclude generated/build output such as `ws-server/dist` from app linting.
- Add missing TypeScript types in storefront cards and webhook helpers.
- Clean up unused imports and variables.
- Add a minimal smoke test script/checklist for local QA.
- Keep `npm run smoke:critical` green for paid-order, license, audit, and installation-stage flows.
- Keep `npm run smoke:auth-checkout` green for registration, protected checkout, mock payment success, and order access scoping.
- Keep `npm run smoke:admin-api` green for product, stage-template, and cache admin endpoints.
- Keep `npm run smoke:chat-api` green for customer/admin messages, read receipts, cache invalidation, and Redis realtime events.
- Keep `npm run smoke:api-security` green for webhook signature/idempotency, chat, upload, and stage permission checks.
- Verify the full scenario: create product, define stage templates, register customer, create payment, process webhook, generate license, bind domain/IP, chat, complete stages.
- Update README from the default Next.js template to project-specific onboarding.

## Phase 1: Beta Readiness

**Goal:** Prepare for controlled staging/beta use.

- Add automated tests for checkout UI, payment provider edge cases, license activation, and remaining admin surfaces.
- Add WebSocket server tests for connection auth, room joins, delivery events, and reconnect behavior.
- Add broader automated regression tests for payment provider edge cases beyond duplicate webhook delivery.
- Expand rate limiting coverage and tune limits from real production traffic.
- Add stricter file upload limits and MIME validation across all upload paths.
- Expand environment validation with provider-specific checks as deployment requirements evolve.
- Convert roles and statuses from free-form strings to Prisma enums where practical.
- Execute the documented staging deployment checklist and rollback drill.

## Phase 2: Production Hardening

**Goal:** Make the platform safe to operate publicly.

- Tune CSP after staging tests cover scripts, images, WebSocket, and external payment flows.
- Add error tracking and structured logging.
- Add uptime checks for Next.js, WS server, Redis, and PostgreSQL.
- Test database and file storage restore from the documented backup runbook.
- Test app rollback and data restore rollback from the documented staging/rollback runbook.
- Validate production storage volumes for uploads, private installation packages, and order message attachments.
- Expand admin audit log coverage for sensitive changes beyond licenses.
- Add operational runbook for incidents.

## Phase 3: Customer Experience

**Goal:** Improve conversion and post-purchase clarity.

- Improve product media handling with optimized images.
- Add email notifications for payment success, new admin messages, and stage changes.
- Add customer-facing order timeline.
- Add clearer license/domain/IP status to the order workspace.
- Add better empty states and error states in cabinet pages.
- Add search/filtering in catalog and admin order list.
- Add support end-date visibility and reminders.

## Phase 4: Admin Efficiency

**Goal:** Reduce manual work for admins.

- Add order assignment and internal admin notes.
- Add saved reply templates for chat.
- Add bulk product/category actions.
- Add installation stage presets and cloning.
- Add admin metrics: paid orders, revenue, active installations, response time.
- Add admin tools for license domain/IP edits, suspension, revocation, and reissue.
- Add advanced license audit filters, export, and retention policy.

## Phase 5: Growth Features

**Goal:** Expand the business surface after the core is stable.

- Add coupons/promocodes.
- Add signed offline grace tokens for installed products when the license server is temporarily unavailable.
- Add product bundles.
- Add customer reviews tied to purchases.
- Add analytics events and conversion funnel reporting.
- Add optional external storage integration for private installation packages.

## Immediate Definition Of Done

The project can move from MVP/alpha to beta when:

- Lint and build pass.
- A staged paid-order flow is verified end to end.
- Critical security items are closed.
- Deployment, backup, and rollback docs are usable.
- At least the highest-risk API routes have tests.
