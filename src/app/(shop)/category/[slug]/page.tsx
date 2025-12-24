import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, Smartphone, ShoppingCart, ArrowLeft } from "lucide-react"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

async function getCategory(slug: string) {
  return db.category.findUnique({
    where: { slug },
    include: {
      seo: true,
      products: {
        where: { isActive: true },
        orderBy: [
          { isFeatured: "desc" },
          { createdAt: "desc" },
        ],
      },
    },
  })
}

async function getCategories() {
  return db.category.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: { products: { where: { isActive: true } } }
      }
    },
    orderBy: { sortOrder: "asc" }
  })
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = await getCategory(slug)

  if (!category) {
    return { title: "Категория не найдена" }
  }

  return {
    title: category.seo?.title || category.name,
    description: category.seo?.description || category.description || `Товары категории ${category.name}`,
    keywords: category.seo?.keywords?.split(",").map(k => k.trim()),
    alternates: category.seo?.canonicalUrl ? {
      canonical: category.seo.canonicalUrl,
    } : undefined,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const [category, categories] = await Promise.all([
    getCategory(slug),
    getCategories(),
  ])

  if (!category) {
    notFound()
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-20">
            <h2 className="text-lg font-semibold mb-4">Категории</h2>
            <nav className="space-y-1">
              <Link
                href="/catalog"
                className="block px-3 py-2 rounded-md hover:bg-muted transition-colors"
              >
                Все товары
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className={`block px-3 py-2 rounded-md transition-colors ${
                    cat.slug === slug
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {cat.name} ({cat._count.products})
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Products */}
        <main className="flex-1">
          <div className="mb-6">
            <Link
              href="/catalog"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад в каталог
            </Link>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground mt-2">{category.description}</p>
            )}
          </div>

          {category.products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {category.products.map((product) => {
                const images = JSON.parse(product.images || "[]")
                return (
                  <Link key={product.id} href={`/product/${product.slug}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                      <div className="aspect-video bg-muted rounded-t-lg overflow-hidden relative">
                        {images[0] ? (
                          <img
                            src={images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {product.productType === "MOBILE_APP" ? (
                              <Smartphone className="h-12 w-12 text-muted-foreground" />
                            ) : (
                              <Globe className="h-12 w-12 text-muted-foreground" />
                            )}
                          </div>
                        )}
                        {product.isFeatured && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500">
                            Рекомендуем
                          </Badge>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">
                            {product.productType === "WEB_APP" ? "Веб" : "Мобильное"}
                          </Badge>
                          {product.oldPrice && (
                            <Badge variant="destructive">Скидка</Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="text-muted-foreground line-clamp-2 text-sm">
                          {product.shortDesc || product.description}
                        </p>
                      </CardContent>
                      <CardFooter className="flex items-center justify-between pt-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold">
                            {product.price.toLocaleString("ru-RU")} ₽
                          </span>
                          {product.oldPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              {product.oldPrice.toLocaleString("ru-RU")} ₽
                            </span>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">В этой категории пока нет товаров</p>
              <Link href="/catalog">
                <Button variant="outline" className="mt-4">
                  Смотреть все товары
                </Button>
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
