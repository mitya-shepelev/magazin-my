# ADR 0007: RollyPay Payment Provider

## Status

Accepted

## Context

The project needs a payment provider that can support a wider sales geography than the previous YooKassa integration. The checkout flow must still work locally without calling a real payment gateway, and webhook processing must be idempotent because payment providers can retry events.

## Decision

Use RollyPay as the production payment provider and keep a `mock` provider for local Docker development.

- Production creates payments with RollyPay and redirects customers to the returned `pay_url`.
- Local development can use `PAYMENT_PROVIDER=mock` to complete checkout without external credentials.
- Payment fulfillment is handled only after webhook confirmation or local mock success.
- Webhooks verify `X-Signature` and `X-Timestamp` with `ROLLYPAY_WEBHOOK_SECRET`.
- Order fulfillment is idempotent: duplicate payment events must not create duplicate stages or increment download counters repeatedly.

## Consequences

- Production requires `ROLLYPAY_API_KEY`, `ROLLYPAY_WEBHOOK_SECRET`, and a configured RollyPay callback URL.
- The current storefront remains priced in rubles; RollyPay handles payment and USDT conversion on the provider side.
- Future multi-currency storefront pricing should be handled as a separate product decision.
