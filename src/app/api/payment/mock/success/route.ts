import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getPaymentProvider } from "@/lib/payments"
import { markOrderPaid } from "@/lib/order-payment"

export async function GET(request: NextRequest) {
  if (getPaymentProvider() !== "mock") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orderId = request.nextUrl.searchParams.get("orderId")

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 })
  }

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      userId: session.user.id,
    },
    select: {
      id: true,
      paymentId: true,
    },
  })

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  await markOrderPaid({
    orderId,
    paymentId: order.paymentId || `mock_${orderId}`,
    paymentMethod: "mock",
  })

  return NextResponse.redirect(
    new URL(`/cabinet/orders/${orderId}?payment=success`, request.url)
  )
}
