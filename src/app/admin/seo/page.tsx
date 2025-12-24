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
  Search,
  FileText,
  Globe,
  Tag,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Package,
  FolderTree,
} from "lucide-react"

export const metadata: Metadata = {
  title: "SEO | Админ-панель",
  description: "Управление SEO-оптимизацией",
}

async function getSeoData() {
  const [products, categories, pages, seoMetas] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      include: { seo: true },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({
      where: { isActive: true },
      include: { seo: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.page.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    db.seoMeta.count(),
  ])

  const productsWithSeo = products.filter((p) => p.seo).length
  const categoriesWithSeo = categories.filter((c) => c.seo).length
  const pagesWithSeo = pages.filter((p) => p.seoTitle).length

  return {
    products,
    categories,
    pages,
    stats: {
      total: products.length + categories.length + pages.length,
      withSeo: productsWithSeo + categoriesWithSeo + pagesWithSeo,
      seoMetas,
    },
  }
}

export default async function SeoPage() {
  const { products, categories, pages, stats } = await getSeoData()
  const seoPercentage = stats.total > 0
    ? Math.round((stats.withSeo / stats.total) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-primary" />
            </div>
            SEO-оптимизация
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление мета-данными для поисковых систем
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardDescription>Всего страниц</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              Требуют SEO
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-green-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Оптимизировано</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.withSeo}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              С мета-данными
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-yellow-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Без SEO</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {stats.total - stats.withSeo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-yellow-600">
              <AlertCircle className="h-3 w-3" />
              Требуют внимания
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Покрытие</CardDescription>
            <CardTitle className="text-3xl text-primary">{seoPercentage}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${seoPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products SEO */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Товары
              </CardTitle>
              <CardDescription>
                SEO-настройки для товаров
              </CardDescription>
            </div>
            <Badge variant="outline">
              {products.filter((p) => p.seo).length} / {products.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="hover:bg-secondary/50">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      /product/{product.slug}
                    </TableCell>
                    <TableCell>
                      {product.seo?.title ? (
                        <span className="text-sm">{product.seo.title.slice(0, 30)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.seo?.description ? (
                        <span className="text-sm">{product.seo.description.slice(0, 40)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.seo ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Настроено
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Не настроено
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/products/${product.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Товаров пока нет
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories SEO */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Категории
              </CardTitle>
              <CardDescription>
                SEO-настройки для категорий
              </CardDescription>
            </div>
            <Badge variant="outline">
              {categories.filter((c) => c.seo).length} / {categories.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Категория</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="hover:bg-secondary/50">
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      /category/{category.slug}
                    </TableCell>
                    <TableCell>
                      {category.seo?.title ? (
                        <span className="text-sm">{category.seo.title.slice(0, 30)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.seo?.description ? (
                        <span className="text-sm">{category.seo.description.slice(0, 40)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {category.seo ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Настроено
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Не настроено
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/categories/${category.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Категорий пока нет
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pages SEO */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Страницы
              </CardTitle>
              <CardDescription>
                SEO-настройки для статических страниц
              </CardDescription>
            </div>
            <Badge variant="outline">
              {pages.filter((p) => p.seoTitle).length} / {pages.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Страница</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>SEO Title</TableHead>
                  <TableHead>SEO Description</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page) => (
                  <TableRow key={page.id} className="hover:bg-secondary/50">
                    <TableCell className="font-medium">{page.title}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      /{page.slug}
                    </TableCell>
                    <TableCell>
                      {page.seoTitle ? (
                        <span className="text-sm">{page.seoTitle.slice(0, 30)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {page.seoDesc ? (
                        <span className="text-sm">{page.seoDesc.slice(0, 40)}...</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {page.seoTitle ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Настроено
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Не настроено
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Страниц пока нет
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
