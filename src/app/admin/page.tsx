import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/db"
import {
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle,
  Eye,
  Plus,
  LayoutDashboard,
} from "lucide-react"

async function getStats() {
  const [productsCount, categoriesCount, ordersCount, usersCount, revenue, pendingOrders] = await Promise.all([
    db.product.count({ where: { isActive: true } }),
    db.category.count({ where: { isActive: true } }),
    db.order.count({ where: { status: "PAID" } }),
    db.user.count(),
    db.order.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
    }),
    db.order.count({ where: { status: "PENDING" } }),
  ])

  return {
    productsCount,
    categoriesCount,
    ordersCount,
    usersCount,
    pendingOrders,
    revenue: revenue._sum.total || 0,
  }
}

async function getRecentOrders() {
  return db.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { name: true, email: true },
      },
      items: {
        select: { productName: true },
      },
    },
  })
}

async function getRecentProducts() {
  return db.product.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { category: true },
  })
}

export default async function AdminDashboard() {
  const [stats, recentOrders, recentProducts] = await Promise.all([
    getStats(),
    getRecentOrders(),
    getRecentProducts(),
  ])

  const statCards = [
    {
      title: "Товары",
      value: stats.productsCount,
      description: "активных",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      href: "/admin/products",
    },
    {
      title: "Категории",
      value: stats.categoriesCount,
      description: "в каталоге",
      icon: FolderTree,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      href: "/admin/categories",
    },
    {
      title: "Заказы",
      value: stats.ordersCount,
      description: "оплачено",
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      href: "/admin/orders",
      badge: stats.pendingOrders > 0 ? `${stats.pendingOrders} новых` : undefined,
    },
    {
      title: "Клиенты",
      value: stats.usersCount,
      description: "зарегистрировано",
      icon: Users,
      color: "text-amber-600",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      href: "/admin/users",
    },
    {
      title: "Выручка",
      value: `${stats.revenue.toLocaleString("ru-RU")} ₽`,
      description: "всего",
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      href: "/admin/orders",
      isPrice: true,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            Дашборд
          </h1>
          <p className="text-muted-foreground mt-1">
            Добро пожаловать в панель управления
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Новый товар
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="glass hover-lift cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.isPrice ? "price-tag" : ""}`}>
                  {stat.value}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                  {stat.badge && (
                    <Badge variant="secondary" className="text-xs">
                      {stat.badge}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Последние заказы
              </CardTitle>
              <CardDescription>Недавняя активность</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders">
                Все <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        order.status === "PAID"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : order.status === "PENDING"
                          ? "bg-yellow-100 dark:bg-yellow-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}>
                        {order.status === "PAID" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.user?.name || order.user?.email || order.customerEmail}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {order.total.toLocaleString("ru-RU")} ₽
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Заказов пока нет</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Products */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Последние товары
              </CardTitle>
              <CardDescription>Недавно добавленные</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/products">
                Все <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentProducts.length > 0 ? (
              <div className="space-y-3">
                {recentProducts.map((product) => {
                  const images = JSON.parse(product.images || "[]")
                  return (
                    <Link
                      key={product.id}
                      href={`/admin/products/${product.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                          {images[0] ? (
                            <img
                              src={images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm group-hover:text-primary transition-colors">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {product.category.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {product.price.toLocaleString("ru-RU")} ₽
                        </span>
                        <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Товаров пока нет</p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/admin/products/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить товар
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
