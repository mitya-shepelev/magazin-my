import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddToCartButton } from "@/components/shop/AddToCartButton"
import {
  ExternalLink,
  Download,
  Star,
  Check,
  Shield,
  RefreshCw,
  Headphones,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react"
import { ImagePlaceholder } from "@/components/ui/image-placeholder"

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

async function getProduct(slug: string) {
  return db.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: true,
      seo: true,
    },
  })
}

async function getRelatedProducts(categoryId: string, currentId: string) {
  return db.product.findMany({
    where: {
      categoryId,
      isActive: true,
      id: { not: currentId },
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  })
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    return { title: "Товар не найден" }
  }

  const images = JSON.parse(product.images || "[]")

  return {
    title: product.seo?.title || product.name,
    description: product.seo?.description || product.shortDesc || product.description.slice(0, 160),
    keywords: product.seo?.keywords?.split(",").map(k => k.trim()),
    openGraph: {
      title: product.seo?.title || product.name,
      description: product.seo?.description || product.shortDesc || product.description.slice(0, 160),
      images: images[0] ? [{ url: images[0] }] : undefined,
    },
    alternates: product.seo?.canonicalUrl ? {
      canonical: product.seo.canonicalUrl,
    } : undefined,
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) {
    notFound()
  }

  const relatedProducts = await getRelatedProducts(product.categoryId, product.id)
  const images = JSON.parse(product.images || "[]")
  const features = product.features ? JSON.parse(product.features) : []
  const discountPercent = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  return (
    <div className="min-h-screen gradient-mesh noise-overlay">
      {/* Hero Section with Spotlight */}
      <div className="spotlight">
        <div className="container py-8 relative z-10">
          {/* Breadcrumb */}
          <nav className="mb-8 reveal-up">
            <ol className="flex items-center text-sm text-muted-foreground flex-wrap gap-1">
              <li>
                <Link
                  href="/"
                  className="hover:text-primary transition-colors duration-200"
                >
                  Главная
                </Link>
              </li>
              <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
              <li>
                <Link
                  href="/catalog"
                  className="hover:text-primary transition-colors duration-200"
                >
                  Каталог
                </Link>
              </li>
              <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
              <li>
                <Link
                  href={`/category/${product.category.slug}`}
                  className="hover:text-primary transition-colors duration-200"
                >
                  {product.category.name}
                </Link>
              </li>
              <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
              <li className="text-foreground font-medium">{product.name}</li>
            </ol>
          </nav>

          {/* Main Product Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-16">
            {/* Image Gallery */}
            <div className="lg:col-span-7 space-y-4 reveal-up delay-100">
              {/* Main Image */}
              <div className="image-frame aspect-[4/3] bg-secondary/30 relative group">
                {images[0] ? (
                  <img
                    src={images[0]}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <ImagePlaceholder type={product.productType as "WEB_APP" | "MOBILE_APP"} size="lg" />
                )}

                {/* Floating Badge */}
                {discountPercent > 0 && (
                  <div className="absolute top-4 left-4 z-10">
                    <div className="badge-glow px-4 py-2 rounded-full text-sm font-bold text-primary-foreground flex items-center gap-2 shimmer">
                      <Zap className="w-4 h-4" />
                      -{discountPercent}%
                    </div>
                  </div>
                )}

                {/* Product Type Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="glass px-3 py-1.5 rounded-full text-xs font-medium">
                    {product.productType === "WEB_APP" ? "Веб-приложение" : "Мобильное приложение"}
                  </div>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {images.slice(0, 4).map((image: string, index: number) => (
                    <div
                      key={index}
                      className="image-frame aspect-video bg-secondary/30 cursor-pointer hover-lift group"
                    >
                      <img
                        src={image}
                        alt={`${product.name} - ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="lg:col-span-5 space-y-6">
              {/* Header */}
              <div className="reveal-up delay-200">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="secondary" className="glass text-xs">
                    {product.category.name}
                  </Badge>
                  {product.isFeatured && (
                    <Badge className="badge-glow text-xs flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Рекомендуем
                    </Badge>
                  )}
                </div>

                <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2">
                  {product.name}
                </h1>

                {product.version && (
                  <p className="text-muted-foreground text-sm">
                    Версия {product.version}
                  </p>
                )}
              </div>

              {/* Price Block */}
              <div className="glass-strong rounded-2xl p-6 reveal-up delay-300">
                <div className="flex items-end gap-4 mb-4">
                  <span className="text-5xl font-extrabold price-tag">
                    {product.price.toLocaleString("ru-RU")} ₽
                  </span>
                  {product.oldPrice && (
                    <span className="text-xl text-muted-foreground line-through mb-1">
                      {product.oldPrice.toLocaleString("ru-RU")} ₽
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  {product.shortDesc || product.description}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <AddToCartButton
                    product={product}
                    size="lg"
                    showPrice
                    className="flex-1 gradient-animate text-primary-foreground font-semibold h-14 text-lg rounded-xl pulse-glow hover:scale-[1.02] transition-transform"
                  />
                  {product.demoUrl && (
                    <Button
                      variant="outline"
                      size="lg"
                      asChild
                      className="glass border-primary/30 hover:border-primary/60 hover:bg-primary/10 h-14 rounded-xl transition-all duration-300"
                    >
                      <a href={product.demoUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-5 w-5 mr-2" />
                        Демо
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* Features List */}
              {features.length > 0 && (
                <div className="glass rounded-2xl p-6 reveal-up delay-400">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Возможности
                  </h3>
                  <ul className="space-y-3">
                    {features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-3 group">
                        <div className="p-1 rounded-full bg-primary/20 mt-0.5 group-hover:bg-primary/40 transition-colors">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-foreground/90">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Trust Elements */}
              <div className="grid grid-cols-2 gap-3 reveal-up delay-500">
                <TrustBadge
                  icon={Download}
                  title="Мгновенная доставка"
                  desc="После оплаты сразу"
                  color="primary"
                />
                <TrustBadge
                  icon={Shield}
                  title="Гарантия 14 дней"
                  desc="Вернём деньги"
                  color="emerald"
                />
                <TrustBadge
                  icon={RefreshCw}
                  title="Обновления"
                  desc="Бесплатно навсегда"
                  color="cyan"
                />
                <TrustBadge
                  icon={Headphones}
                  title="Поддержка"
                  desc="Поможем настроить"
                  color="violet"
                />
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="glass rounded-3xl p-8 lg:p-12 mb-16 reveal-up">
            <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
              <span className="w-1.5 h-8 rounded-full gradient-animate" />
              Описание
            </h2>
            <div className="prose prose-invert prose-lg max-w-none">
              <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed text-lg">
                {product.description}
              </p>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="reveal-up">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <span className="w-1.5 h-8 rounded-full gradient-animate" />
                Похожие товары
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedProducts.map((related, index) => {
                  const relatedImages = JSON.parse(related.images || "[]")
                  return (
                    <Link
                      key={related.id}
                      href={`/product/${related.slug}`}
                      className={`reveal-up delay-${(index + 1) * 100}`}
                    >
                      <div className="glass rounded-2xl overflow-hidden hover-lift glow-border group">
                        <div className="aspect-video bg-secondary/30 overflow-hidden">
                          {relatedImages[0] ? (
                            <img
                              src={relatedImages[0]}
                              alt={related.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <ImagePlaceholder type="WEB_APP" size="sm" />
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                            {related.name}
                          </h3>
                          <p className="text-2xl font-bold mt-2 price-tag">
                            {related.price.toLocaleString("ru-RU")} ₽
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 glass-strong p-4 md:hidden z-50 border-t border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground line-clamp-1">{product.name}</p>
            <p className="font-bold text-lg price-tag">
              {product.price.toLocaleString("ru-RU")} ₽
            </p>
          </div>
          <AddToCartButton
            product={product}
            size="default"
            className="gradient-animate text-primary-foreground font-semibold rounded-xl px-6"
          />
        </div>
      </div>

      {/* Spacer for mobile CTA */}
      <div className="h-28 md:hidden" />
    </div>
  )
}

// Trust Badge Component
function TrustBadge({
  icon: Icon,
  title,
  desc,
  color
}: {
  icon: typeof Download
  title: string
  desc: string
  color: 'primary' | 'emerald' | 'cyan' | 'violet'
}) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    cyan: 'text-cyan-400 bg-cyan-400/10',
    violet: 'text-violet-400 bg-violet-400/10',
  }

  return (
    <div className="glass rounded-xl p-4 hover-lift group cursor-default">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3 transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}
