# ADR 0008: License-Based Installation Delivery

## Status

Accepted

## Context

The business model is not direct file delivery to customers. Customers buy the right to use a product, and the admin installs it on the customer's server through the order workspace. Direct customer downloads weaken this model and make it harder to control product usage.

## Decision

Move customer fulfillment from downloads to licenses and guided installation.

- Paid order items generate license keys.
- Customer cabinet shows licenses instead of download buttons.
- The old customer download API returns `410 Gone`.
- Admin product files remain private installation packages for operational use.
- A license activation endpoint binds a license to a normalized domain and server IP.
- Installed products can call the activation/check endpoint to verify that usage is allowed.

## Consequences

- Customers no longer receive source packages directly.
- The order workspace becomes the primary fulfillment channel.
- Domain/IP binding gives a practical enforcement layer, but it is not absolute copy protection.
- IP checks must be handled carefully because hosting, proxies, and CDN setups can change visible IPs.
- Future work should add admin license management, signed grace tokens for temporary license-server outages, and automated tests for activation and revocation.
