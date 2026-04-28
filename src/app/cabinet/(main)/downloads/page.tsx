import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { Globe, KeyRound, Server, ShieldCheck, Smartphone } from "lucide-react"

async function getLicenses(userId: string) {
  return db.license.findMany({
    where: { userId },
    include: {
      product: true,
      order: true,
      orderItem: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

export default async function DownloadsPage() {
  const session = await auth()
  const licenses = await getLicenses(session!.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мои лицензии</h1>
        <p className="text-muted-foreground">
          Доступ к продуктам выдаётся через лицензию и установку администратором
        </p>
      </div>

      {licenses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {licenses.map((license) => {
            const images = JSON.parse(license.product.images || "[]")
            return (
              <Card key={license.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-16 bg-muted rounded-lg overflow-hidden shrink-0 relative">
                      {images[0] ? (
                        <Image
                          src={images[0]}
                          alt={license.product.name}
                          fill
                          sizes="96px"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {license.product.productType === "MOBILE_APP" ? (
                            <Smartphone className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <Globe className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${license.product.slug}`}
                        className="font-medium hover:underline line-clamp-1"
                      >
                        {license.product.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {license.product.productType === "WEB_APP"
                            ? "Веб"
                            : "Мобильное"}
                        </Badge>
                        {license.product.version && (
                          <span className="text-xs text-muted-foreground">
                            v{license.product.version}
                          </span>
                        )}
                        <Badge>
                          {license.status === "ACTIVE" ? "Активна" : license.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Заказ #{license.order.orderNumber}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <KeyRound className="h-4 w-4" />
                      <span className="font-mono text-xs break-all">
                        {license.licenseKey}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>
                          Домен: {license.domain || "будет привязан при установке"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        <span>
                          IP сервера: {license.serverIp || "будет привязан при установке"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span>
                          Проверка:{" "}
                          {license.lastCheckAt
                            ? new Date(license.lastCheckAt).toLocaleDateString("ru-RU")
                            : "ожидает активации"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link href={`/cabinet/orders/${license.orderId}`} className="block mt-4">
                    <Button className="w-full gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Открыть установку
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              У вас пока нет активных лицензий
            </p>
            <Link href="/catalog">
              <Button>Перейти в каталог</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
