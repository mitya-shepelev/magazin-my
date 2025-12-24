import { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Globe, Smartphone, Zap, ArrowRight } from "lucide-react"
import { ImagePlaceholder } from "@/components/ui/image-placeholder"
import { CatalogSort } from "@/components/shop/CatalogSort"

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог веб-приложений и мобильных приложений",
}

type SortOption = "featured" | "newest" | "price_asc" | "price_desc" | "name"

function getSortOrder(sort: SortOption) {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" as const }]
    case "price_asc":
      return [{ price: "asc" as const }]
    case "price_desc":
      return [{ price: "desc" as const }]
    case "name":
      return [{ name: "asc" as const }]
    case "featured":
    default:
      return [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }]
  }
}

async function getProducts(sort: SortOption = "featured") {
  return db.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
    },
    orderBy: getSortOrder(sort),
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

interface CatalogPageProps {
  searchParams: Promise<{ sort?: string }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { sort } = await searchParams
  const sortOption = (sort as SortOption) || "featured"

  const [products, categories] = await Promise.all([
    getProducts(sortOption),
    getCategories(),
  ])

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <section className="gradient-mesh py-12 relative overflow-hidden">
        <div className="spotlight">
          <div className="container relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Каталог <span className="text-gradient">решений</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Выберите готовое решение для вашего бизнеса
            </p>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar with categories */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="sticky top-20 glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Категории
              </h2>
              <nav className="space-y-2">
                <Link
                  href="/catalog"
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-all"
                >
                  <span>Все товары</span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {products.length}
                  </Badge>
                </Link>
                {categories.map((category) => {
                  const isWeb = category.slug.includes("web")
                  const Icon = isWeb ? Globe : Smartphone
                  return (
                    <Link
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-secondary/80 transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        {category.name}
                      </span>
                      <Badge variant="outline">{category._count.products}</Badge>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Products grid */}
          <main className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <p className="text-muted-foreground">
                Найдено <span className="font-semibold text-foreground">{products.length}</span> товаров
              </p>
              <Suspense fallback={null}>
                <CatalogSort />
              </Suspense>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            ) : (
              <div className="glass rounded-2xl text-center py-16">
                <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Товаров пока нет</h3>
                <p className="text-muted-foreground">Скоро здесь появятся отличные решения</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, index }: { product: any; index: number }) {
  const images = JSON.parse(product.images || "[]")
  const discountPercent = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="glass rounded-2xl overflow-hidden glow-border hover-lift group h-full flex flex-col">
        {/* Image */}
        <div className="aspect-[16/10] bg-secondary/50 relative overflow-hidden">
          {images[0] ? (
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <ImagePlaceholder type={product.productType as "WEB_APP" | "MOBILE_APP"} size="md" />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2">
            {discountPercent > 0 && (
              <div className="badge-glow px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 shimmer">
                <Zap className="w-3 h-3" />
                -{discountPercent}%
              </div>
            )}
            {product.isFeatured && (
              <Badge className="bg-yellow-500/90 text-white border-0">
                Хит
              </Badge>
            )}
          </div>

          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="glass text-xs backdrop-blur-md">
              {product.category.name}
            </Badge>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
            <Button size="sm" className="gradient-animate text-white">
              <ArrowRight className="w-4 h-4 mr-1" />
              Подробнее
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-1">
            {product.shortDesc || product.description}
          </p>

          {/* Price & Action */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold price-tag">
                  {product.price.toLocaleString("ru-RU")} ₽
                </span>
              </div>
              {product.oldPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {product.oldPrice.toLocaleString("ru-RU")} ₽
                </span>
              )}
            </div>
            <Button size="sm" variant="outline" className="glass gap-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">В корзину</span>
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
