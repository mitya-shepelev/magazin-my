import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwtSecret: process.env.WS_JWT_SECRET || 'development-secret',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}
