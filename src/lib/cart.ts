"use client"

export interface CartItem {
  id: string
  name: string
  slug: string
  price: number
  image: string | null
}

const CART_KEY = "digital-store-cart"

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return []
  const cart = localStorage.getItem(CART_KEY)
  return cart ? JSON.parse(cart) : []
}

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart()
  const exists = cart.find((i) => i.id === item.id)

  if (!exists) {
    cart.push(item)
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }

  // Dispatch event for cart updates
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }))

  return cart
}

export function removeFromCart(id: string): CartItem[] {
  const cart = getCart().filter((item) => item.id !== id)
  localStorage.setItem(CART_KEY, JSON.stringify(cart))

  window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }))

  return cart
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY)
  window.dispatchEvent(new CustomEvent("cart-updated", { detail: [] }))
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price, 0)
}
