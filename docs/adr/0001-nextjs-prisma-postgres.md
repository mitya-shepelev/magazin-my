# ADR-0001: Next.js, Prisma, And PostgreSQL

**Status:** Accepted  
**Date:** 2026-04-28

## Context

The product needs a public storefront, authenticated customer cabinet, admin dashboard, API routes, payment integration, and database-backed order fulfillment.

## Decision

Use Next.js App Router for the web application, Prisma as the database access layer, and PostgreSQL as the primary relational database.

## Consequences

- The project can keep pages, server routes, server actions, and UI components in one application.
- Prisma gives typed data access and migration history.
- PostgreSQL fits orders, users, products, messages, stage templates, and SEO metadata well.
- The application must keep generated Prisma output out of manual edits.
- Production readiness depends on disciplined migrations, backups, and environment management.
