# Smoke Tests

Smoke tests cover the smallest useful set of critical business scenarios before a PR is merged.

## Critical Flow

Run locally:

```bash
npm run smoke:critical
```

The script creates isolated temporary records and removes them when it finishes.

It verifies:

- paid order transition;
- duplicate payment idempotency;
- license generation for a paid order item;
- installation stage creation from product templates;
- product purchase/install counter incrementing once;
- license activation success with normalized domain;
- wrong-domain license rejection;
- suspended-license rejection;
- license audit events for success and rejection cases.

## When To Run

Run this before merging changes that touch:

- payment creation or webhook processing;
- order status changes;
- license generation, activation, or admin controls;
- installation stages;
- Prisma schema/migrations related to orders, licenses, or products.

If this smoke test fails, do not treat the branch as ready for `dev`.

## API Security

Run locally:

```bash
npm run smoke:api-security
```

It verifies:

- valid webhook signatures are accepted;
- invalid and stale webhook signatures are rejected;
- duplicate paid webhook delivery is idempotent;
- order chat is scoped to the order owner/admin;
- order file upload is scoped to the order owner/admin;
- stage confirmation and admin stage status APIs enforce permissions and order scoping.

## Admin API

Run locally:

```bash
npm run smoke:admin-api
```

It verifies:

- customers cannot use admin product, stage template, or cache endpoints;
- product update validates `supportDays`, returns `404` for missing products, and persists admin updates;
- stage template list/create/update/delete endpoints validate payloads and scope templates by product;
- stage template reorder persists the requested order and sort values;
- cache stats are admin-only and report Redis connectivity;
- cache clear rejects unsupported patterns and clears allowed patterns for admins.

## Chat API

Run locally:

```bash
npm run smoke:chat-api
```

It verifies:

- order message list requires auth and is scoped to the owner/admin;
- customers can send messages only for paid orders they own;
- customer and admin message endpoints validate content;
- admin message endpoints are admin-only;
- message creation invalidates cached message data;
- message creation publishes `message:new` realtime events through Redis;
- read receipts update only messages from other users;
- read receipts update `status`, `isRead`, and `readAt`;
- read receipts publish `message:read` realtime events through Redis.

## Auth And Checkout

Run locally:

```bash
npm run smoke:auth-checkout
```

It verifies:

- registration rejects weak passwords;
- successful registration normalizes email, hashes the password, and creates a `CUSTOMER`;
- duplicate registration is rejected;
- checkout payment creation requires authentication;
- checkout rejects unavailable products;
- authenticated checkout creates a pending mock-payment order;
- order totals and items use current product prices rather than client-submitted prices;
- mock payment success can be completed only by the order owner;
- mock payment success marks the order paid and creates licenses/stages;
- customer order access is scoped to the owner/admin;
- customers cannot access admin APIs.
