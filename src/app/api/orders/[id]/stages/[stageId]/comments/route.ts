import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createCommentSchema = z.object({
  content: z.string().min(1, "Комментарий не может быть пустым"),
  files: z.string().optional(),
})

// GET /api/orders/[id]/stages/[stageId]/comments - получить комментарии к этапу
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params
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

    // Проверяем существует ли этап
    const stage = await db.installationStage.findFirst({
      where: { id: stageId, orderId: id },
    })

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    const comments = await db.stageComment.findMany({
      where: { stageId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/orders/[id]/stages/[stageId]/comments - добавить комментарий
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
    const body = await request.json()
    const isAdmin = session.user.role === "ADMIN"

    const validation = createCommentSchema.safeParse(body)
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

    // Проверяем существует ли этап
    const stage = await db.installationStage.findFirst({
      where: { id: stageId, orderId: id },
    })

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    // Проверяем можно ли комментировать
    if (!isAdmin) {
      if (order.status !== "PAID") {
        return NextResponse.json(
          { error: "Комментарии доступны только для оплаченных заказов" },
          { status: 400 }
        )
      }

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

    const comment = await db.stageComment.create({
      data: {
        stageId,
        userId: session.user.id,
        content: validation.data.content,
        files: validation.data.files || null,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error creating comment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
