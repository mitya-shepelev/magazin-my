import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Package, Download, ShoppingCart, ArrowRight } from "lucide-react"

async function getUserStats(userId: string) {
  const [ordersCount, paidOrdersCount, downloadsCount] = await Promise.all([
    db.order.count({ where: { userId } }),
    db.order.count({ where: { userId, status: "PAID" } }),
    db.orderItem.count({
      where: {
        order: { userId, status: "PAID" },
        downloadCount: { gt: 0 },
      },
    }),
  ])

  return { ordersCount, paidOrdersCount, downloadsCount }
}

async function getRecentOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: true },
      },
    },
  })
}

export default async function CabinetPage() {
  const session = await auth()
  const userId = session!.user.id

  const [stats, recentOrders] = await Promise.all([
    getUserStats(userId),
    getRecentOrders(userId),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          Добро пожаловать, {session?.user.name || "Пользователь"}!
        </h1>
        <p className="text-muted-foreground">Обзор вашего аккаунта</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ordersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Оплачено</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paidOrdersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Загрузок</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.downloadsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Последние заказы</CardTitle>
          <Link href="/cabinet/orders">
            <Button variant="ghost" size="sm" className="gap-2">
              Все заказы <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">Заказ #{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.items.length} товар(ов)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {order.total.toLocaleString("ru-RU")} ₽
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        order.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : order.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {order.status === "PAID"
                        ? "Оплачен"
                        : order.status === "PENDING"
                        ? "Ожидает оплаты"
                        : "Отменён"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">У вас пока нет заказов</p>
              <Link href="/catalog">
                <Button>Перейти в каталог</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
