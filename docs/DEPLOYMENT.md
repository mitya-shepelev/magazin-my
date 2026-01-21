# Deployment Guide

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

## Deployment with Dokploy

### 1. Prerequisites

- Dokploy installed and configured
- Domain name configured
- SSL certificates (Let's Encrypt via Dokploy)

### 2. Deploy WebSocket Server

#### Create Application in Dokploy

1. Go to Dokploy Dashboard → Create Application
2. Select "Docker Compose" as source
3. Connect your Git repository
4. Set the compose file path: `ws-server/docker-compose.yml`

#### Configure Environment Variables

```env
# Required
JWT_SECRET=<same-as-WS_JWT_SECRET-in-nextjs>
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>
CORS_ORIGIN=https://your-domain.com

# Optional
WS_PORT=3001
```

#### Configure Domain & SSL

1. Add domain: `ws.your-domain.com`
2. Enable SSL (Let's Encrypt)
3. Configure proxy to port 3001
4. Enable WebSocket support in proxy settings

### 3. Deploy Next.js Application

#### Create Application in Dokploy

1. Create new application
2. Select "Nixpacks" or "Dockerfile" as builder
3. Connect your Git repository

#### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@db-host:5432/magazin_my

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<generate-secure-secret>

# Redis (same instance as WS server)
REDIS_HOST=<redis-container-ip-or-service>
REDIS_PORT=6379
REDIS_PASSWORD=<your-redis-password>

# WebSocket
WS_JWT_SECRET=<same-as-JWT_SECRET-in-ws-server>
NEXT_PUBLIC_WS_URL=wss://ws.your-domain.com

# YooKassa
YOOKASSA_SHOP_ID=<your-shop-id>
YOOKASSA_SECRET_KEY=<your-secret-key>

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME="Digital Store"

# Storage
UPLOAD_DIR=/app/public/uploads
DOWNLOAD_DIR=/app/private/downloads
```

### 4. Database Setup

#### Run Migrations

```bash
# In Dokploy, add a post-deploy command:
npx prisma migrate deploy
```

### 5. Network Configuration

Ensure all services can communicate:

1. **Redis**: Accessible from both Next.js and WS server
2. **WS Server**: Accessible via WebSocket (wss://)
3. **Next.js**: Main application (https://)

### 6. Health Checks

- **WS Server**: `GET /health` returns `{"status":"ok"}`
- **Next.js**: Standard Next.js health (responds to requests)
- **Redis**: `redis-cli ping` returns `PONG`

## Local Development

### Start All Services

```bash
# Terminal 1: Redis (if not using system Redis)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Terminal 2: WebSocket Server
cd ws-server
npm run dev

# Terminal 3: Next.js
npm run dev
```

### Using Docker Compose (WebSocket + Redis)

```bash
cd ws-server
docker-compose up -d
```

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
- **Dokploy Logs**: View application logs
- **Redis Commander**: Redis data inspection

### Key Metrics

- WebSocket connections count
- Redis memory usage
- Message delivery latency
- Unread message counts
