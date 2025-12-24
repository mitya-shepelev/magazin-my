import { redis } from './redis'

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  try {
    const cachedData = await redis.get(key)
    if (cachedData) {
      return JSON.parse(cachedData) as T
    }
  } catch (error) {
    console.error('Redis get error:', error)
  }

  const data = await fetcher()

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.error('Redis set error:', error)
  }

  return data
}

export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Redis invalidate error:', error)
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Redis invalidate pattern error:', error)
  }
}

export async function invalidateMany(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Redis invalidate many error:', error)
  }
}
