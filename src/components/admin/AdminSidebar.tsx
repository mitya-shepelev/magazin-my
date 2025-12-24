"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Settings,
  Search,
  ArrowLeft,
  Store,
  ChevronRight,
} from "lucide-react"
import { ThemeToggle } from "@/components/shared/ThemeToggle"

const menuItems = [
  {
    title: "Дашборд",
    href: "/admin",
    icon: LayoutDashboard,
    description: "Обзор и статистика",
  },
  {
    title: "Товары",
    href: "/admin/products",
    icon: Package,
    description: "Управление товарами",
  },
  {
    title: "Категории",
    href: "/admin/categories",
    icon: FolderTree,
    description: "Структура каталога",
  },
  {
    title: "Заказы",
    href: "/admin/orders",
    icon: ShoppingCart,
    description: "Обработка заказов",
  },
  {
    title: "Пользователи",
    href: "/admin/users",
    icon: Users,
    description: "Клиенты магазина",
  },
  {
    title: "SEO",
    href: "/admin/seo",
    icon: Search,
    description: "Оптимизация",
  },
  {
    title: "Настройки",
    href: "/admin/settings",
    icon: Settings,
    description: "Параметры магазина",
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-72 bg-card border-r min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <Link
          href="/"
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl gradient-animate flex items-center justify-center">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Digital Store</h1>
            <p className="text-xs text-muted-foreground">Админ-панель</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
          const isExactDashboard = item.href === "/admin" && pathname === "/admin"
          const active = isActive || isExactDashboard

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative",
                active
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                active
                  ? "bg-white/20"
                  : "bg-secondary group-hover:bg-primary/10"
              )}>
                <item.icon className={cn(
                  "h-4 w-4",
                  active ? "" : "group-hover:text-primary"
                )} />
              </div>
              <div className="flex-1">
                <span className="block">{item.title}</span>
                <span className={cn(
                  "text-xs",
                  active ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {item.description}
                </span>
              </div>
              {active && (
                <ChevronRight className="h-4 w-4 opacity-70" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            В магазин
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}
