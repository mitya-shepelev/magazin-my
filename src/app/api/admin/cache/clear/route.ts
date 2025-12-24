import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { redis } from "@/lib/redis"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { pattern } = body

    if (!pattern) {
      return NextResponse.json({ error: "Pattern required" }, { status: 400 })
    }

    // Безопасные паттерны
    const allowedPatterns = [
      "products:*",
      "product:*",
      "categories:*",
      "category:*",
      "settings:*",
      "order:*",
      "home:*",
      "related:*",
      "*", // Очистить всё
    ]

    if (!allowedPatterns.includes(pattern)) {
      return NextResponse.json({ error: "Invalid pattern" }, { status: 400 })
    }

    const keys = await redis.keys(pattern)
    let deleted = 0

    if (keys.length > 0) {
      deleted = await redis.del(...keys)
    }

    return NextResponse.json({
      success: true,
      deleted,
      pattern,
    })
  } catch (error) {
    console.error("Cache clear error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to clear cache" },
      { status: 500 }
    )
  }
}
