import dotenv from 'dotenv'

dotenv.config()

function readPort(name: string, fallback: number, errors: string[]) {
  const raw = process.env[name]

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

function validateUrl(name: string, value: string, errors: string[]) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push(`${name} must be an http(s) URL`)
    }
  } catch {
    errors.push(`${name} must be a valid URL`)
  }
}

function createConfig() {
  const errors: string[] = []
  const strictProduction = process.env.NODE_ENV === 'production' && process.env.CI !== 'true'
  const port = readPort('PORT', 3001, errors)
  const redisPort = readPort('REDIS_PORT', 6379, errors)
  const jwtSecret = process.env.WS_JWT_SECRET || 'development-secret'
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'

  validateUrl('CORS_ORIGIN', corsOrigin, errors)

  if (strictProduction) {
    if (!process.env.WS_JWT_SECRET) {
      errors.push('WS_JWT_SECRET is required in production')
    }

    if (
      jwtSecret === 'development-secret' ||
      jwtSecret === 'your-ws-jwt-secret-at-least-32-chars' ||
      jwtSecret.length < 32
    ) {
      errors.push('WS_JWT_SECRET must be at least 32 characters in production')
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid WebSocket environment configuration:\n- ${errors.join('\n- ')}`)
  }

  return {
    port,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: redisPort,
      password: process.env.REDIS_PASSWORD || undefined,
    },
    jwtSecret,
    corsOrigin,
  }
}

export const config = {
  ...createConfig(),
}
