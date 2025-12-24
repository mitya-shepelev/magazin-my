import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createPayment } from "@/lib/yookassa"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Для оформления заказа необходимо войти в аккаунт" },
        { status: 401 }
      )
    }

    const { items } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Корзина пуста" },
        { status: 400 }
      )
    }

    // Verify products exist and get current prices
    const productIds = items.map((item: { id: string }) => item.id)
    const products = await db.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    })

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: "Некоторые товары недоступны" },
        { status: 400 }
      )
    }

    // Calculate total with current prices
    const total = products.reduce((sum, product) => sum + product.price, 0)

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    // Create order
    const order = await db.order.create({
      data: {
        orderNumber,
        userId: session.user.id,
        total,
        customerEmail: session.user.email!,
        customerName: session.user.name,
        items: {
          create: products.map((product) => ({
            productId: product.id,
            productName: product.name,
            price: product.price,
          })),
        },
      },
    })

    // Create payment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const returnUrl = `${appUrl}/cabinet/orders/${order.id}?payment=success`

    const payment = await createPayment({
      amount: total,
      description: `Заказ ${orderNumber}`,
      orderId: order.id,
      returnUrl,
      customerEmail: session.user.email!,
    })

    // Update order with payment ID
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentId: payment.id,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      confirmationUrl: payment.confirmation?.confirmation_url,
    })
  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json(
      { error: "Ошибка при создании платежа" },
      { status: 500 }
    )
  }
}
