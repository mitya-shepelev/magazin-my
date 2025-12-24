import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Заказ #{order.orderNumber}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
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
                    ? "Ожидает оплаты"
                    : "Отменён"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="font-medium hover:underline"
                        >
                          {item.productName}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.price.toLocaleString("ru-RU")} ₽
                        </p>
                      </div>
                      {order.status === "PAID" && (
                        <Link href={`/api/download/${item.downloadKey}`}>
                          <Button size="sm" variant="outline" className="gap-2">
                            <Download className="h-4 w-4" />
                            Скачать
                          </Button>
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <span className="font-semibold">Итого:</span>
                  <span className="text-lg font-bold">
                    {order.total.toLocaleString("ru-RU")} ₽
                  </span>
                </div>

                {order.status === "PAID" && order.installationStatus !== "NOT_STARTED" && (
                  <div className="mt-4 pt-4 border-t">
                    <Link href={`/cabinet/orders/${order.id}`}>
                      <Button className="w-full gap-2">
                        <Eye className="h-4 w-4" />
                        Прогресс установки
                      </Button>
                    </Link>
                  </div>
                )}
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
