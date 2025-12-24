import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { invalidate } from "@/lib/cache"
import { CACHE_KEYS } from "@/lib/cache-keys"

const commentSchema = z.object({
  content: z.string().min(1),
  files: z.string().nullable().optional(),
})

// GET /api/admin/orders/[id]/stages/[stageId]/comments - получить комментарии этапа
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { stageId } = await params

    const comments = await db.stageComment.findMany({
      where: { stageId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, role: true },
        },
      },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error("Error fetching comments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/orders/[id]/stages/[stageId]/comments - добавить комментарий
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

    const validation = commentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    // Verify stage belongs to order
    const stage = await db.installationStage.findFirst({
      where: { id: stageId, orderId: id },
    })
    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    const comment = await db.stageComment.create({
      data: {
        stageId,
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
    await invalidate(CACHE_KEYS.ORDER_STAGES(id))

    // TODO: Send notification to client

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error("Error adding comment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
