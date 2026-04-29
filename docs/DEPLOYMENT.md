# Deployment Guide

## Production Direction

Production deployment is standardized on Dockhand with repository-managed Compose/stack files.

GitHub is the source of truth for:

- application source code
- CI workflow
- pull request review history
- production Compose/stack definitions

Dockhand is responsible for:

- pulling the GitHub repository
- building and running the production stack
- storing production environment variables/secrets
- managing runtime services and logs

Primary files:

- `deploy/dockhand/compose.prod.yml`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP_RESTORE.md`
- `docs/STAGING_AND_ROLLBACK.md`

Normal release path:

1. Develop locally.
2. Merge feature PRs into `dev`.
3. Validate `dev` in staging.
4. Open a release PR from `dev` to `main`.
5. Merge release PR after checks/review.
6. Deploy `main` in Dockhand.

Staging and rollback procedures live in `docs/STAGING_AND_ROLLBACK.md`. Use that runbook before beta/public launch and before production releases that touch payments, licenses, installation stages, uploads, auth, WebSocket behavior, database schema, or deployment configuration.

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
- WebSocket server
- PostgreSQL
- Redis
- persistent volumes for database, Redis, uploads, and private installation packages
- one-off backup profiles for PostgreSQL and file storage

### 3. Configure Environment Variables

| Variable | Source |
| --- | --- |
| `POSTGRES_DB` | Dockhand environment |
| `POSTGRES_USER` | Dockhand environment |
| `POSTGRES_PASSWORD` | Dockhand secret/environment |
| `NEXTAUTH_URL` | Production app URL |
| `NEXTAUTH_SECRET` | Dockhand secret/environment |
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
