import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { redis } from "@/lib/redis"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Получаем статистику Redis
    const info = await redis.info("stats")
    const memoryInfo = await redis.info("memory")
    const keyspace = await redis.info("keyspace")

    // Парсим info stats
    const parseInfo = (infoString: string) => {
      const result: Record<string, string> = {}
      infoString.split("\r\n").forEach((line) => {
        if (line && !line.startsWith("#")) {
          const [key, value] = line.split(":")
          if (key && value) {
            result[key] = value
          }
        }
      })
      return result
    }

    const stats = parseInfo(info)
    const memory = parseInfo(memoryInfo)
    const db = parseInfo(keyspace)

    // Получаем все ключи кеша нашего приложения
    const allKeys = await redis.keys("*")
    const appKeys = allKeys.filter(
      (key) =>
        key.startsWith("product") ||
        key.startsWith("products") ||
        key.startsWith("category") ||
        key.startsWith("categories") ||
        key.startsWith("settings") ||
        key.startsWith("order") ||
        key.startsWith("user") ||
        key.startsWith("related") ||
        key.startsWith("home")
    )

    // Группируем ключи по типу
    const keysByType: Record<string, string[]> = {}
    appKeys.forEach((key) => {
      const type = key.split(":")[0]
      if (!keysByType[type]) {
        keysByType[type] = []
      }
      keysByType[type].push(key)
    })

    // Вычисляем hit ratio
    const hits = parseInt(stats.keyspace_hits || "0")
    const misses = parseInt(stats.keyspace_misses || "0")
    const total = hits + misses
    const hitRatio = total > 0 ? ((hits / total) * 100).toFixed(2) : "0.00"

    return NextResponse.json({
      connected: true,
      stats: {
        keyspace_hits: hits,
        keyspace_misses: misses,
        hit_ratio: `${hitRatio}%`,
        total_commands: stats.total_commands_processed || "0",
        uptime_seconds: stats.uptime_in_seconds || "0",
        connected_clients: stats.connected_clients || "1",
      },
      memory: {
        used_memory_human: memory.used_memory_human || "0B",
        used_memory_peak_human: memory.used_memory_peak_human || "0B",
        used_memory_rss_human: memory.used_memory_rss_human || "0B",
      },
      keys: {
        total: allKeys.length,
        app_keys: appKeys.length,
        by_type: Object.fromEntries(
          Object.entries(keysByType).map(([type, keys]) => [type, keys.length])
        ),
      },
      keysList: appKeys.slice(0, 50), // Первые 50 ключей
    })
  } catch (error) {
    console.error("Redis stats error:", error)
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 500 }
    )
  }
}
