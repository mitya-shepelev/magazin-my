import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { realtime } from "@/lib/realtime"

const readMessagesSchema = z.object({
  messageIds: z.array(z.string()).min(1),
})

// POST /api/orders/[id]/messages/read - отметить сообщения как прочитанные
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await request.json()

    const validation = readMessagesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const isAdmin = session.user.role === "ADMIN"

    // Проверяем доступ к заказу
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Обновляем только сообщения, которые НЕ принадлежат текущему пользователю
    // (нельзя прочитать свои собственные сообщения)
    const now = new Date()
    const updated = await db.orderMessage.updateMany({
      where: {
        id: { in: validation.data.messageIds },
        orderId: orderId,
        userId: { not: session.user.id }, // Только чужие сообщения
        status: { not: "READ" }, // Только не прочитанные
      },
      data: {
        status: "READ",
        isRead: true, // backward compatibility
        readAt: now,
      },
    })

    // Публикуем событие прочтения
    await realtime.publishRead(orderId, validation.data.messageIds, session.user.id)

    return NextResponse.json({
      success: true,
      updated: updated.count,
    })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
