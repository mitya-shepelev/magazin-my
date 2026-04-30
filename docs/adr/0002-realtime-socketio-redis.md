# ADR-0002: Separate Socket.io Service With Redis Pub/Sub

**Status:** Accepted  
**Date:** 2026-04-28

## Context

Order chat and presence require real-time delivery, while the Next.js app remains responsible for persistence, authorization, and REST endpoints.

## Decision

Use a standalone Socket.io server in `ws-server/`. Next.js API routes save changes to PostgreSQL and publish events to Redis. The WebSocket server subscribes to Redis Pub/Sub and broadcasts events to connected clients.

## Consequences

- WebSocket connections are isolated from the Next.js runtime.
- REST APIs remain the source of truth for writes.
- Redis becomes required for both real-time events and caching.
- Deployment requires two app services plus Redis and PostgreSQL.
- Local development requires running both `npm run dev` and `cd ws-server && npm run dev`.
