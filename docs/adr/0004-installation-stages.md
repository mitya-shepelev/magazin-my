# ADR-0004: Installation Stages From Product Templates

**Status:** Accepted  
**Date:** 2026-04-28

## Context

Digital products may require customer input, admin installation work, and final confirmation. These steps should be repeatable per product but independently trackable for each paid order.

## Decision

Store reusable stage definitions as `StageTemplate` records on products. When an order is paid, copy the templates into `InstallationStage` records attached to the order.

## Consequences

- Product teams can define a standard installation process once.
- Paid orders keep their own historical copy even if product templates change later.
- Multi-product orders can combine stages from multiple products.
- Payment webhook handling must be idempotent so duplicate webhooks do not create duplicate stages.
- Stage status transitions should eventually be centralized and validated.
