# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital products marketplace (Next.js 16) with real-time chat between customers and admins. Customers purchase digital products (web apps, mobile apps), and admins manage installation stages with real-time communication.

## Commands

```bash
# Development
npm run dev              # Start Next.js (port 3000)
cd ws-server && npm run dev  # Start WebSocket server (port 3004)

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:push          # Push schema changes (no migration)
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Create admin user

# Build & Lint
npm run build
npm run lint
```

## Architecture

### Two-Service Real-time System

```
Next.js App (3000)  ←→  Redis Pub/Sub  ←→  WS Server (3004)
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

### Form Validation

Using Zod v4 with react-hook-form via @hookform/resolvers.

### UI Components

shadcn/ui components in `src/components/ui/`. Import from `@/components/ui/button` etc.

## Environment Variables

Required for development:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Session encryption
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis connection
- `WS_JWT_SECRET` - Shared secret between Next.js and WS server
- `NEXT_PUBLIC_WS_URL` - WebSocket server URL (e.g., `ws://localhost:3001`)

## Local Development Setup

1. Start Redis: `docker run -d --name redis -p 6379:6379 redis:7-alpine`
2. Start WS server: `cd ws-server && npm run dev`
3. Start Next.js: `npm run dev`

Or use `ws-server/docker-compose.yml` for Redis + WS server together.
