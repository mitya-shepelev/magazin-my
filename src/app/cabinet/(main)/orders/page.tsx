import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Download, Eye } from "lucide-react"

async function getOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: true },
      },
    },
  })
}

export default async function OrdersPage() {
  const session = await auth()
  const orders = await getOrders(session!.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мои заказы</h1>
        <p className="text-muted-foreground">История ваших покупок</p>
      </div>

      {orders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1">
                {/* Header: Order number & Status */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold">#{order.orderNumber}</span>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      order.status === "PAID"
                        ? "default"
                        : order.status === "PENDING"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {order.status === "PAID"
                      ? "Оплачен"
                      : order.status === "PENDING"
                      ? "Ожидает"
                      : "Отменён"}
                  </Badge>
                </div>

                {/* Products */}
                <div className="flex-1 space-y-2 mb-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2">
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="text-sm hover:underline truncate flex-1"
                      >
                        {item.productName}
                      </Link>
                      {order.status === "PAID" && (
                        <Link href={`/api/download/${item.downloadKey}`}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                            <Download className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer: Total & Action */}
                <div className="pt-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Итого</span>
                    <span className="text-lg font-bold">
                      {order.total.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                  {order.status === "PAID" && order.installationStatus !== "NOT_STARTED" && (
                    <Link href={`/cabinet/orders/${order.id}`} className="block">
                      <Button size="sm" className="w-full gap-2">
                        <Eye className="h-4 w-4" />
                        Прогресс установки
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">У вас пока нет заказов</p>
            <Link href="/catalog">
              <Button>Перейти в каталог</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
