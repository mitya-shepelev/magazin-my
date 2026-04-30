# Staging Validation And Rollback Runbook

**Updated:** 2026-04-30

## Purpose

This runbook defines the release gate between `dev` and `main`.

Use it before beta/public launch and before every production release that changes payments, licenses, installation stages, uploads, auth, WebSocket behavior, database schema, or deployment configuration.

Use `docs/STAGING_CHECKLIST.md` as the working checklist/evidence artifact for each staging run.

## Environment Model

- Local development runs on the developer machine with Docker Desktop.
- Feature branches merge into `dev` through PRs after CI checks pass.
- Staging should deploy from `dev` or from the exact release candidate commit.
- Production should deploy from `main`.
- A release PR from `dev` to `main` is the deliberate production promotion step.

Staging and production must not share databases, Redis data, upload volumes, private package storage, message attachments, payment secrets, or webhook endpoints.

## Staging Prerequisites

- Dedicated Dockhand stack or compose project for staging.
- Dedicated staging domain, for example `staging.example.com`.
- Dedicated WebSocket domain, for example `wss://ws-staging.example.com`.
- Separate PostgreSQL and Redis volumes from production.
- Separate storage volumes for public uploads, private installation packages, order message attachments, and backup artifacts.
- Staging values for `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WS_URL`, and CSP-related origins.
- Non-production `NEXTAUTH_SECRET`, `WS_JWT_SECRET`, `REDIS_PASSWORD`, and payment webhook secret.
- RollyPay sandbox/test credentials if available.
- No production payment keys in staging unless a deliberate live-payment test has been approved.

Important: `deploy/dockhand/compose.prod.yml` runs the app with `NODE_ENV=production`, so `PAYMENT_PROVIDER=mock` is rejected by startup validation. Use RollyPay sandbox/test credentials for Dockhand staging, or create a dedicated non-production compose override before using mock payments in a remote staging stack.

## Pre-Deploy Checklist

Run before deploying a release candidate to staging:

- Confirm the feature PRs are merged into `dev`.
- Confirm GitHub checks are green for `Next.js app` and `WebSocket server`.
- Pull the latest `dev` locally.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run smoke:critical`.
- Run `npm run smoke:auth-checkout`.
- Run `npm run smoke:admin-api`.
- Run `npm run smoke:chat-api`.
- Run `npm run smoke:api-security`.
- Run `cd ws-server && npm run build`.
- Run `cd ws-server && npm run smoke`.
- Run `npm audit --prefix ws-server --audit-level=high`.
- Confirm new Prisma schema changes have migrations committed.
- Review `docs/DEPLOYMENT.md` and Dockhand environment variables for new required values.
- Validate compose syntax with the target environment values:

```bash
docker compose --env-file .env.staging.example -f deploy/dockhand/compose.prod.yml config --quiet
```

If staging already contains useful test data, take a backup before destructive testing:

```bash
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm postgres-backup
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm storage-backup
```

## Staging Deploy

1. Point the staging Dockhand stack to `dev` or the release candidate commit.
2. Set all staging environment variables in Dockhand.
3. Deploy the stack.
4. Confirm migrations complete before the app starts serving traffic.
5. Confirm the app, WebSocket server, PostgreSQL, and Redis are healthy.

Health checks:

- `GET /` returns the storefront.
- `GET /api/auth/session` responds.
- `GET /health` on the WebSocket service returns `{"status":"ok"}`.
- PostgreSQL readiness passes.
- Redis `PING` returns `PONG`.

## Staging Validation Checklist

### Core App

- Open the home page.
- Open catalog and product pages.
- Add a product to cart.
- Register or log in as a customer.
- Log in as an admin.
- Confirm protected customer cabinet pages require authentication.
- Confirm protected admin pages require admin role.

### Product And Storage

- Create or edit a product in admin.
- Upload and view a product image.
- Upload a private installation package.
- Confirm private installation packages are not served from a public URL.
- Send an order chat attachment.
- Confirm the attachment is visible only to the order owner and admins.

### Payment, License, And Order Flow

- Create a checkout payment with the configured staging payment provider.
- Process a successful payment webhook.
- Re-send the same webhook event and confirm no duplicate licenses, stages, or purchase counters are created.
- Confirm the order becomes `PAID`.
- Confirm license keys are generated for paid order items.
- Activate a license with the expected domain and IP.
- Confirm activation rejects a different domain/IP when binding rules require it.
- Confirm license audit events are recorded.
- Confirm installation stages are copied from product templates.
- Move stages through client action, admin work, and confirmation states.

### Realtime Chat

- Open the same order as customer and admin.
- Send messages from both sides.
- Confirm messages appear in real time.
- Confirm typing and presence behavior if enabled.
- Restart the WebSocket service and confirm the UI reconnects or fails gracefully.

### Security Headers And CSP

- Open the browser console during the full staging scenario.
- Confirm there are no unexpected CSP blocks for app assets, product images, WebSocket connections, or payment redirects.
- Confirm WebSocket connects to the staging `NEXT_PUBLIC_WS_URL`.
- Confirm no secrets, tokens, raw payment payloads, private file paths, or webhook signatures appear in client output.

### Backup And Restore Drill

- Run a PostgreSQL backup in staging.
- Run a file storage backup in staging.
- Restore both into a disposable staging stack or staging restore target.
- Confirm the restored stack can load orders, licenses, uploaded product images, private packages, and chat attachments.

Use `docs/BACKUP_RESTORE.md` for restore commands and validation details.

## Release To Production

After staging validation passes:

1. Open a release PR from `dev` to `main`.
2. Include staging validation notes in the PR description.
3. Confirm required checks pass.
4. Review database migrations and rollback implications.
5. Merge the release PR into `main`.
6. Take fresh production backups:

```bash
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm postgres-backup
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm storage-backup
```

7. Deploy `main` in Dockhand.
8. Run the post-deploy validation checklist.

## Post-Deploy Validation

- Home page and product pages load.
- Customer login works.
- Admin login works.
- Cart and checkout creation work.
- Payment webhook endpoint accepts a valid provider event.
- Duplicate webhook delivery remains idempotent.
- License page shows expected licenses.
- License activation works for an expected domain/IP.
- Customer/admin order chat works.
- WebSocket health is green.
- PostgreSQL and Redis health are green.
- Upload and private package paths still resolve through the expected volumes.
- No new CSP errors appear in production browser console.

## Rollback Decision Guide

Use the least destructive rollback that removes customer impact.

| Situation | Preferred action |
| --- | --- |
| App-only regression, no destructive migration | Redeploy the last good Git SHA or tag. |
| WebSocket-only regression | Redeploy the last good WS/app SHA and confirm `WS_JWT_SECRET` compatibility. |
| CSP or environment regression | Fix environment if the value is wrong; otherwise hotfix in Git and redeploy. |
| Payment creation or webhook regression | Disable public checkout if needed, preserve provider events/logs, redeploy last good SHA or hotfix. |
| Database migration/data regression | Stop app traffic, restore database backup, restore file storage if needed, redeploy last good SHA. |
| Storage path regression | Stop writes, restore/mount the previous volumes, redeploy last good SHA after confirming paths. |

## App Rollback Procedure

Use this when no database restore is required:

1. Identify the bad SHA, last good SHA, and release PR.
2. In Dockhand, point the production stack to the last good SHA or tag.
3. Rebuild/redeploy the stack.
4. Confirm the migration service does not apply new destructive migrations.
5. Restart the app and WebSocket services.
6. Run post-rollback validation.

Local equivalent for an operator shell:

```bash
git fetch origin
git checkout <last-good-sha>
docker compose -f deploy/dockhand/compose.prod.yml up -d --build app ws
```

Prefer the Dockhand UI or its configured deployment flow for production. The commands above document the underlying operation and are not a reason to bypass Dockhand history.

## Data Restore Rollback Procedure

Use this only when the release changed or corrupted data.

1. Put the application in maintenance mode or temporarily block public traffic.
2. Stop app and WebSocket services to prevent writes.
3. Preserve logs and webhook payload references needed for investigation.
4. Restore PostgreSQL from the selected backup.
5. Restore file storage if uploaded files or private packages were affected.
6. Deploy the last good Git SHA or a data-compatible hotfix.
7. Start services.
8. Run post-rollback validation.
9. Reconcile any payments, webhooks, messages, or orders received during the incident window.

Use `docs/BACKUP_RESTORE.md` for the exact PostgreSQL and file storage restore commands.

## Post-Rollback Validation

- App home page loads.
- Customer login works.
- Admin login works.
- Existing order pages load.
- Existing licenses are visible.
- License activation returns the expected result.
- Payment creation and webhook handling are either working or intentionally disabled.
- Chat history loads.
- New chat message delivery works if the app is open.
- Uploaded product images load.
- Private installation packages remain private.
- WebSocket health is green.
- No new migration keeps retrying or failing.

## Incident Notes

Record these details in the incident or release notes:

- Start time and end time.
- Bad SHA and last good SHA.
- Release PR number.
- Migration names involved.
- Backup artifact names used.
- Customer impact.
- Payment/provider impact.
- Data reconciliation actions.
- Follow-up fixes and tests required.
