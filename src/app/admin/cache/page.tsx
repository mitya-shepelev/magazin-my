"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Database,
  RefreshCw,
  Trash2,
  Activity,
  HardDrive,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

interface CacheStats {
  connected: boolean
  error?: string
  stats?: {
    keyspace_hits: number
    keyspace_misses: number
    hit_ratio: string
    total_commands: string
    uptime_seconds: string
    connected_clients: string
  }
  memory?: {
    used_memory_human: string
    used_memory_peak_human: string
    used_memory_rss_human: string
  }
  keys?: {
    total: number
    app_keys: number
    by_type: Record<string, number>
  }
  keysList?: string[]
}

export default function CacheMonitorPage() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/cache/stats")
      const data = await res.json()
      setStats(data)
    } catch (error) {
      setStats({ connected: false, error: "Failed to fetch stats" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Автообновление каждые 10 секунд
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  const clearCache = async (pattern: string) => {
    try {
      setClearing(pattern)
      const res = await fetch("/api/admin/cache/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Удалено ${data.deleted} ключей`)
        fetchStats()
      } else {
        toast.error(data.error || "Ошибка очистки кеша")
      }
    } catch (error) {
      toast.error("Ошибка соединения")
    } finally {
      setClearing(null)
    }
  }

  const formatUptime = (seconds: string) => {
    const s = parseInt(seconds)
    const days = Math.floor(s / 86400)
    const hours = Math.floor((s % 86400) / 3600)
    const mins = Math.floor((s % 3600) / 60)
    if (days > 0) return `${days}д ${hours}ч`
    if (hours > 0) return `${hours}ч ${mins}м`
    return `${mins}м`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Мониторинг кеша</h1>
          <p className="text-muted-foreground">Redis статистика и управление</p>
        </div>
        <Button onClick={fetchStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Обновить
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                stats?.connected
                  ? "bg-green-100 text-green-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {stats?.connected ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="font-semibold text-lg">
                {stats?.connected ? "Redis подключен" : "Redis отключен"}
              </p>
              <p className="text-sm text-muted-foreground">
                {stats?.connected
                  ? `Uptime: ${formatUptime(stats.stats?.uptime_seconds || "0")}`
                  : stats?.error || "Проверьте подключение"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {stats?.connected && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Hit Ratio */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Hit Ratio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.stats?.hit_ratio}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.stats?.keyspace_hits.toLocaleString()} hits /{" "}
                  {stats.stats?.keyspace_misses.toLocaleString()} misses
                </p>
              </CardContent>
            </Card>

            {/* Memory */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Память
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.memory?.used_memory_human}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Peak: {stats.memory?.used_memory_peak_human}
                </p>
              </CardContent>
            </Card>

            {/* Keys */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Ключи кеша
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.keys?.app_keys}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Всего в Redis: {stats.keys?.total}
                </p>
              </CardContent>
            </Card>

            {/* Commands */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Команды
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {parseInt(stats.stats?.total_commands || "0").toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  За всё время
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Keys by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Ключи по типам
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {Object.entries(stats.keys?.by_type || {}).map(([type, count]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                  >
                    <span className="font-medium">{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clear Cache Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Очистка кеша
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  onClick={() => clearCache("products:*")}
                  disabled={clearing !== null}
                >
                  {clearing === "products:*" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Товары
                </Button>
                <Button
                  variant="outline"
                  onClick={() => clearCache("categories:*")}
                  disabled={clearing !== null}
                >
                  {clearing === "categories:*" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Категории
                </Button>
                <Button
                  variant="outline"
                  onClick={() => clearCache("home:*")}
                  disabled={clearing !== null}
                >
                  {clearing === "home:*" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Главная
                </Button>
                <Button
                  variant="outline"
                  onClick={() => clearCache("order:*")}
                  disabled={clearing !== null}
                >
                  {clearing === "order:*" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Заказы
                </Button>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => clearCache("*")}
                  disabled={clearing !== null}
                >
                  {clearing === "*" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Очистить весь кеш
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Keys List */}
          {stats.keysList && stats.keysList.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Активные ключи (первые 50)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.keysList.map((key) => (
                    <Badge key={key} variant="outline" className="font-mono text-xs">
                      {key}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
