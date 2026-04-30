"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { addToCart, getCart, removeFromCart, CartItem } from "@/lib/cart"
import { ShoppingCart, Check } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  slug: string
  price: number
  images: string
}

interface AddToCartButtonProps {
  product: Product
  className?: string
  size?: "default" | "sm" | "lg"
  showPrice?: boolean
}

export function AddToCartButton({ product, className, size = "default", showPrice = false }: AddToCartButtonProps) {
  const [isInCart, setIsInCart] = useState(false)

  useEffect(() => {
    const initialSync = window.setTimeout(() => {
      const cart = getCart()
      setIsInCart(cart.some((item) => item.id === product.id))
    }, 0)

    // Listen for cart updates
    const handleCartUpdate = (e: CustomEvent<CartItem[]>) => {
      setIsInCart(e.detail.some((item) => item.id === product.id))
    }

    window.addEventListener("cart-updated", handleCartUpdate as EventListener)
    return () => {
      window.clearTimeout(initialSync)
      window.removeEventListener("cart-updated", handleCartUpdate as EventListener)
    }
  }, [product.id])

  function handleClick() {
    if (isInCart) {
      removeFromCart(product.id)
      toast.info("Товар удалён из корзины")
    } else {
      const images = JSON.parse(product.images || "[]")
      addToCart({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: images[0] || null,
      })
      toast.success("Товар добавлен в корзину")
    }
  }

  const priceText = showPrice ? ` — ${product.price.toLocaleString("ru-RU")} ₽` : ""

  return (
    <Button
      onClick={handleClick}
      className={className}
      variant={isInCart ? "secondary" : "default"}
      size={size}
    >
      {isInCart ? (
        <>
          <Check className="h-4 w-4 mr-2" />
          В корзине
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 mr-2" />
          В корзину{priceText}
        </>
      )}
    </Button>
  )
}
