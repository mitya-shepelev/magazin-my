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
import { Plus, Pencil } from "lucide-react"
import { DeleteCategoryButton } from "@/components/admin/DeleteCategoryButton"

async function getCategories() {
  return db.category.findMany({
    include: {
      _count: {
        select: { products: true }
      },
      seo: true,
      parent: {
        select: { name: true }
      }
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" }
    ]
  })
}

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Категории</h1>
          <p className="text-muted-foreground">Управление категориями товаров</p>
        </div>
        <Link href="/admin/categories/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить категорию
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Все категории ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Родитель</TableHead>
                  <TableHead>Товаров</TableHead>
                  <TableHead>SEO</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.slug}
                    </TableCell>
                    <TableCell>
                      {category.parent?.name || "—"}
                    </TableCell>
                    <TableCell>{category._count.products}</TableCell>
                    <TableCell>
                      {category.seo ? (
                        <Badge variant="secondary">Заполнено</Badge>
                      ) : (
                        <Badge variant="outline">Нет</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.isActive ? (
                        <Badge className="bg-green-100 text-green-700">Активна</Badge>
                      ) : (
                        <Badge variant="secondary">Скрыта</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/categories/${category.id}`}>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <DeleteCategoryButton
                          id={category.id}
                          name={category.name}
                          hasProducts={category._count.products > 0}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Категорий пока нет</p>
              <Link href="/admin/categories/new">
                <Button>Создать первую категорию</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
