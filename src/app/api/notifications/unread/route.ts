import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/notifications/unread - получить количество непрочитанных сообщений
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = session.user.role === "ADMIN"

    if (isAdmin) {
      // Для админа: все непрочитанные сообщения от клиентов
      const unreadCount = await db.orderMessage.count({
        where: {
          status: { not: "READ" },
          user: {
            role: "CUSTOMER",
          },
        },
      })

      // Также получаем количество по заказам для детализации
      const unreadByOrder = await db.orderMessage.groupBy({
        by: ["orderId"],
        where: {
          status: { not: "READ" },
          user: {
            role: "CUSTOMER",
          },
        },
        _count: true,
      })

      return NextResponse.json({
        total: unreadCount,
        byOrder: unreadByOrder.reduce((acc, item) => {
          acc[item.orderId] = item._count
          return acc
        }, {} as Record<string, number>),
      })
    } else {
      // Для клиента: непрочитанные сообщения от админов в его заказах
      const unreadCount = await db.orderMessage.count({
        where: {
          status: { not: "READ" },
          order: {
            userId: session.user.id,
          },
          user: {
            role: "ADMIN",
          },
        },
      })

      // Количество по заказам
      const unreadByOrder = await db.orderMessage.groupBy({
        by: ["orderId"],
        where: {
          status: { not: "READ" },
          order: {
            userId: session.user.id,
          },
          user: {
            role: "ADMIN",
          },
        },
        _count: true,
      })

      return NextResponse.json({
        total: unreadCount,
        byOrder: unreadByOrder.reduce((acc, item) => {
          acc[item.orderId] = item._count
          return acc
        }, {} as Record<string, number>),
      })
    }
  } catch (error) {
    console.error("Error fetching unread count:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
