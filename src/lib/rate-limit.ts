import { createHash } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"

interface RateLimitOptions {
  key: string
  limit: number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetSeconds: number
  retryAfter: number
}

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"
}

export function rateLimitKey(scope: string, ...parts: Array<string | null | undefined>) {
  const material = parts.map((part) => part || "unknown").join(":")
  const hash = createHash("sha256").update(material).digest("hex").slice(0, 32)
  return `rate:${scope}:${hash}`
}

export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<RateLimitResult> {
  try {
    const count = await redis.incr(key)

    if (count === 1) {
      await redis.expire(key, windowSeconds)
    }

    const ttl = await redis.ttl(key)
    const resetSeconds = ttl > 0 ? ttl : windowSeconds
    const remaining = Math.max(limit - count, 0)

    return {
      allowed: count <= limit,
      limit,
      remaining,
      resetSeconds,
      retryAfter: count > limit ? resetSeconds : 0,
    }
  } catch (error) {
    console.error("Rate limit check failed:", error)
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetSeconds: windowSeconds,
      retryAfter: 0,
    }
  }
}

export function rateLimitResponse(
  result: RateLimitResult,
  message = "Too many requests"
) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter || result.resetSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetSeconds),
      },
    }
  )
}
