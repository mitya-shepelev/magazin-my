import Link from "next/link"
import { db } from "@/lib/db"
import { cached } from "@/lib/cache"
import { CACHE_KEYS, CACHE_TTL } from "@/lib/cache-keys"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Smartphone,
  Globe,
  Download,
  Code,
  RefreshCw,
  Headphones,
  Search,
  CreditCard,
  Quote,
  Star,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react"
import { ImagePlaceholder } from "@/components/ui/image-placeholder"
import { Header } from "@/components/shared/Header"
import { Footer } from "@/components/shared/Footer"

// ==================== DATA FETCHING (with Redis Cache) ====================

async function getFeaturedProducts() {
  return cached(
    CACHE_KEYS.HOME_FEATURED,
    async () => {
      // Сначала пробуем получить рекомендуемые товары
      const featured = await db.product.findMany({
        where: { isActive: true, isFeatured: true },
        include: { category: true },
        take: 3,
        orderBy: { downloads: "desc" },
      })

      // Если нет рекомендуемых — показываем любые активные товары
      if (featured.length === 0) {
        return db.product.findMany({
          where: { isActive: true },
          include: { category: true },
          take: 3,
          orderBy: { createdAt: "desc" },
        })
      }

      return featured
    },
    CACHE_TTL.PRODUCTS
  )
}

async function getCategories() {
  return cached(
    CACHE_KEYS.HOME_CATEGORIES,
    async () => {
      return db.category.findMany({
        where: { isActive: true, parentId: null },
        include: { _count: { select: { products: true } } },
        orderBy: { sortOrder: "asc" },
      })
    },
    CACHE_TTL.CATEGORIES
  )
}

async function getReviews() {
  return cached(
    CACHE_KEYS.HOME_REVIEWS,
    async () => {
      return db.review.findMany({
        where: { isActive: true },
        take: 3,
        orderBy: { createdAt: "desc" },
      })
    },
    CACHE_TTL.CATEGORIES // 5 минут для отзывов
  )
}

async function getStats() {
  return cached(
    CACHE_KEYS.HOME_STATS,
    async () => {
      const [productCount, orderCount] = await Promise.all([
        db.product.count({ where: { isActive: true } }),
        db.order.count({ where: { status: "PAID" } }),
      ])
      return { productCount, orderCount }
    },
    CACHE_TTL.SETTINGS // 10 минут для статистики
  )
}

// ==================== PAGE COMPONENT ====================

export default async function HomePage() {
  const [products, categories, reviews, stats] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getReviews(),
    getStats(),
  ])

  const heroProduct = products[0]

  return (
    <>
      <Header />
      <div className="min-h-screen">
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative gradient-mesh noise-overlay overflow-hidden">
          <div className="spotlight">
            <div className="container py-16 lg:py-24 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Left Column - Text */}
                <div className="lg:col-span-7 space-y-6 reveal-up">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Готовые решения для бизнеса</span>
                  </div>

                  {/* Headline */}
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                    Веб-приложения{" "}
                    <span className="text-gradient">от экспертов</span>
                  </h1>

                  {/* Subheadline */}
                  <p className="text-xl text-muted-foreground max-w-xl">
                    Экономьте месяцы разработки. Покупайте готовые решения
                    с поддержкой и бесплатными обновлениями.
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link href="/catalog">
                      <Button size="lg" className="gradient-animate text-primary-foreground font-semibold h-14 px-8 rounded-xl pulse-glow">
                        Смотреть каталог
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                    <Link href="#how-it-works">
                      <Button size="lg" variant="outline" className="glass h-14 px-8 rounded-xl">
                        Как это работает
                      </Button>
                    </Link>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 pt-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">{stats.productCount}+</span>
                      <span>продуктов</span>
                    </div>
                    <div className="w-px h-6 bg-border" />
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">{stats.orderCount || 500}+</span>
                      <span>клиентов</span>
                    </div>
                    <div className="w-px h-6 bg-border" />
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-2xl font-bold text-foreground">4.9</span>
                      <span>рейтинг</span>
                    </div>
                  </div>
                </div>

                {/* Right Column - Floating Product Card */}
                <div className="lg:col-span-5 reveal-up delay-200">
                  {heroProduct ? (
                    <HeroProductCard product={heroProduct} />
                  ) : (
                    <div className="glass rounded-3xl p-8 text-center">
                      <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Скоро появятся товары</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== BENEFITS SECTION ==================== */}
        <section className="py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-12 reveal-up">
              <h2 className="text-3xl font-bold mb-4">Почему выбирают нас</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Мы создаём качественные продукты и заботимся о каждом клиенте
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <BenefitCard
                icon={Download}
                title="Мгновенная доставка"
                description="Получите доступ сразу после оплаты. Без ожидания."
                color="emerald"
                delay="delay-100"
              />
              <BenefitCard
                icon={Code}
                title="Исходный код"
                description="Полный доступ к коду. Модифицируйте под свои нужды."
                color="cyan"
                delay="delay-200"
              />
              <BenefitCard
                icon={RefreshCw}
                title="Бесплатные обновления"
                description="Все будущие версии бесплатно. Навсегда."
                color="violet"
                delay="delay-300"
              />
              <BenefitCard
                icon={Headphones}
                title="Поддержка экспертов"
                description="Поможем с установкой и настройкой. Ответим на вопросы."
                color="amber"
                delay="delay-400"
              />
            </div>
          </div>
        </section>

        {/* ==================== PRODUCTS SECTION ==================== */}
        <section className="py-20">
          <div className="container">
            <div className="flex items-center justify-between mb-12 reveal-up">
              <div>
                <h2 className="text-3xl font-bold mb-2">Популярные решения</h2>
                <p className="text-muted-foreground">Выбор наших клиентов</p>
              </div>
              <Link href="/catalog">
                <Button variant="ghost" className="gap-2">
                  Все товары <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.length > 0 ? (
                products.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))
              ) : (
                <div className="col-span-full text-center py-12 glass rounded-2xl">
                  <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Товары скоро появятся</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS SECTION ==================== */}
        <section id="how-it-works" className="py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-16 reveal-up">
              <h2 className="text-3xl font-bold mb-4">Как это работает</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Три простых шага до запуска вашего проекта
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Connecting Line (desktop only) */}
              <div className="hidden md:block absolute top-16 left-1/4 right-1/4 h-0.5 gradient-animate" />

              <StepCard
                number="01"
                icon={Search}
                title="Выберите продукт"
                description="Изучите каталог и выберите решение для вашего бизнеса"
                delay="delay-100"
              />
              <StepCard
                number="02"
                icon={CreditCard}
                title="Оплатите онлайн"
                description="Безопасная оплата картой. Мгновенное подтверждение"
                delay="delay-200"
              />
              <StepCard
                number="03"
                icon={Download}
                title="Скачайте и используйте"
                description="Получите файлы и документацию. Запускайте сразу"
                delay="delay-300"
              />
            </div>
          </div>
        </section>

        {/* ==================== REVIEWS SECTION ==================== */}
        {reviews.length > 0 && (
          <section className="py-20">
            <div className="container">
              <div className="text-center mb-12 reveal-up">
                <h2 className="text-3xl font-bold mb-4">Что говорят клиенты</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Реальные отзывы о наших продуктах
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {reviews.map((review, index) => (
                  <ReviewCard key={review.id} review={review} index={index} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== CATEGORIES SECTION ==================== */}
        <section className="py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-12 reveal-up">
              <h2 className="text-3xl font-bold mb-4">Каталог решений</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Выберите направление
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {categories.length > 0 ? (
                categories.map((category, index) => (
                  <CategoryCard key={category.id} category={category} index={index} />
                ))
              ) : (
                <>
                  <CategoryCardPlaceholder
                    icon={Globe}
                    title="Веб-приложения"
                    description="CRM, магазины, LMS, порталы"
                    href="/category/web-apps"
                  />
                  <CategoryCardPlaceholder
                    icon={Smartphone}
                    title="Мобильные приложения"
                    description="iOS и Android решения"
                    href="/category/mobile-apps"
                  />
                </>
              )}
            </div>
          </div>
        </section>

        {/* ==================== CTA SECTION ==================== */}
        <section className="py-20">
          <div className="container">
            <div className="relative overflow-hidden rounded-3xl gradient-animate p-12 lg:p-16 text-center noise-overlay reveal-up">
              {/* Decorative elements */}
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

              <div className="relative z-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                  Готовы запустить свой проект?
                </h2>
                <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
                  Выберите решение и начните работу уже сегодня.
                  Поддержка и обновления включены.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/catalog">
                    <Button size="lg" variant="secondary" className="h-14 px-8 rounded-xl font-semibold">
                      Смотреть каталог
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/contacts">
                    <Button size="lg" variant="outline" className="h-14 px-8 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
                      Связаться с нами
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}

// ==================== COMPONENTS ====================

function HeroProductCard({ product }: { product: any }) {
  const images = JSON.parse(product.images || "[]")
  const discountPercent = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  return (
    <Link href={`/product/${product.slug}`}>
      <div className="glass rounded-3xl overflow-hidden glow-border hover-lift float group">
        {/* Image */}
        <div className="aspect-[4/3] bg-secondary/50 relative overflow-hidden">
          {images[0] ? (
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <ImagePlaceholder type={product.productType} size="lg" />
          )}

          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="absolute top-4 left-4">
              <div className="badge-glow px-3 py-1.5 rounded-full text-sm font-bold text-white flex items-center gap-1 shimmer">
                <Zap className="w-3 h-3" />
                -{discountPercent}%
              </div>
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-4 right-4">
            <Badge variant="secondary" className="glass">
              {product.category.name}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {product.shortDesc || product.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold price-tag">
                {product.price.toLocaleString("ru-RU")} ₽
              </span>
              {product.oldPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {product.oldPrice.toLocaleString("ru-RU")} ₽
                </span>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function BenefitCard({
  icon: Icon,
  title,
  description,
  color,
  delay,
}: {
  icon: typeof Download
  title: string
  description: string
  color: "emerald" | "cyan" | "violet" | "amber"
  delay: string
}) {
  const colorClasses = {
    emerald: "text-emerald-500 bg-emerald-500/10",
    cyan: "text-cyan-500 bg-cyan-500/10",
    violet: "text-violet-500 bg-violet-500/10",
    amber: "text-amber-500 bg-amber-500/10",
  }

  return (
    <div className={`glass rounded-2xl p-6 hover-lift reveal-up ${delay} group`}>
      <div className={`w-14 h-14 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function ProductCard({ product, index }: { product: any; index: number }) {
  const images = JSON.parse(product.images || "[]")
  const discountPercent = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0

  return (
    <Link href={`/product/${product.slug}`} className={`reveal-up delay-${(index + 1) * 100}`}>
      <div className="glass rounded-2xl overflow-hidden glow-border hover-lift group h-full">
        {/* Image */}
        <div className="aspect-[4/3] bg-secondary/50 relative overflow-hidden">
          {images[0] ? (
            <img
              src={images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <ImagePlaceholder type={product.productType} size="md" />
          )}

          {discountPercent > 0 && (
            <div className="absolute top-3 left-3">
              <div className="badge-glow px-3 py-1 rounded-full text-xs font-bold text-white shimmer">
                -{discountPercent}%
              </div>
            </div>
          )}

          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="glass text-xs">
              {product.category.name}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {product.shortDesc || product.description}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold price-tag">
                {product.price.toLocaleString("ru-RU")} ₽
              </span>
              {product.oldPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  {product.oldPrice.toLocaleString("ru-RU")} ₽
                </span>
              )}
            </div>
            <Button size="sm" className="gradient-animate text-white text-xs">
              Подробнее
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
  delay,
}: {
  number: string
  icon: typeof Search
  title: string
  description: string
  delay: string
}) {
  return (
    <div className={`text-center reveal-up ${delay}`}>
      {/* Number */}
      <div className="relative inline-block mb-6">
        <div className="w-20 h-20 rounded-full gradient-animate flex items-center justify-center mx-auto">
          <span className="text-3xl font-bold text-white">{number}</span>
        </div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 glass rounded-full flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <h3 className="font-bold text-xl mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function ReviewCard({ review, index }: { review: any; index: number }) {
  return (
    <div className={`glass rounded-2xl p-6 hover-lift reveal-up delay-${(index + 1) * 100}`}>
      {/* Quote Icon */}
      <Quote className="w-8 h-8 text-primary/30 mb-4" />

      {/* Review Text */}
      <p className="text-foreground/90 italic mb-6 leading-relaxed">
        &quot;{review.text}&quot;
      </p>

      {/* Divider */}
      <div className="w-12 h-0.5 gradient-animate mb-4" />

      {/* Author */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full gradient-animate flex items-center justify-center text-white font-bold">
          {review.name.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="font-semibold">{review.name}</p>
          {review.company && (
            <p className="text-sm text-muted-foreground">{review.company}</p>
          )}
        </div>
        {/* Rating */}
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-muted-foreground"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryCard({ category, index }: { category: any; index: number }) {
  const isWeb = category.slug.includes("web") || !category.slug.includes("mobile")
  const Icon = isWeb ? Globe : Smartphone

  return (
    <Link href={`/category/${category.slug}`} className={`reveal-up delay-${(index + 1) * 100}`}>
      <div className="glass rounded-2xl p-8 hover-lift glow-border group relative overflow-hidden aspect-[2/1] flex flex-col justify-between">
        {/* Background gradient */}
        <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-primary/10 to-transparent" />

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
          {category.description && (
            <p className="text-muted-foreground">{category.description}</p>
          )}
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {category._count.products} продуктов
          </span>
          <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

function CategoryCardPlaceholder({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Globe
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href}>
      <div className="glass rounded-2xl p-8 hover-lift glow-border group relative overflow-hidden aspect-[2/1] flex flex-col justify-between">
        <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-primary/10 to-transparent" />

        <div className="relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Скоро</span>
          <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  )
}
