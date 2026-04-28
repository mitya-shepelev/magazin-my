# Architecture Decision Records

This directory stores architecture decisions that should remain understandable after the implementation details change.

## ADR Index

| ADR | Status | Decision |
| --- | --- | --- |
| [ADR-0001](0001-nextjs-prisma-postgres.md) | Accepted | Use Next.js App Router, Prisma, and PostgreSQL |
| [ADR-0002](0002-realtime-socketio-redis.md) | Accepted | Use a separate Socket.io service with Redis Pub/Sub |
| [ADR-0003](0003-nextauth-credentials-jwt.md) | Accepted | Use NextAuth credentials provider with JWT sessions |
| [ADR-0004](0004-installation-stages.md) | Accepted | Model fulfillment as product stage templates copied to order stages |
| [ADR-0005](0005-redis-cache.md) | Accepted | Use Redis for caching and real-time event transport |
| [ADR-0006](0006-github-ci-dockhand-deployment.md) | Accepted | Use GitHub CI and Dockhand production deployment |
| [ADR-0007](0007-rollypay-payment-provider.md) | Accepted | Use RollyPay for production payments with local mock checkout |
| [ADR-0008](0008-license-based-installation-delivery.md) | Accepted | Use license-based delivery with guided installation |

## ADR Template

```markdown
# ADR-XXXX: Title

**Status:** Proposed | Accepted | Superseded  
**Date:** YYYY-MM-DD

## Context

What problem are we solving?

## Decision

What did we decide?

## Consequences

What becomes easier, harder, or constrained?
```
