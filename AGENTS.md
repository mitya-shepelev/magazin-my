# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Digital products marketplace (Next.js 16) with real-time chat between customers and admins. Customers purchase digital products (web apps, mobile apps), and admins manage installation stages with real-time communication.

Current maturity: MVP/alpha. The core product flows exist, but the project still needs lint/build cleanup, tests, production hardening, and staging validation before beta or public launch.

## Product Documentation

- `docs/PROJECT_STATUS.md` - Current stage, implemented capabilities, risks, and verification snapshot.
- `docs/prd/PRD.md` - Product requirements, MVP scope, gaps, and success criteria.
- `docs/ROADMAP.md` - Development roadmap from stabilization to growth features.
- `docs/adr/README.md` - ADR index and template.
- `docs/adr/*.md` - Architecture decisions for the main technical choices.
- `docs/DEPLOYMENT.md` - Deployment guide.
- `docs/BACKUP_RESTORE.md` - Production backup and restore runbook.
- `docs/STAGING_AND_ROLLBACK.md` - Staging validation and rollback runbook.
- `docs/STAGING_CHECKLIST.md` - Per-release staging validation checklist and release evidence template.
- `.env.staging.example` - Staging Dockhand environment template without real secrets.
- `docs/audits/` - Security and technical audits.
- `docs/plans/` - Historical implementation plans.
- `.github/workflows/ci.yml` - GitHub Actions CI.
- `.github/PULL_REQUEST_TEMPLATE/pull_request_template.md` - PR checklist.
- `deploy/dockhand/compose.prod.yml` - Production Compose/stack definition for Dockhand using GHCR images.
- `docs/DEPLOYMENT.md` - Production environment variable reference for Dockhand.

Keep these docs in sync when architecture, product scope, deployment, or operational assumptions change.

## Commands

```bash
# Development
npm run dev              # Start Next.js (port 3000)
cd ws-server && npm run dev  # Start WebSocket server (port 3001)
cd ws-server && npm run smoke # Run WebSocket server smoke test

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema changes (no migration)
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Create admin user

# Build & Lint
npm run build
npm run lint
npm run smoke:critical
npm run smoke:auth-checkout
npm run smoke:admin-api
npm run smoke:chat-api
npm run smoke:api-security
```

## Git Workflow

- Never push directly to `main`.
- `main` is treated as the protected production/stable branch.
- All active integration work goes through the `dev` branch.
- Do not push directly to `dev`; merge into `dev` only through PRs.
- `dev` is treated as the protected integration branch.
- Feature work must be done in a separate feature branch created from `dev`.
- Use a descriptive branch name, preferably with the Codex prefix when Codex creates it, for example `codex/add-order-notifications`.
- After a feature is complete, open a PR from the feature branch into `dev`.
- Run required checks before requesting or completing review.
- Merge into `dev` only after PR review/checks are acceptable.
- Create a release PR from `dev` into `main` when preparing a production/stable release.
- Merge from `dev` to `main` only as a deliberate release action, not during normal feature development.
- Do not rewrite shared history or force-push shared branches unless explicitly approved.
- Configure branch protection for both `main` and `dev` in GitHub.
- Required branch protection should include PR review, stale review dismissal, conversation resolution, no force pushes, no branch deletion, and required CI checks.

Required GitHub Actions checks:

- `Next.js app`
- `WebSocket server`
- `Build and publish Docker images` (builds on PRs, publishes on pushes to `dev` and `main`)

Recommended flow:

```bash
git switch dev
git pull
git switch -c codex/feature-name
# implement and verify
git push -u origin codex/feature-name
# open PR: codex/feature-name -> dev
```

### Pull Request Checklist

Every PR should use `.github/PULL_REQUEST_TEMPLATE/pull_request_template.md`.

Minimum expectations:

- Explain what changed and why.
- Mark the PR target: feature PR to `dev` or release PR from `dev` to `main`.
- Run or document `npm run lint`.
- Run or document `npm run build`.
- Run or document `npm run smoke:critical` when changing payments, orders, licenses, installation stages, or related Prisma models.
- Build `ws-server` when WebSocket code changes.
- Include Prisma migrations when schema changes.
- Include manual QA notes for payment, auth, licenses, order stages, chat, or user-facing UI.
- Build and smoke-test `ws-server` when WebSocket code changes.

Known verification status as of 2026-04-30:
- `npm run lint` passes.
- `npm run build` passes.
- `npm run smoke:critical` covers the paid order, license, activation, audit, and installation-stage flow.
- `npm run smoke:auth-checkout` covers registration, protected checkout, mock payment success, order access scoping, and admin API blocking.
- `npm run smoke:admin-api` covers product update, stage template CRUD/reorder, and cache admin endpoints.
- `npm run smoke:chat-api` covers customer/admin messages, read receipts, cache invalidation, and Redis realtime events.
- `cd ws-server && npm run smoke` covers WebSocket health, auth, room access, presence, typing, and Redis event delivery.
- Broader automated tests are still needed for UI checkout, WebSocket reconnect behavior, and deeper auth edge cases.

## Architecture

### Two-Service Real-time System

```
Next.js App (3000)  ←→  Redis Pub/Sub  ←→  WS Server (3001)
     │                       │                    │
     └──── PostgreSQL ───────┴──── Clients via Socket.io
```

**Flow:** REST API saves to DB → publishes to Redis → WS server broadcasts to connected clients via Socket.io.

### Key Directories

- `ws-server/` - Standalone Socket.io server (separate package.json)
- `src/lib/realtime.ts` - Redis Pub/Sub event publisher (used by API routes)
- `src/lib/socket.ts` - Socket.io client singleton
- `src/hooks/useOrderChat.ts` - Main chat hook (messages, typing, presence)
- `src/generated/prisma/` - Prisma client output (don't edit)
- `docs/adr/` - Architecture decision records
- `docs/prd/` - Product requirements
- `docs/plans/` - Historical design notes and implementation plans

### Route Groups

- `(shop)/` - Public storefront (catalog, product pages, cart)
- `(auth)/` - Login/register pages
- `admin/` - Admin dashboard (requires ADMIN role)
- `cabinet/(main)/` - Customer account with sidebar nav
- `cabinet/(fullscreen)/` - Customer pages without sidebar (e.g., order chat)

### Authentication

NextAuth v5 with credentials provider. Session strategy: JWT.
- User roles: `ADMIN`, `CUSTOMER`
- Custom session fields: `id`, `role`, `name`
- WebSocket auth: `/api/auth/ws-token` generates short-lived JWT for Socket.io connection
- Admin/cabinet route protection lives in `src/middleware.ts`

### Caching Layer

Redis caching with `src/lib/cache.ts`:
- `cached(key, fetcher, ttl)` - Cache with TTL
- `invalidate(key)` / `invalidatePattern(pattern)` - Cache invalidation
- Keys defined in `src/lib/cache-keys.ts`

### Installation Stages System

Products have `StageTemplate` records defining installation steps. When order is paid, templates are copied to `InstallationStage` records for that order. Stage types:
- `CLIENT_ACTION` - Customer must provide data
- `ADMIN_WORK` - Admin performs work
- `CONFIRMATION` - Customer confirms completion

Important implementation note: payment webhook processing records provider events in `PaymentWebhookEvent` and must remain idempotent so duplicate provider delivery does not create duplicate licenses, installation stages, or purchase counters.

## Key Patterns

### Adding Real-time Events

After DB save in API route, call realtime publisher:
```typescript
import { realtime } from "@/lib/realtime"
await realtime.publishMessage(orderId, message)
```

### Prisma Client Import

```typescript
import { db } from "@/lib/db"
```

Do not edit generated Prisma files in `src/generated/prisma/`.

### Form Validation

Using Zod v4 with react-hook-form via @hookform/resolvers.

### UI Components

shadcn/ui components in `src/components/ui/`. Import from `@/components/ui/button` etc.

### API And Server Actions

- Check auth/role in every mutating admin action or admin API route.
- For customer-owned resources, verify `order.userId === session.user.id` unless the user is an admin.
- Prefer Zod schemas or explicit validation for request bodies.
- Invalidate Redis cache after writes that affect cached data.
- Publish realtime events only after the database write succeeds.

### File Handling

- Sanitize filenames before storage.
- Keep private installation packages outside public web paths.
- Validate MIME type and file size on every upload endpoint.
- Do not log sensitive file paths, payment payloads, secrets, or auth tokens in production.

### Data Model

Several status and role fields are currently strings. Treat these values as controlled constants:
- Roles: `ADMIN`, `CUSTOMER`
- Order status: `PENDING`, `PAID`, `CANCELLED`, `REFUNDED`
- Installation status: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SUPPORT`
- Stage type: `CLIENT_ACTION`, `ADMIN_WORK`, `CONFIRMATION`
- Stage status: `PENDING`, `IN_PROGRESS`, `COMPLETED`

Prefer Prisma enums in future schema changes when the migration risk is acceptable.

## Environment Variables

Required for development:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Session encryption
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis connection
- `WS_JWT_SECRET` - Shared secret between Next.js and WS server
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL (e.g., `ws://localhost:3001`)

Production startup validates required environment variables. Do not bypass this validation with placeholder secrets; fix Dockhand/GitHub environment values instead.
Redis is used for cache, realtime pub/sub, and API rate limiting.

## Local Development Setup

All development is local-first. Do not assume remote production/staging access for everyday work.

The local environment should use Docker Desktop, which is already installed on the developer machine. Prefer Docker Desktop for local infrastructure services such as Redis, PostgreSQL, and the WebSocket stack when they are containerized.

Preferred local flow:

1. Start PostgreSQL and Redis in Docker Desktop: `npm run docker:local:up`
2. Apply migrations: `npm run db:migrate`
3. Start WS server: `cd ws-server && npm run dev`
4. Start Next.js: `npm run dev`

Useful Docker commands:

```bash
npm run docker:local:up
npm run docker:local:ps
npm run docker:local:down
npm run docker:desktop:up
npm run docker:desktop:ps
npm run docker:desktop:down
```

`scripts/docker-local.mjs` reads `DATABASE_URL` from `.env` and passes the parsed database name, user, password, and port into `docker-compose.local.yml`. Do not use ServBay PostgreSQL or Redis for normal project development.

Use `docker-compose.docker-desktop.yml` for a local full-stack Docker Desktop smoke before trying Dockhand. It runs app, WebSocket, PostgreSQL, Redis, and migrations with mock payments on local ports `3100` and `3101`. Do not use that compose file for remote staging or production.

If Docker images are not present locally, Docker Desktop must be able to pull `postgres:16-alpine`, `redis:7-alpine`, and `public.ecr.aws/docker/library/node:20-alpine`.

If a full local Docker setup is available, prefer:

```bash
docker compose up -d
```

or, for the WebSocket/Redis compose file:

```bash
cd ws-server
docker compose up -d
```

## Production Deployment

Production deploys through Dockhand from the GitHub repository. GitHub stores the source code, CI workflow, PR history, and deployment definitions; Dockhand pulls the repository and runs the Compose/stack configuration.

GitHub Actions builds production Docker images on PRs and publishes them to GitHub Container Registry on pushes to `dev` and `main`. Dockhand should pull these images instead of building app images on the production host.

Published project images:

- `ghcr.io/mitya-shepelev/magazin-my-app:<branch-or-sha-tag>`
- `ghcr.io/mitya-shepelev/magazin-my-migrate:<branch-or-sha-tag>`
- `ghcr.io/mitya-shepelev/magazin-my-ws:<branch-or-sha-tag>`

Use `:main` for normal production deploys, `:dev` for staging deploys, and `:sha-<short-sha>` for exact rollback or release pinning.

Primary production files:

- `deploy/dockhand/compose.prod.yml`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP_RESTORE.md`
- `docs/STAGING_AND_ROLLBACK.md`

Production rules:

- Do not edit production containers manually in Dockhand when the change should live in Git.
- Keep production secrets in Dockhand environment settings, not in committed files.
- Deploy normal releases from `main`.
- Use `dev` or a dedicated staging stack for pre-production validation.
- Run Prisma migrations as part of the deploy flow before serving new app code.
- Keep PostgreSQL, Redis, uploads, and private installation packages on persistent volumes or managed services with backups.
- Configure Dockhand registry credentials for `ghcr.io` if packages are private.
- Keep order message attachments on a persistent private volume with backups.
- Validate release candidates in a staging Dockhand stack before promoting `dev` to `main`.
- Follow `docs/STAGING_AND_ROLLBACK.md` for staging validation, production release, and rollback decisions.

## Before Shipping Changes

Run the narrowest useful checks for the change. Prefer:

```bash
npm run lint
npm run build
npm run smoke:critical
npm run smoke:auth-checkout
npm run smoke:admin-api
npm run smoke:chat-api
npm run smoke:api-security
cd ws-server && npm run smoke
```

If those fail on pre-existing issues, record the exact failure category in the final handoff. Do not claim production readiness while lint/build are red.

For frontend work, start the dev server and verify the changed screen in a browser when feasible.

For payment, license, auth, WebSocket, or stage-flow changes, include a manual scenario checklist in the handoff if automated tests are not available. For license changes, verify customer license visibility, activation API behavior, admin license controls, and license audit events. Use `npm run smoke:critical` for payment/order/license/stage changes, `npm run smoke:auth-checkout` for registration/checkout/order-access changes, `npm run smoke:admin-api` for product/stage-template/cache admin endpoint changes, `npm run smoke:chat-api` for customer/admin message and read-receipt changes, `cd ws-server && npm run smoke` for WebSocket server changes, and `npm run smoke:api-security` for webhook signature, chat, upload, and stage permission changes.

## Current Release Priorities

1. Expand smoke coverage into focused tests for checkout UI behavior and WebSocket reconnect behavior.
2. Keep `npm run lint`, `npm run build`, `npm run smoke:critical`, `npm run smoke:auth-checkout`, `npm run smoke:admin-api`, `npm run smoke:chat-api`, `npm run smoke:api-security`, and `cd ws-server && npm run smoke` green on `dev`.
3. Harden production security: staging-tune CSP, stricter webhook verification, and provider IP policy.
4. Run a staging restore/rollback drill and define monitoring.
5. Validate one complete paid-order flow in staging.
