type PaymentProvider = "mock" | "rollypay"

type AppEnv = {
  NODE_ENV: string
  DATABASE_URL: string
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL?: string
  NEXT_PUBLIC_APP_URL: string
  NEXT_PUBLIC_WS_URL: string
  NEXT_PUBLIC_APP_NAME: string
  REDIS_HOST: string
  REDIS_PORT: number
  REDIS_PASSWORD?: string
  WS_JWT_SECRET: string
  PAYMENT_PROVIDER: PaymentProvider
  PAYMENT_CURRENCY: string
  ROLLYPAY_API_URL: string
  ROLLYPAY_API_KEY?: string
  ROLLYPAY_WEBHOOK_SECRET?: string
}

const PLACEHOLDER_VALUES = new Set([
  "test",
  "development-secret",
  "your-nextauth-secret-at-least-32-chars",
  "your_ws_jwt_secret_at_least_32_chars",
  "your_rollypay_api_key",
  "your_rollypay_signing_secret",
  "your_rollypay_signing_secret_at_least_32_chars",
])

function readRequired(name: string, errors: string[]) {
  const value = process.env[name]?.trim()

  if (!value) {
    errors.push(`${name} is required`)
    return ""
  }

  return value
}

function readUrl(name: string, value: string | undefined, errors: string[], protocols: string[]) {
  if (!value) {
    return
  }

  try {
    const url = new URL(value)
    if (!protocols.includes(url.protocol)) {
      errors.push(`${name} must use one of: ${protocols.join(", ")}`)
    }
  } catch {
    errors.push(`${name} must be a valid URL`)
  }
}

function readPort(name: string, fallback: number, errors: string[]) {
  const raw = process.env[name]?.trim()

  if (!raw) {
    return fallback
  }

  const port = Number.parseInt(raw, 10)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`${name} must be a valid TCP port`)
    return fallback
  }

  return port
}

function rejectWeakSecret(name: string, value: string | undefined, errors: string[]) {
  if (!value) {
    return
  }

  if (value.length < 32) {
    errors.push(`${name} must be at least 32 characters in production`)
  }

  if (PLACEHOLDER_VALUES.has(value)) {
    errors.push(`${name} must not use a placeholder value in production`)
  }
}

function rejectPlaceholder(name: string, value: string | undefined, errors: string[]) {
  if (value && PLACEHOLDER_VALUES.has(value)) {
    errors.push(`${name} must not use a placeholder value in production`)
  }
}

function resolvePaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER

  if (provider === "mock" || provider === "rollypay") {
    return provider
  }

  return process.env.NODE_ENV === "production" ? "rollypay" : "mock"
}

function validateEnv(): AppEnv {
  const errors: string[] = []
  const isBuild = process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build"
  const strictProduction = process.env.NODE_ENV === "production" && process.env.CI !== "true" && !isBuild
  const paymentProvider = resolvePaymentProvider()

  const DATABASE_URL = readRequired("DATABASE_URL", errors)
  const NEXTAUTH_SECRET = readRequired("NEXTAUTH_SECRET", errors)
  const WS_JWT_SECRET = readRequired("WS_JWT_SECRET", errors)
  const NEXT_PUBLIC_APP_URL = readRequired("NEXT_PUBLIC_APP_URL", errors)
  const NEXT_PUBLIC_WS_URL = readRequired("NEXT_PUBLIC_WS_URL", errors)
  const redisPort = readPort("REDIS_PORT", 6379, errors)

  readUrl("DATABASE_URL", DATABASE_URL, errors, ["postgresql:", "postgres:"])
  readUrl("NEXTAUTH_URL", process.env.NEXTAUTH_URL, errors, ["http:", "https:"])
  readUrl("NEXT_PUBLIC_APP_URL", NEXT_PUBLIC_APP_URL, errors, ["http:", "https:"])
  readUrl("NEXT_PUBLIC_WS_URL", NEXT_PUBLIC_WS_URL, errors, ["http:", "https:", "ws:", "wss:"])
  readUrl("ROLLYPAY_API_URL", process.env.ROLLYPAY_API_URL || "https://rollypay.io", errors, ["http:", "https:"])

  if (strictProduction) {
    rejectWeakSecret("NEXTAUTH_SECRET", NEXTAUTH_SECRET, errors)
    rejectWeakSecret("WS_JWT_SECRET", WS_JWT_SECRET, errors)

    if (paymentProvider === "mock") {
      errors.push("PAYMENT_PROVIDER=mock is not allowed in production")
    }

    const rollypayApiKey = process.env.ROLLYPAY_API_KEY?.trim()
    const rollypayWebhookSecret = process.env.ROLLYPAY_WEBHOOK_SECRET?.trim()

    if (!rollypayApiKey) {
      errors.push("ROLLYPAY_API_KEY is required in production")
    }

    if (!rollypayWebhookSecret) {
      errors.push("ROLLYPAY_WEBHOOK_SECRET is required in production")
    }

    rejectPlaceholder("ROLLYPAY_API_KEY", rollypayApiKey, errors)
    rejectWeakSecret("ROLLYPAY_WEBHOOK_SECRET", rollypayWebhookSecret, errors)
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join("\n- ")}`)
  }

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    DATABASE_URL,
    NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL?.trim() || undefined,
    NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Digital Store",
    REDIS_HOST: process.env.REDIS_HOST?.trim() || "localhost",
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD?.trim() || undefined,
    WS_JWT_SECRET,
    PAYMENT_PROVIDER: paymentProvider,
    PAYMENT_CURRENCY: process.env.PAYMENT_CURRENCY?.trim() || "RUB",
    ROLLYPAY_API_URL: process.env.ROLLYPAY_API_URL?.trim() || "https://rollypay.io",
    ROLLYPAY_API_KEY: process.env.ROLLYPAY_API_KEY?.trim() || undefined,
    ROLLYPAY_WEBHOOK_SECRET: process.env.ROLLYPAY_WEBHOOK_SECRET?.trim() || undefined,
  }
}

export const env = validateEnv()
