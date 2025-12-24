import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/orders/[id] - получить заказ с этапами и сообщениями (для клиента)
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

    const order = await db.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                supportDays: true,
              },
            },
          },
        },
        stages: {
          orderBy: { sortOrder: "asc" },
          include: {
            comments: {
              orderBy: { createdAt: "asc" },
              include: {
                user: { select: { id: true, name: true, role: true } },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Проверяем доступ: админ видит все, клиент - только свои
    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Помечаем сообщения как прочитанные для текущего пользователя
    // (сообщения от других пользователей)
    await db.orderMessage.updateMany({
      where: {
        orderId: id,
        userId: { not: session.user.id },
        isRead: false,
      },
      data: { isRead: true },
    })

    // Вычисляем прогресс
    const totalStages = order.stages.length
    const completedStages = order.stages.filter(
      (s) => s.status === "COMPLETED"
    ).length
    const currentStage = order.stages.find(
      (s) => s.status === "IN_PROGRESS" || s.status === "PENDING"
    )

    // Проверяем активна ли поддержка
    const supportActive =
      order.supportEndsAt && new Date(order.supportEndsAt) > new Date()

    return NextResponse.json({
      ...order,
      progress: {
        total: totalStages,
        completed: completedStages,
        percentage: totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0,
        currentStageId: currentStage?.id || null,
      },
      supportActive,
    })
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
