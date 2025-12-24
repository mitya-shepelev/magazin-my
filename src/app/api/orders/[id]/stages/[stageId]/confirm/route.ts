import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/orders/[id]/stages/[stageId]/confirm - клиент подтверждает этап
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params

    // Проверяем доступ к заказу
    const order = await db.order.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    // Только владелец заказа может подтверждать
    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Заказ не оплачен" },
        { status: 400 }
      )
    }

    // Проверяем этап
    const stage = await db.installationStage.findFirst({
      where: { id: stageId, orderId: id },
    })

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    // Только этапы типа CONFIRMATION можно подтверждать
    if (stage.type !== "CONFIRMATION") {
      return NextResponse.json(
        { error: "Этот этап не требует подтверждения" },
        { status: 400 }
      )
    }

    // Этап должен быть IN_PROGRESS для подтверждения
    if (stage.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Этап не активен для подтверждения" },
        { status: 400 }
      )
    }

    // Обновляем статус этапа
    const updatedStage = await db.installationStage.update({
      where: { id: stageId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: session.user.id,
      },
    })

    // Обновляем статус установки заказа
    await updateOrderInstallationStatus(id)

    // TODO: Отправить email-уведомление админу

    return NextResponse.json(updatedStage)
  } catch (error) {
    console.error("Error confirming stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Вспомогательная функция для обновления статуса установки заказа
async function updateOrderInstallationStatus(orderId: string) {
  const stages = await db.installationStage.findMany({
    where: { orderId },
    orderBy: { sortOrder: "asc" },
  })

  if (stages.length === 0) return

  const allCompleted = stages.every((s) => s.status === "COMPLETED")
  const anyInProgress = stages.some((s) => s.status === "IN_PROGRESS")
  const anyCompleted = stages.some((s) => s.status === "COMPLETED")

  let installationStatus = "NOT_STARTED"
  let supportEndsAt = null

  if (allCompleted) {
    installationStatus = "COMPLETED"

    // Получаем максимальный срок поддержки из товаров заказа
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { supportDays: true } },
          },
        },
      },
    })

    if (order) {
      const maxSupportDays = Math.max(
        ...order.items.map((item) => item.product.supportDays)
      )
      supportEndsAt = new Date()
      supportEndsAt.setDate(supportEndsAt.getDate() + maxSupportDays)
    }
  } else if (anyInProgress || anyCompleted) {
    installationStatus = "IN_PROGRESS"
  }

  await db.order.update({
    where: { id: orderId },
    data: { installationStatus, supportEndsAt },
  })
}
