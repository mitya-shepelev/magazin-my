import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { invalidate } from "@/lib/cache"
import { CACHE_KEYS } from "@/lib/cache-keys"
import { realtime } from "@/lib/realtime"
import {
  checkRateLimit,
  getClientIp,
  rateLimitKey,
  rateLimitResponse,
} from "@/lib/rate-limit"

const messageSchema = z.object({
  content: z.string().min(1),
  files: z.string().nullable().optional(),
})

// GET /api/admin/orders/[id]/messages - получить сообщения заказа
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const messages = await db.orderMessage.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/orders/[id]/messages - отправить сообщение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const rateLimit = await checkRateLimit({
      key: rateLimitKey(
        "admin-order-message",
        session.user.id,
        id,
        getClientIp(request)
      ),
      limit: 60,
      windowSeconds: 60,
    })

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit, "Too many admin messages")
    }

    const body = await request.json()
    const validation = messageSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const order = await db.order.findUnique({ where: { id } })
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    const message = await db.orderMessage.create({
      data: {
        orderId: id,
        userId: session.user.id,
        content: validation.data.content,
        files: validation.data.files || null,
      },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    // Инвалидация Redis кеша
    await invalidate(CACHE_KEYS.ORDER_MESSAGES(id))

    // Real-time: publish new message event
    await realtime.publishMessage(id, {
      id: message.id,
      orderId: id,
      userId: message.userId,
      content: message.content,
      files: message.files ? JSON.parse(message.files as string) : [],
      isRead: message.isRead,
      status: message.status,
      deliveredAt: message.deliveredAt?.toISOString() || null,
      readAt: message.readAt?.toISOString() || null,
      createdAt: message.createdAt.toISOString(),
      user: message.user,
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
