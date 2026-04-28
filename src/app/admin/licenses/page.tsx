import { Metadata } from "next"
import Link from "next/link"
import { db } from "@/lib/db"
import {
  reissueLicenseKey,
  resetLicenseBinding,
  updateLicenseBinding,
  updateLicenseStatus,
} from "@/actions/licenses"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Ban,
  CheckCircle,
  Globe,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Лицензии | Админ-панель",
  description: "Управление лицензиями цифровых продуктов",
}

const statusConfig = {
  ACTIVE: {
    label: "Активна",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  SUSPENDED: {
    label: "Приостановлена",
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  REVOKED: {
    label: "Отозвана",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
}

interface AdminLicensesPageProps {
  searchParams: Promise<{
    q?: string
    status?: string
  }>
}

function formatDate(value: Date | null) {
  if (!value) {
    return "—"
  }

  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function statusBadge(status: string) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE
  return <Badge className={config.className}>{config.label}</Badge>
}

async function getLicenses(q: string, status: string) {
  return db.license.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { licenseKey: { contains: q, mode: "insensitive" } },
              { domain: { contains: q, mode: "insensitive" } },
              { serverIp: { contains: q, mode: "insensitive" } },
              { product: { name: { contains: q, mode: "insensitive" } } },
              { user: { email: { contains: q, mode: "insensitive" } } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { order: { orderNumber: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { name: true, slug: true },
      },
      user: {
        select: { name: true, email: true },
      },
      order: {
        select: { id: true, orderNumber: true, status: true },
      },
    },
  })
}

async function getLicenseStats() {
  const [total, active, suspended, bound] = await Promise.all([
    db.license.count(),
    db.license.count({ where: { status: "ACTIVE" } }),
    db.license.count({ where: { status: "SUSPENDED" } }),
    db.license.count({
      where: {
        OR: [
          { domain: { not: null } },
          { serverIp: { not: null } },
        ],
      },
    }),
  ])

  return {
    total,
    active,
    suspended,
    bound,
    unbound: total - bound,
  }
}

export default async function AdminLicensesPage({ searchParams }: AdminLicensesPageProps) {
  const params = await searchParams
  const q = params.q?.trim() || ""
  const status = params.status?.trim().toUpperCase() || ""
  const [licenses, stats] = await Promise.all([
    getLicenses(q, status),
    getLicenseStats(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            Лицензии
          </h1>
          <p className="text-muted-foreground mt-1">
            Ключи, привязка доменов и серверов для установок клиентов
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardDescription>Всего лицензий</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Активные</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Приостановлены</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.suspended}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Привязаны</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.bound}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardDescription>Без привязки</CardDescription>
            <CardTitle className="text-3xl">{stats.unbound}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Список лицензий</CardTitle>
          <CardDescription>
            Поиск по ключу, клиенту, заказу, товару, домену или IP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Поиск лицензии"
                className="pl-9"
              />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Все статусы</option>
              <option value="ACTIVE">Активные</option>
              <option value="SUSPENDED">Приостановлены</option>
              <option value="REVOKED">Отозваны</option>
            </select>
            <Button type="submit" className="gap-2">
              <Search className="h-4 w-4" />
              Найти
            </Button>
          </form>

          {licenses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Лицензия</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Привязка</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Проверка</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-mono text-xs">{license.licenseKey}</p>
                        <p className="text-sm font-medium">{license.product.name}</p>
                        <Link
                          href={`/admin/orders/${license.order.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Заказ #{license.order.orderNumber}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{license.user.name || "—"}</p>
                        <p className="text-sm text-muted-foreground">{license.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <form action={updateLicenseBinding} className="space-y-2 min-w-64">
                        <input type="hidden" name="licenseId" value={license.id} />
                        <div className="grid grid-cols-1 gap-2">
                          <label className="relative">
                            <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              name="domain"
                              defaultValue={license.domain || ""}
                              placeholder="domain.com"
                              className="pl-9"
                            />
                          </label>
                          <label className="relative">
                            <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              name="serverIp"
                              defaultValue={license.serverIp || ""}
                              placeholder="IP сервера"
                              className="pl-9"
                            />
                          </label>
                        </div>
                        <Button type="submit" variant="outline" size="sm" className="w-full gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          Сохранить привязку
                        </Button>
                      </form>
                    </TableCell>
                    <TableCell>{statusBadge(license.status)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p>Активаций: {license.activationCount}/{license.maxActivations}</p>
                        <p className="text-muted-foreground">
                          Последняя: {formatDate(license.lastCheckAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col gap-2 items-end">
                        <form action={updateLicenseStatus}>
                          <input type="hidden" name="licenseId" value={license.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={license.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                          />
                          <Button type="submit" variant="outline" size="sm" className="gap-2">
                            {license.status === "ACTIVE" ? (
                              <>
                                <Ban className="h-4 w-4" />
                                Пауза
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4" />
                                Активировать
                              </>
                            )}
                          </Button>
                        </form>
                        <form action={resetLicenseBinding}>
                          <input type="hidden" name="licenseId" value={license.id} />
                          <Button type="submit" variant="outline" size="sm" className="gap-2">
                            <RotateCcw className="h-4 w-4" />
                            Сбросить
                          </Button>
                        </form>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button type="button" variant="destructive" size="sm" className="gap-2">
                              <RefreshCw className="h-4 w-4" />
                              Новый ключ
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Перевыпустить ключ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Старый ключ перестанет работать, а домен и IP будут сброшены.
                                Используй это только после согласования с клиентом.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <form action={reissueLicenseKey}>
                                <input type="hidden" name="licenseId" value={license.id} />
                                <AlertDialogAction type="submit" className="bg-destructive text-white hover:bg-destructive/90">
                                  Перевыпустить
                                </AlertDialogAction>
                              </form>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <KeyRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Лицензий не найдено</h3>
              <p className="text-muted-foreground">
                Лицензии создаются автоматически после успешной оплаты заказа
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
