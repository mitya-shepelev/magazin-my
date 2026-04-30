# Deployment Guide

## Production Direction

Production deployment is standardized on Dockhand with repository-managed Compose/stack files.

GitHub is the source of truth for:

- application source code
- CI workflow
- pull request review history
- production Compose/stack definitions

Dockhand is responsible for:

- pulling the repository-managed Compose/stack definition
- pulling prebuilt production Docker images from GitHub Container Registry
- running the production stack
- storing production environment variables/secrets
- managing runtime services and logs

Primary files:

- `deploy/dockhand/compose.prod.yml`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP_RESTORE.md`
- `docs/STAGING_AND_ROLLBACK.md`
- `docs/STAGING_CHECKLIST.md`
- `.env.staging.example`

Normal release path:

1. Develop locally.
2. Merge feature PRs into `dev`.
3. Validate `dev` in staging.
4. Open a release PR from `dev` to `main`.
5. Merge release PR after checks/review.
6. Deploy `main` in Dockhand.

Staging and rollback procedures live in `docs/STAGING_AND_ROLLBACK.md`. Use `docs/STAGING_CHECKLIST.md` as the per-release evidence checklist and `.env.staging.example` as the Dockhand staging environment template before beta/public launch and before production releases that touch payments, licenses, installation stages, uploads, auth, WebSocket behavior, database schema, or deployment configuration.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│     Redis       │◀────│  WS Server      │
│   (Port 3000)   │     │   (Port 6379)   │     │  (Port 3001)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      ▲                        │
         │                      │                        │
         ▼                      │                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │   Pub/Sub       │     │   Socket.io     │
│   (Port 5432)   │     │   Events        │     │   Clients       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Deployment With Dockhand

### 1. Prerequisites

- Dockhand installed and configured
- Domain name configured
- SSL certificates configured
- GitHub repository access configured in Dockhand

### 2. Configure Stack

Use the production Compose file:

```bash
deploy/dockhand/compose.prod.yml
```

The stack includes:

- Next.js app
- migration job
- optional admin bootstrap job
- WebSocket server
- PostgreSQL
- Redis
- persistent volumes for database, Redis, uploads, and private installation packages
- one-off backup profiles for PostgreSQL and file storage

The production Compose file does not build application images on the Dockhand host. GitHub Actions builds and publishes the project images to GitHub Container Registry (GHCR), and Dockhand pulls those immutable deployment artifacts.

Default production images:

| Service | Default image |
| --- | --- |
| `app` | `ghcr.io/mitya-shepelev/magazin-my-app:main` |
| `migrate` | `ghcr.io/mitya-shepelev/magazin-my-migrate:main` |
| `ws` | `ghcr.io/mitya-shepelev/magazin-my-ws:main` |

GitHub Actions builds these images for pull requests and publishes them on pushes to `dev` and `main`. Published images also receive commit-addressable tags in the form `sha-<short-sha>` for rollback and auditability.

If you need to deploy a specific release artifact, override these optional Dockhand environment variables:

| Variable | Purpose |
| --- | --- |
| `APP_IMAGE` | Next.js app image override |
| `MIGRATE_IMAGE` | Prisma migration image override |
| `WS_IMAGE` | WebSocket server image override |

For a production release from `main`, the defaults are normally enough. For staging from `dev`, set the image overrides to `:dev` tags or to matching `sha-<short-sha>` tags.

If GHCR packages are private, configure Dockhand's registry credentials for `ghcr.io` before deploy. A fine-grained token should have package read access only.

### 3. Configure Environment Variables

| Variable | Source |
| --- | --- |
| `POSTGRES_DB` | Dockhand environment |
| `POSTGRES_USER` | Dockhand environment |
| `POSTGRES_PASSWORD` | Dockhand secret/environment |
| `APP_IMAGE` | Optional image override; defaults to `ghcr.io/mitya-shepelev/magazin-my-app:main` |
| `MIGRATE_IMAGE` | Optional image override; defaults to `ghcr.io/mitya-shepelev/magazin-my-migrate:main` |
| `WS_IMAGE` | Optional image override; defaults to `ghcr.io/mitya-shepelev/magazin-my-ws:main` |
| `NEXTAUTH_URL` | Production app URL |
| `NEXTAUTH_SECRET` | Dockhand secret/environment |
| `AUTH_TRUST_HOST` | `true` when running behind Dockhand/reverse proxy or local Docker port mapping |
| `REDIS_PASSWORD` | Dockhand secret/environment |
| `WS_JWT_SECRET` | Dockhand secret/environment; must match the WS service JWT secret |
| `NEXT_PUBLIC_WS_URL` | Public WebSocket URL |
| `PAYMENT_PROVIDER` | `rollypay` in production, `mock` only for local testing |
| `PAYMENT_CURRENCY` | Payment currency; currently `RUB` for RollyPay |
| `ROLLYPAY_API_URL` | RollyPay API base URL, defaults to `https://rollypay.io` |
| `ROLLYPAY_API_KEY` | RollyPay API key from terminal setup |
| `ROLLYPAY_WEBHOOK_SECRET` | RollyPay webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Production app URL |
| `NEXT_PUBLIC_APP_NAME` | Public app name |
| `ADMIN_EMAIL` | Optional first-admin/bootstrap email |
| `ADMIN_PASSWORD` | Optional first-admin/bootstrap password; store as a Dockhand secret |
| `ADMIN_NAME` | Optional first-admin/bootstrap display name |
| `ADMIN_BOOTSTRAP_UPDATE_PASSWORD` | `false` by default; set `true` only to intentionally rotate the admin password |
| `UPLOAD_DIR` | Public upload root; defaults to `/app/public/uploads` in production |
| `DOWNLOAD_DIR` | Private installation package root; defaults to `/app/private/downloads` in production |
| `MESSAGE_UPLOAD_DIR` | Private order message attachment root; defaults to `/app/uploads/messages` in production |

Use the variable list above as the Dockhand environment reference. Never commit real production secrets or env files.

Production runtime validates required environment variables on startup. The app fails fast when required secrets are missing, placeholder values are used, production payment is set to `mock`, URLs are malformed, or required RollyPay secrets are absent.

Minimum production secret guidance:

- `NEXTAUTH_SECRET`, `WS_JWT_SECRET`, and `ROLLYPAY_WEBHOOK_SECRET` should be at least 32 characters.
- Do not use placeholder/example values from `.env.example`.
- `PAYMENT_PROVIDER=mock` is only for local development and CI; production should use `rollypay`.
- The WebSocket service must receive `WS_JWT_SECRET`, matching the Next.js app.

Redis is also used for application rate limiting. If Redis is unavailable, rate limit checks fail open and log an error so checkout, license checks, and chat do not hard-fail during transient Redis issues.

### Admin Bootstrap

The production stack includes a one-off `admin-bootstrap` service that runs after Prisma migrations and before the app starts.

If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are blank, the job logs a skip message and exits successfully. If both values are set, the job creates the admin user when it does not exist. When the email already exists, the job ensures the user has the `ADMIN` role and updates the display name, but leaves the existing password unchanged by default.

To intentionally rotate the bootstrap admin password, set:

```bash
ADMIN_BOOTSTRAP_UPDATE_PASSWORD=true
```

Then redeploy the stack. Set the flag back to `false` after the password has been rotated.

For local use with `.env`:

```bash
npm run admin:bootstrap
```

### Persistent Storage And Backups

The production stack mounts separate volumes for PostgreSQL, Redis, public uploads, private installation packages, private order message uploads, and generated backup artifacts.

Run logical PostgreSQL backups with:

```bash
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm postgres-backup
```

Run file storage backups with:

```bash
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm storage-backup
```

See `docs/BACKUP_RESTORE.md` for restore commands, schedules, and validation steps.
Use `docs/STAGING_AND_ROLLBACK.md` for the staging restore drill and rollback decision guide.

### Content Security Policy

The Next.js app sends a baseline Content Security Policy from `next.config.ts`.
It derives allowed application, WebSocket, and RollyPay origins from:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_WS_URL`
- `ROLLYPAY_API_URL`

Before production launch, validate the policy in staging with the real app domain, WebSocket domain, product images, RollyPay checkout redirect, and admin/customer order chat. If new external origins are introduced, update the CSP in Git before deploying.

### 4. Domain & SSL

Configure routes in Dockhand:

- app: `https://your-domain.com` → service `app`, port `3000`
- websocket: `wss://ws.your-domain.com` → service `ws`, port `3001`

Enable WebSocket upgrade support for the `ws` route.

### 5. Network Configuration

Ensure all services can communicate:

1. **Redis**: Accessible from both Next.js and WS server
2. **WS Server**: Accessible via WebSocket (wss://)
3. **Next.js**: Main application (https://)

### 6. Health Checks

- **WS Server**: `GET /health` returns `{"status":"ok"}`
- **Next.js**: Standard Next.js health (responds to requests)
- **Redis**: `redis-cli ping` returns `PONG`
- **PostgreSQL**: `pg_isready` passes

## Local Development

Production image builds are validated by GitHub Actions on pull requests. Image publishing is handled by GitHub Actions on pushes to `dev` and `main`. Local Docker Desktop remains the preferred way to test the full stack before deploying; it still builds local images from the working tree and does not require GHCR access.

### Start All Services

```bash
# Terminal 1: PostgreSQL + Redis in Docker Desktop
npm run docker:local:up

# Terminal 2: Apply migrations
npm run db:migrate

# Terminal 3: WebSocket Server
cd ws-server
npm run dev

# Terminal 4: Next.js
npm run dev
```

### Local Docker Compose

```bash
npm run docker:local:up
npm run docker:local:ps
npm run docker:local:down
```

The local compose file is `docker-compose.local.yml`. It starts PostgreSQL and Redis using values parsed from `.env` by `scripts/docker-local.mjs`.

### Docker Desktop Full Stack Smoke

Before deploying to Dockhand, run the full stack locally in Docker Desktop:

```bash
npm run docker:desktop:up
npm run docker:desktop:ps
```

This uses `docker-compose.docker-desktop.yml` and `.env.docker.example`. It starts PostgreSQL, Redis, the migration job, the Next.js production image, and the WebSocket image on local ports `3100` and `3101`.
The app and WebSocket Dockerfiles use the public ECR mirror for the official Node image: `public.ecr.aws/docker/library/node:20-alpine`.

Open:

- app: `http://localhost:3100`
- websocket health: `http://localhost:3101/health`

Stop the stack with:

```bash
npm run docker:desktop:down
```

This Docker Desktop stack is local-only and intentionally uses `PAYMENT_PROVIDER=mock`. It sets `CI=true` for the app container so the production image can be smoke-tested locally without RollyPay credentials, and `AUTH_TRUST_HOST=true` so Auth.js accepts the Docker port-mapped host. Do not use this compose file for a remote staging or production deployment.

## Troubleshooting

### WebSocket Connection Issues

1. Check CORS_ORIGIN matches your domain
2. Verify SSL is properly configured for WSS
3. Check proxy WebSocket upgrade headers
4. Verify JWT_SECRET matches between services

### Redis Connection Issues

1. Verify REDIS_PASSWORD is correct
2. Check network connectivity between containers
3. Ensure Redis is running: `redis-cli ping`

### Real-time Not Working

1. Check Redis Pub/Sub is active
2. Verify both services connect to same Redis instance
3. Check browser console for WebSocket errors

## Monitoring

### Recommended Tools

- **Uptime Kuma**: Health check monitoring
- **Dockhand Logs**: View application logs
- **Redis Commander**: Redis data inspection

### Key Metrics

- WebSocket connections count
- Redis memory usage
- Message delivery latency
- Unread message counts
