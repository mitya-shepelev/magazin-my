import Link from "next/link"
import { Package } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <Package className="h-6 w-6" />
              <span className="text-xl font-bold">Digital Store</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Магазин качественных веб-приложений и мобильных приложений.
            </p>
          </div>

          {/* Catalog */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Каталог</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/catalog"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Все товары
                </Link>
              </li>
              <li>
                <Link
                  href="/category/web-apps"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Веб-приложения
                </Link>
              </li>
              <li>
                <Link
                  href="/category/mobile-apps"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Мобильные приложения
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Аккаунт</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/cabinet"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Личный кабинет
                </Link>
              </li>
              <li>
                <Link
                  href="/cabinet/orders"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Мои заказы
                </Link>
              </li>
              <li>
                <Link
                  href="/cabinet/downloads"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Загрузки
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Информация</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  О нас
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Контакты
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Digital Store. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  )
}
