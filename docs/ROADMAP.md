# Roadmap

**Updated:** 2026-04-29
**Current stage:** MVP/alpha

## Phase 0: Stabilize The Current MVP

**Goal:** Make the existing codebase reliable enough for beta testing.

- Fix `npm run lint`.
- Exclude generated/build output such as `ws-server/dist` from app linting.
- Add missing TypeScript types in storefront cards and webhook helpers.
- Clean up unused imports and variables.
- Add a minimal smoke test script/checklist for local QA.
- Keep `npm run smoke:critical` green for paid-order, license, audit, and installation-stage flows.
- Keep `npm run smoke:api-security` green for webhook signature, chat, upload, and stage permission checks.
- Verify the full scenario: create product, define stage templates, register customer, create payment, process webhook, generate license, bind domain/IP, chat, complete stages.
- Update README from the default Next.js template to project-specific onboarding.

## Phase 1: Beta Readiness

**Goal:** Prepare for controlled staging/beta use.

- Add automated tests for auth, cart/order creation, payment provider edge cases, license activation, and remaining admin APIs.
- Add automated regression tests for idempotent payment webhook handling.
- Expand rate limiting coverage and tune limits from real production traffic.
- Add stricter file upload limits and MIME validation across all upload paths.
- Expand environment validation with provider-specific checks as deployment requirements evolve.
- Convert roles and statuses from free-form strings to Prisma enums where practical.
- Add staging deployment checklist and rollback procedure.

## Phase 2: Production Hardening

**Goal:** Make the platform safe to operate publicly.

- Configure CSP after testing scripts, images, and external payment flows.
- Add error tracking and structured logging.
- Add uptime checks for Next.js, WS server, Redis, and PostgreSQL.
- Document and test database backup/restore.
- Document production storage for uploads and private installation packages.
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
