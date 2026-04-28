# ADR-0005: Redis For Cache And Event Transport

**Status:** Accepted  
**Date:** 2026-04-28

## Context

The app needs lower-latency reads for frequently accessed data and a transport layer between Next.js APIs and the WebSocket service.

## Decision

Use Redis with `ioredis` for cache storage and Pub/Sub events.

## Consequences

- One infrastructure component serves both caching and real-time delivery.
- Cache misses can fall back to PostgreSQL.
- Explicit invalidation is required after product, category, settings, order, message, and stage changes.
- Redis outages should degrade gracefully for cached reads but will affect real-time delivery.
- Production needs Redis monitoring, memory limits, persistence policy, and credentials rotation.
