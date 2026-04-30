# Staging Validation Checklist

**Updated:** 2026-04-30

Use this checklist as the working artifact for the first staging deployment and every release candidate before promoting `dev` to `main`.

Related documents:

- `docs/STAGING_AND_ROLLBACK.md`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP_RESTORE.md`
- `.env.staging.example`

## Release Candidate

Record these values before deploying:

| Field | Value |
| --- | --- |
| Date | |
| Operator | |
| Candidate branch | `dev` |
| Candidate commit SHA | |
| GitHub Actions run URL | |
| Staging app URL | |
| Staging WebSocket URL | |
| Payment mode | RollyPay sandbox/test, or approved live test |
| Database migration range | |
| Rollback target SHA | |
| Backup artifacts | |

## Required Local Checks

Run from the repository root before the staging deploy:

```bash
npm run lint
npm run build
npm run smoke:critical
npm run smoke:auth-checkout
npm run smoke:admin-api
npm run smoke:chat-api
npm run smoke:api-security
cd ws-server && npm run build
cd ws-server && npm run smoke
npm audit --prefix ws-server --audit-level=high
```

Expected result:

- All commands pass.
- No Prisma migration is missing.
- No generated build output is staged.
- GitHub checks for `Next.js app` and `WebSocket server` are green.

## Staging Environment

Before remote Dockhand staging, run the Docker Desktop full-stack smoke from `docs/DEPLOYMENT.md`:

```bash
npm run docker:desktop:up
npm run docker:desktop:ps
curl -f http://localhost:3100
curl -f http://localhost:3101/health
npm run docker:desktop:down
```

Use `.env.staging.example` as the Dockhand environment checklist.

Required staging rules:

- Replace every `CHANGE_ME` value with a real staging secret.
- Do not reuse production database, Redis, uploads, private package, message upload, or backup volumes.
- Do not use production payment keys unless an intentional live-payment test has been approved.
- With `deploy/dockhand/compose.prod.yml`, staging runs with `NODE_ENV=production`; therefore `PAYMENT_PROVIDER=mock` is rejected by runtime validation. Use RollyPay sandbox/test credentials if available.
- `NEXT_PUBLIC_APP_URL` must match the staging app URL.
- `NEXT_PUBLIC_WS_URL` must match the public staging WebSocket URL.
- `WS_JWT_SECRET` must be identical for the app and WebSocket services.
- `NEXTAUTH_SECRET`, `WS_JWT_SECRET`, and `ROLLYPAY_WEBHOOK_SECRET` must be at least 32 characters.

Validate compose configuration with staging env loaded:

```bash
docker compose --env-file .env.staging.example -f deploy/dockhand/compose.prod.yml config --quiet
```

## Staging Deploy

- Deploy the staging Dockhand stack from `dev` or the exact release candidate SHA.
- Confirm the migration job completed successfully.
- Confirm app container is healthy and serving the staging URL.
- Confirm WebSocket service responds on `/health`.
- Confirm PostgreSQL health check passes.
- Confirm Redis health check passes.
- Confirm staging logs do not show missing env values or placeholder-secret validation errors.

## Full Paid-Order Scenario

Use a fresh customer account and a staging product.

### Admin Setup

- Log in as admin.
- Create or verify one active category.
- Create or verify one active product.
- Upload a product image.
- Upload or select a private installation package.
- Configure at least three stage templates:
  - `CLIENT_ACTION`
  - `ADMIN_WORK`
  - `CONFIRMATION`
- Confirm product is visible in catalog.

### Customer Checkout

- Register a new customer.
- Log in as the customer.
- Open the product page.
- Add product to cart.
- Create checkout payment.
- Complete payment with staging/sandbox provider flow.
- Confirm return URL opens the order page.
- Confirm order status becomes `PAID`.
- Confirm no duplicate order is created after refreshing the payment success/return flow.

### Webhook And Idempotency

- Confirm the payment provider delivered a successful webhook.
- Re-deliver the same webhook event if the provider dashboard supports it.
- Confirm duplicate delivery does not create duplicate licenses, duplicate stages, or extra product purchase increments.
- Confirm webhook logs do not expose raw secrets or signatures.

### License Flow

- Open customer licenses page.
- Confirm license exists for the paid order item.
- Activate the license with the expected domain and server IP.
- Confirm activation succeeds for the expected binding.
- Attempt activation with a different domain or IP.
- Confirm the unexpected binding is rejected.
- As admin, confirm license audit events were written.

### Installation Stages

- Confirm stage templates were copied to the paid order.
- As customer, submit required information for a `CLIENT_ACTION` stage.
- As admin, complete an `ADMIN_WORK` stage.
- As customer, confirm a `CONFIRMATION` stage.
- Confirm progress/status updates are visible on the order page.

### Chat And Realtime

- Open the same order as customer and admin in two browser sessions.
- Send customer message.
- Confirm admin sees the message without reload.
- Send admin message.
- Confirm customer sees the message without reload.
- Confirm read state updates after viewing messages.
- Upload a small message attachment.
- Confirm the attachment is accessible only to the order owner and admin.
- Restart the WebSocket service.
- Confirm the UI reconnects or fails gracefully without data loss.

## Storage, Backup, And Restore

- Confirm public uploads persist after app container restart.
- Confirm private installation package storage is not publicly accessible.
- Confirm message attachments persist after app container restart.
- Run a staging PostgreSQL backup from the Dockhand staging stack shell, or locally with staging env loaded:

```bash
docker compose --env-file .env.staging.example -f deploy/dockhand/compose.prod.yml --profile ops run --rm postgres-backup
```

- Run a staging storage backup from the Dockhand staging stack shell, or locally with staging env loaded:

```bash
docker compose --env-file .env.staging.example -f deploy/dockhand/compose.prod.yml --profile ops run --rm storage-backup
```

- Restore both backups into a disposable staging restore target.
- Confirm restored orders, licenses, product images, private packages, and chat attachments load correctly.

## Security And Browser Checks

- Open browser console on storefront, cart, checkout, cabinet order, admin product, and order chat pages.
- Confirm no unexpected CSP errors.
- Confirm WebSocket connects to the staging WebSocket URL.
- Confirm product images load from expected origins only.
- Confirm payment redirects use expected RollyPay/staging origins.
- Confirm no secrets, private paths, payment payloads, auth tokens, or webhook signatures appear in client output.
- Confirm customer cannot access `/admin`.
- Confirm unauthenticated user cannot access cabinet order pages.

## Release Gate

Mark the release candidate as ready for a `dev` to `main` release PR only when:

- GitHub checks are green.
- All required local checks passed.
- Staging deploy completed without startup validation errors.
- Full paid-order scenario passed.
- License domain/IP scenario passed.
- Chat and WebSocket scenario passed.
- Backup and restore drill passed or is explicitly deferred with owner/date.
- CSP issues are either fixed or documented with a follow-up issue.
- Rollback target SHA and backup artifacts are recorded.

## PR Notes Template

Use this in the release PR from `dev` to `main`:

```md
## Staging Validation

- Staging app:
- Staging WebSocket:
- Candidate SHA:
- GitHub Actions run:
- Payment mode:
- Database migrations:
- Backup artifacts:

## Results

- [ ] Local checks passed
- [ ] Staging deploy passed
- [ ] Full paid-order flow passed
- [ ] License activation/rejection passed
- [ ] Admin/customer chat passed
- [ ] WebSocket reconnect checked
- [ ] Backup/restore checked
- [ ] CSP/browser console checked

## Rollback

- Last good SHA:
- Rollback notes:
- Data restore needed: yes/no
```
