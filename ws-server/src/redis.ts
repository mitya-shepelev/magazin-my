import Redis from 'ioredis'
import { config } from './config.js'

const redisOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
}

// Main Redis client for commands
export const redis = new Redis(redisOptions)

// Separate client for Pub/Sub (required by Redis)
export const subscriber = new Redis(redisOptions)

redis.on('connect', () => {
  console.log('[Redis] Connected to Redis')
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err)
})

subscriber.on('connect', () => {
  console.log('[Redis] Subscriber connected')
})

subscriber.on('error', (err) => {
  console.error('[Redis] Subscriber error:', err)
})
