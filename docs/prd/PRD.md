# Product Requirements Document

**Product:** Digital products marketplace with guided installation support  
**Updated:** 2026-04-28  
**Stage:** MVP/alpha

## Product Vision

Build a marketplace where customers can buy digital products, download purchased files, and complete installation or onboarding through a structured order workspace with direct customer-admin communication.

The differentiator is not only selling files. The product also provides a post-payment fulfillment flow: installation stages, customer actions, admin work, confirmations, and real-time chat.

## Target Users

| User | Needs |
| --- | --- |
| Visitor | Browse categories and product pages, understand product value, add items to cart |
| Customer | Register, pay, download purchased products, follow installation steps, chat with admin |
| Admin | Manage catalog, categories, SEO, settings, orders, installation stages, and customer communication |

## Business Goals

- Sell digital products through a self-service storefront.
- Reduce manual coordination after purchase by turning installation into visible stages.
- Keep customer/admin communication tied to the order context.
- Provide an admin surface that can operate the store without direct database access.
- Prepare the codebase for a reliable production launch.

## MVP Scope

### Storefront

- Home page with featured products, categories, and reviews.
- Catalog and category pages.
- Product detail pages with images, descriptions, pricing, demo URL, and purchase action.
- Client-side cart.

### Auth And Accounts

- Register and login with email/password.
- Session management through NextAuth.
- Customer cabinet with orders, downloads, and profile management.
- Admin-only dashboard routes.

### Catalog Admin

- Product CRUD.
- Category CRUD.
- Product SEO metadata.
- Stage template management per product.
- Site settings.

### Checkout And Fulfillment

- Create payments through YooKassa.
- Handle payment webhooks.
- Mark orders as paid.
- Generate download access through order items.
- Copy product stage templates into order installation stages.

### Installation Workflow

- Stage types: `CLIENT_ACTION`, `ADMIN_WORK`, `CONFIRMATION`.
- Stage statuses: `PENDING`, `IN_PROGRESS`, `COMPLETED`.
- Admin can update stage status.
- Customer can confirm confirmation stages.
- Comments/files can be attached to stages.

### Real-Time Chat

- Order-level chat between customer and admin.
- Message persistence in PostgreSQL.
- Redis Pub/Sub publishes events from Next.js APIs.
- Socket.io server broadcasts events to connected clients.
- Typing, presence, delivery/read status foundations.

### Caching

- Redis helper layer for public and frequently read data.
- Explicit invalidation helpers for product/category/settings/order data.

## Out Of MVP Scope

- Multi-vendor marketplace.
- Complex license management.
- Subscription billing.
- Built-in email campaign system.
- Full CRM.
- Public API for third-party integrations.
- Advanced analytics dashboard.

## Current Gaps

- Lint does not pass.
- No automated tests.
- No formal staging acceptance checklist.
- No rate limiting.
- CSP is not configured.
- Production file storage/backup policy is not documented in detail.
- Webhook idempotency and verification need stronger guarantees.
- Notification push subscription model is planned but not present in Prisma schema.
- Status/role fields should move toward Prisma enums.

## Success Criteria For Beta

- `npm run lint` passes.
- `npm run build` passes in a production-like environment.
- Critical checkout flow is covered by automated tests or a repeatable QA script.
- Admin can create a product with stage templates and complete a paid order scenario.
- Customer can pay, download files, use order chat, complete required stages.
- Deployment docs include migration, rollback, backup, and monitoring steps.
- Security checklist is reviewed and all High items are closed.

## Success Criteria For Public Launch

- Staging environment mirrors production architecture.
- Payment webhook is idempotent and monitored.
- Rate limiting enabled on auth, payment, upload, and chat endpoints.
- File uploads/downloads have size limits, storage quotas, and backup policy.
- Error tracking and uptime monitoring are configured.
- Database backup and restore have been tested.
- Admin operational runbook exists.
