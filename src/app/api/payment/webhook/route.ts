import { NextRequest, NextResponse } from "next/server"
import { createHash, createHmac, timingSafeEqual } from "crypto"
import { markOrderCancelled, markOrderPaid } from "@/lib/order-payment"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import {
  checkRateLimit,
  getClientIp,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/rate-limit"

interface RollyPayWebhookEvent {
  id?: string
  event_id?: string
  event_type?: string
  payment_id?: string
  order_id?: string
  status?: string
  amount?: string
  currency?: string
}

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000
const WEBHOOK_PROVIDER = "rollypay"

type StoredWebhookEvent = {
  id: string
}

function isPrismaUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  )
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function normalizeWebhookEventName(body: RollyPayWebhookEvent) {
  const eventType = optionalString(body.event_type)?.toLowerCase()
  if (eventType) {
    return eventType
  }

  const status = optionalString(body.status)?.toLowerCase()
  return status ? `payment.${status}` : "unknown"
}

function buildWebhookEventKey(body: RollyPayWebhookEvent, rawBody: string) {
  const providerEventId = optionalString(body.event_id) || optionalString(body.id)

  if (providerEventId) {
    return `${WEBHOOK_PROVIDER}:event:${providerEventId}`
  }

  const eventName = normalizeWebhookEventName(body)
  const status = optionalString(body.status)?.toLowerCase() || "unknown"
  const orderId = optionalString(body.order_id)
  const paymentId = optionalString(body.payment_id)
  const material = orderId || paymentId
    ? [eventName, status, orderId || "unknown-order", paymentId || "unknown-payment"]
    : [eventName, status, hash(rawBody)]

  return `${WEBHOOK_PROVIDER}:${hash(material.join(":")).slice(0, 48)}`
}

async function registerWebhookEvent(
  body: RollyPayWebhookEvent,
  rawBody: string
) {
  const eventKey = buildWebhookEventKey(body, rawBody)
  const payloadHash = hash(rawBody)

  try {
    const event = await db.paymentWebhookEvent.create({
      data: {
        provider: WEBHOOK_PROVIDER,
        eventKey,
        eventType: optionalString(body.event_type),
        status: optionalString(body.status),
        orderId: optionalString(body.order_id),
        paymentId: optionalString(body.payment_id),
        payloadHash,
      },
    })

    return { event, duplicate: false }
  } catch (error) {
    if (!isPrismaUniqueError(error)) {
      throw error
    }

    const existingEvent = await db.paymentWebhookEvent.findUnique({
      where: { eventKey },
    })

    if (existingEvent?.processingStatus === "FAILED") {
      const event = await db.paymentWebhookEvent.update({
        where: { eventKey },
        data: {
          processingStatus: "RECEIVED",
          error: null,
          processedAt: null,
          payloadHash,
        },
      })

      return { event, duplicate: false }
    }

    return { event: existingEvent, duplicate: true }
  }
}

async function updateWebhookEventStatus(
  event: StoredWebhookEvent,
  processingStatus: "PROCESSED" | "IGNORED" | "FAILED",
  error?: string
) {
  await db.paymentWebhookEvent.update({
    where: { id: event.id },
    data: {
      processingStatus,
      error: error || null,
      processedAt: new Date(),
    },
  })
}

function verifyRollyPaySignature(
  body: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const signingSecret =
    process.env.ROLLYPAY_WEBHOOK_SECRET?.trim() || env.ROLLYPAY_WEBHOOK_SECRET

  if (!signingSecret) {
    return process.env.NODE_ENV !== "production"
  }

  if (!timestamp || !signature) {
    return false
  }

  const timestampMs = Number.parseInt(timestamp, 10) * 1000
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > WEBHOOK_TIMESTAMP_TOLERANCE_MS
  ) {
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
    const rateLimit = await checkRateLimit({
      key: rateLimitKey("payment-webhook", getClientIp(request)),
      limit: 120,
      windowSeconds: 60,
    })

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit, "Too many webhook requests")
    }

    const rawBody = await request.text()
    const signature = request.headers.get("x-signature")
    const timestamp = request.headers.get("x-timestamp")

    if (!verifyRollyPaySignature(rawBody, timestamp, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    let body: RollyPayWebhookEvent
    try {
      body = JSON.parse(rawBody) as RollyPayWebhookEvent
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    if (process.env.NODE_ENV === "development") {
      console.log("RollyPay webhook received:", body.event_type, body.payment_id)
    }

    const registration = await registerWebhookEvent(body, rawBody)

    if (registration.duplicate) {
      return NextResponse.json({ success: true, duplicate: true })
    }

    if (!registration.event) {
      return NextResponse.json({ success: true, duplicate: true })
    }

    try {
      const orderId = optionalString(body.order_id)
      const paymentId = optionalString(body.payment_id)
      const eventName = normalizeWebhookEventName(body)
      const status = optionalString(body.status)?.toLowerCase()
      const isPaid = eventName === "payment.paid" || status === "paid"
      const isCanceled =
        eventName === "payment.canceled" ||
        eventName === "payment.cancelled" ||
        status === "canceled" ||
        status === "cancelled"

      if (!orderId) {
        await updateWebhookEventStatus(registration.event, "IGNORED")
        return NextResponse.json({ success: true, ignored: true })
      }

      if (isPaid) {
        await markOrderPaid({
          orderId,
          paymentId,
          paymentMethod: "rollypay",
        })
        await updateWebhookEventStatus(registration.event, "PROCESSED")
        return NextResponse.json({ success: true })
      }

      if (isCanceled) {
        await markOrderCancelled(orderId)
        await updateWebhookEventStatus(registration.event, "PROCESSED")
        return NextResponse.json({ success: true })
      }

      await updateWebhookEventStatus(registration.event, "IGNORED")
      return NextResponse.json({ success: true, ignored: true })
    } catch (error) {
      await updateWebhookEventStatus(
        registration.event,
        "FAILED",
        error instanceof Error ? error.message : "Unknown webhook processing error"
      )
      throw error
    }
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
