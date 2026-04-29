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
