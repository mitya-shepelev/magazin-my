import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { Download, Globe, Smartphone, ExternalLink } from "lucide-react"

async function getPurchasedProducts(userId: string) {
  return db.orderItem.findMany({
    where: {
      order: {
        userId,
        status: "PAID",
      },
    },
    include: {
      product: true,
      order: true,
    },
    orderBy: {
      order: {
        paidAt: "desc",
      },
    },
  })
}

export default async function DownloadsPage() {
  const session = await auth()
  const items = await getPurchasedProducts(session!.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Мои загрузки</h1>
        <p className="text-muted-foreground">Ваши приобретённые товары</p>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const images = JSON.parse(item.product.images || "[]")
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-16 bg-muted rounded-lg overflow-hidden shrink-0 relative">
                      {images[0] ? (
                        <Image
                          src={images[0]}
                          alt={item.product.name}
                          fill
                          sizes="96px"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {item.product.productType === "MOBILE_APP" ? (
                            <Smartphone className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <Globe className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="font-medium hover:underline line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {item.product.productType === "WEB_APP"
                            ? "Веб"
                            : "Мобильное"}
                        </Badge>
                        {item.product.version && (
                          <span className="text-xs text-muted-foreground">
                            v{item.product.version}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Куплено{" "}
                        {new Date(item.order.paidAt!).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Link href={`/api/download/${item.downloadKey}`} className="flex-1">
                      <Button className="w-full gap-2">
                        <Download className="h-4 w-4" />
                        Скачать
                      </Button>
                    </Link>
                    {item.product.demoUrl && (
                      <Button variant="outline" size="icon" asChild>
                        <a
                          href={item.product.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Скачиваний: {item.downloadCount}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              У вас пока нет приобретённых товаров
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
