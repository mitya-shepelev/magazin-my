import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/shared/Header"
import { Footer } from "@/components/shared/Footer"
import { User, Package, Download, Settings } from "lucide-react"

const menuItems = [
  { title: "Обзор", href: "/cabinet", icon: User },
  { title: "Мои заказы", href: "/cabinet/orders", icon: Package },
  { title: "Загрузки", href: "/cabinet/downloads", icon: Download },
  { title: "Профиль", href: "/cabinet/profile", icon: Settings },
]

export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="w-full md:w-64 shrink-0">
              <div className="sticky top-20">
                <h2 className="text-lg font-semibold mb-4">Личный кабинет</h2>
                <nav className="space-y-1">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-muted"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="flex-1">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
