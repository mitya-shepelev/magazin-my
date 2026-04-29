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

const createMessageSchema = z.object({
  content: z.string().min(1, "Сообщение не может быть пустым"),
  files: z.string().nullish(), // JSON array файлов (nullable + optional)
})

// GET /api/orders/[id]/messages - получить сообщения заказа
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const isAdmin = session.user.role === "ADMIN"

    // Проверяем доступ к заказу
    const order = await db.order.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const messages = await db.orderMessage.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/orders/[id]/messages - отправить сообщение
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const isAdmin = session.user.role === "ADMIN"
    const rateLimit = await checkRateLimit({
      key: rateLimitKey(
        "order-message",
        session.user.id,
        id,
        getClientIp(request)
      ),
      limit: 30,
      windowSeconds: 60,
    })

    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit, "Too many messages")
    }

    const body = await request.json()
    const validation = createMessageSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Проверяем доступ к заказу
    const order = await db.order.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        installationStatus: true,
        supportEndsAt: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Проверяем можно ли писать (заказ оплачен и поддержка активна)
    if (!isAdmin) {
      if (order.status !== "PAID") {
        return NextResponse.json(
          { error: "Чат доступен только для оплаченных заказов" },
          { status: 400 }
        )
      }

      // Проверяем срок поддержки (если установка завершена)
      if (
        order.installationStatus === "COMPLETED" &&
        order.supportEndsAt &&
        new Date(order.supportEndsAt) < new Date()
      ) {
        return NextResponse.json(
          { error: "Срок поддержки истёк" },
          { status: 400 }
        )
      }
    }

    const message = await db.orderMessage.create({
      data: {
        orderId: id,
        userId: session.user.id,
        content: validation.data.content,
        files: validation.data.files || null,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
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
    console.error("Error creating message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
