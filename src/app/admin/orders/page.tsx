import { Metadata } from "next"
import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ShoppingCart,
  Eye,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Package,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Заказы | Админ-панель",
  description: "Управление заказами",
}

async function getOrders() {
  return db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
      items: {
        include: {
          product: {
            select: { name: true, slug: true },
          },
        },
      },
    },
  })
}

async function getOrderStats() {
  const [total, paid, pending, cancelled, revenue] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: "PAID" } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.count({ where: { status: "CANCELLED" } }),
    db.order.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
    }),
  ])

  return {
    total,
    paid,
    pending,
    cancelled,
    revenue: revenue._sum.total || 0,
  }
}

const statusConfig = {
  PENDING: {
    label: "Ожидает",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  PAID: {
    label: "Оплачен",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  CANCELLED: {
    label: "Отменён",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  REFUNDED: {
    label: "Возврат",
    icon: RefreshCw,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

export default async function OrdersPage() {
  const [orders, stats] = await Promise.all([
    getOrders(),
    getOrderStats(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            Заказы
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление заказами магазина
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Экспорт
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardDescription>Всего заказов</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="h-3 w-3" />
              За всё время
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Оплачено</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.paid}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              Успешных
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Ожидают</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-yellow-600">
              <Clock className="h-3 w-3" />
              Требуют внимания
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-red-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Отменено</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats.cancelled}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-red-600">
              <XCircle className="h-3 w-3" />
              Отменённых
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Выручка</CardDescription>
            <CardTitle className="text-2xl price-tag">
              {stats.revenue.toLocaleString("ru-RU")} ₽
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-primary">
              <TrendingUp className="h-3 w-3" />
              Общая сумма
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Список заказов</CardTitle>
          <CardDescription>
            Все заказы в хронологическом порядке
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Товары</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
                  const StatusIcon = status.icon

                  return (
                    <TableRow key={order.id} className="hover:bg-secondary/50">
                      <TableCell className="font-mono font-medium">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.user?.name || "—"}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.customerEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item) => (
                            <p key={item.id} className="text-sm">
                              {item.productName}
                            </p>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{order.items.length - 2} ещё
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {order.total.toLocaleString("ru-RU")} ₽
                      </TableCell>
                      <TableCell>
                        <Badge className={status.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Заказов пока нет</h3>
              <p className="text-muted-foreground">
                Заказы появятся здесь после первых покупок
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
