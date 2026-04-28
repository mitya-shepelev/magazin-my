"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getCart, removeFromCart, clearCart, getCartTotal, CartItem } from "@/lib/cart"
import { Trash2, ShoppingBag, ArrowRight, Loader2, Globe } from "lucide-react"
import { toast } from "sonner"

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const initialSync = window.setTimeout(() => {
      setCart(getCart())
    }, 0)

    const handleCartUpdate = (e: CustomEvent<CartItem[]>) => {
      setCart(e.detail)
    }

    window.addEventListener("cart-updated", handleCartUpdate as EventListener)
    return () => {
      window.clearTimeout(initialSync)
      window.removeEventListener("cart-updated", handleCartUpdate as EventListener)
    }
  }, [])

  function handleRemove(id: string) {
    removeFromCart(id)
    toast.info("Товар удалён из корзины")
  }

  async function handleCheckout() {
    setIsLoading(true)

    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        setIsLoading(false)
        return
      }

      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
      }
    } catch {
      toast.error("Ошибка при создании платежа")
      setIsLoading(false)
    }
  }

  const total = getCartTotal(cart)

  if (cart.length === 0) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Корзина пуста</h1>
          <p className="text-muted-foreground mb-6">
            Добавьте товары из каталога, чтобы оформить заказ
          </p>
          <Link href="/catalog">
            <Button>Перейти в каталог</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Корзина</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 bg-muted rounded-lg overflow-hidden shrink-0 relative">
                    {item.image &&
                    !failedImages[item.id] &&
                    !(item.image.startsWith("/images/products/") && item.image.endsWith(".jpg")) ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="w-full h-full object-cover"
                        onError={() => {
                          setFailedImages((prev) => ({ ...prev, [item.id]: true }))
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Globe className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.slug}`}
                      className="font-medium hover:underline line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <p className="text-lg font-bold mt-1">
                      {item.price.toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive shrink-0"
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => {
              clearCart()
              toast.info("Корзина очищена")
            }}
          >
            Очистить корзину
          </Button>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Итого</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Товаров:</span>
                <span>{cart.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>К оплате:</span>
                <span>{total.toLocaleString("ru-RU")} ₽</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание платежа...
                  </>
                ) : (
                  <>
                    Оформить заказ
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <p className="text-sm text-muted-foreground text-center mt-4">
            После оплаты мы создадим лицензию и откроем заказ на установку
          </p>
        </div>
      </div>
    </div>
  )
}
