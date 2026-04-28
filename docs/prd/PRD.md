# Product Requirements Document

**Product:** Digital products marketplace with guided installation support  
**Updated:** 2026-04-28  
**Stage:** MVP/alpha

## Product Vision

Build a marketplace where customers can buy licensed digital products and complete installation or onboarding through a structured order workspace with direct customer-admin communication.

The differentiator is not selling downloadable files. The product sells the right to use and install a product. After payment, the platform generates a license, starts the installation workflow, and lets customer and admin coordinate server/domain setup.

## Target Users

| User | Needs |
| --- | --- |
| Visitor | Browse categories and product pages, understand product value, add items to cart |
| Customer | Register, pay, view licenses, follow installation steps, chat with admin |
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
- Customer cabinet with orders, licenses, and profile management.
- Admin-only dashboard routes.

### Catalog Admin

- Product CRUD.
- Category CRUD.
- Product SEO metadata.
- Stage template management per product.
- Site settings.

### Checkout And Fulfillment

- Create payments through RollyPay.
- Handle payment webhooks.
- Mark orders as paid.
- Generate product licenses after paid orders.
- Bind licenses to domain and server IP during installation/activation.
- Copy product stage templates into order installation stages.

### Licensing And Installation Workflow

- Customers do not download product source packages.
- Admins use the order workspace to install the purchased product on the customer server.
- Each paid order item receives a license key.
- License activation binds the key to a normalized domain and server IP.
- Installed products can call the license activation/check endpoint to verify access.

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
- Production file storage/backup policy for admin installation packages is not documented in detail.
- License revocation/admin editing flows are still basic.
- Notification push subscription model is planned but not present in Prisma schema.
- Status/role fields should move toward Prisma enums.

## Success Criteria For Beta

- `npm run lint` passes.
- `npm run build` passes in a production-like environment.
- Critical checkout flow is covered by automated tests or a repeatable QA script.
- Admin can create a product with stage templates and complete a paid order scenario.
- Customer can pay, view license details, use order chat, and complete required stages.
- Deployment docs include migration, rollback, backup, and monitoring steps.
- Security checklist is reviewed and all High items are closed.

## Success Criteria For Public Launch

- Staging environment mirrors production architecture.
- Payment webhook is idempotent and monitored.
- Rate limiting enabled on auth, payment, upload, and chat endpoints.
- File uploads and private installation packages have size limits, storage quotas, and backup policy.
- License activation, revocation, and domain/IP binding are covered by tests or a repeatable QA script.
- Error tracking and uptime monitoring are configured.
- Database backup and restore have been tested.
- Admin operational runbook exists.
