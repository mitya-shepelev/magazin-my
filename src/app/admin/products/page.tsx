import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Eye, Star } from "lucide-react"
import { DeleteProductButton } from "@/components/admin/DeleteProductButton"

async function getProducts() {
  return db.product.findMany({
    include: {
      category: {
        select: { name: true }
      },
      seo: true,
    },
    orderBy: { createdAt: "desc" }
  })
}

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Товары</h1>
          <p className="text-muted-foreground">Управление товарами магазина</p>
        </div>
        <Link href="/admin/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить товар
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все товары ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>SEO</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {product.isFeatured && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.productType === "WEB_APP" ? "Веб" : "Мобильное"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {product.price.toLocaleString("ru-RU")} ₽
                        </span>
                        {product.oldPrice && (
                          <span className="ml-2 text-sm text-muted-foreground line-through">
                            {product.oldPrice.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.seo ? (
                        <Badge variant="secondary">Заполнено</Badge>
                      ) : (
                        <Badge variant="outline">Нет</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.isActive ? (
                        <Badge className="bg-green-100 text-green-700">Активен</Badge>
                      ) : (
                        <Badge variant="secondary">Скрыт</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/product/${product.slug}`} target="_blank">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/products/${product.id}`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DeleteProductButton
                          id={product.id}
                          name={product.name}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Товаров пока нет</p>
              <Link href="/admin/products/new">
                <Button>Создать первый товар</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
