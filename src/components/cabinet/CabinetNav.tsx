"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Package, Download, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotificationContext } from "@/providers/NotificationProvider"

const menuItems = [
  { title: "Обзор", href: "/cabinet", icon: User },
  { title: "Мои заказы", href: "/cabinet/orders", icon: Package, showBadge: true },
  { title: "Загрузки", href: "/cabinet/downloads", icon: Download },
  { title: "Профиль", href: "/cabinet/profile", icon: Settings },
]

export function CabinetNav() {
  const pathname = usePathname()
  const { unreadCount } = useNotificationContext()

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 z-40">
      <div className="container">
        <nav className="flex items-center gap-1 overflow-x-auto py-2 -mx-2 px-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/cabinet" && pathname.startsWith(item.href))
            const showBadge = "showBadge" in item && item.showBadge

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap relative",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
                {showBadge && unreadCount > 0 && (
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
