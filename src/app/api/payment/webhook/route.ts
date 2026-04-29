import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { markOrderCancelled, markOrderPaid } from "@/lib/order-payment"
import { env } from "@/lib/env"

interface RollyPayWebhookEvent {
  event_type?: string
  payment_id?: string
  order_id?: string
  status?: string
  amount?: string
  currency?: string
}

function verifyRollyPaySignature(
  body: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const signingSecret = env.ROLLYPAY_WEBHOOK_SECRET

  if (!signingSecret) {
    return process.env.NODE_ENV !== "production"
  }

  if (!timestamp || !signature) {
    return false
  }

  const expected = createHmac("sha256", signingSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex")

  const expectedBuffer = Buffer.from(expected)
  const signatureBuffer = Buffer.from(signature)

  return (
    expectedBuffer.length === signatureBuffer.length &&
    timingSafeEqual(expectedBuffer, signatureBuffer)
  )
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-signature")
    const timestamp = request.headers.get("x-timestamp")

    if (!verifyRollyPaySignature(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const body = JSON.parse(rawBody) as RollyPayWebhookEvent

    if (process.env.NODE_ENV === "development") {
      console.log("RollyPay webhook received:", body.event_type, body.payment_id)
    }

    if (!body.order_id) {
      return NextResponse.json({ success: true })
    }

    if (body.event_type === "payment.paid" || body.status === "paid") {
      await markOrderPaid({
        orderId: body.order_id,
        paymentId: body.payment_id,
        paymentMethod: "rollypay",
      })
    }

    if (body.event_type === "payment.canceled" || body.status === "canceled") {
      await markOrderCancelled(body.order_id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
