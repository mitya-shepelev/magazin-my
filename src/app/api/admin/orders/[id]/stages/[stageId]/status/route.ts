import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
})

// POST /api/admin/orders/[id]/stages/[stageId]/status - изменить статус этапа
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params
    const body = await request.json()

    const validation = updateStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const existingStage = await db.installationStage.findFirst({
      where: { id: stageId, orderId: id },
    })

    if (!existingStage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    const newStatus = validation.data.status
    const updateData: any = { status: newStatus }

    // Если статус меняется на COMPLETED, записываем кто и когда завершил
    if (newStatus === "COMPLETED") {
      updateData.completedAt = new Date()
      updateData.completedBy = session.user.id
    } else if (newStatus === "PENDING" || newStatus === "IN_PROGRESS") {
      // Сбрасываем данные о завершении если откатываем статус
      updateData.completedAt = null
      updateData.completedBy = null
    }

    const stage = await db.installationStage.update({
      where: { id: stageId },
      data: updateData,
    })

    // Обновляем статус установки заказа
    await updateOrderInstallationStatus(id)

    return NextResponse.json(stage)
  } catch (error) {
    console.error("Error updating stage status:", error)
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
