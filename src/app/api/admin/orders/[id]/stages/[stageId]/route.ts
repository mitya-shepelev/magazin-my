import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateStageSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  type: z.enum(["CLIENT_ACTION", "ADMIN_WORK", "CONFIRMATION"]).optional(),
  sortOrder: z.number().optional(),
})

// GET /api/admin/orders/[id]/stages/[stageId] - получить этап
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params

    const stage = await db.installationStage.findFirst({
      where: { id: stageId, orderId: id },
      include: {
        comments: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    })

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    return NextResponse.json(stage)
  } catch (error) {
    console.error("Error fetching stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/admin/orders/[id]/stages/[stageId] - обновить этап
export async function PUT(
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

    const validation = updateStageSchema.safeParse(body)
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

    const stage = await db.installationStage.update({
      where: { id: stageId },
      data: validation.data,
    })

    return NextResponse.json(stage)
  } catch (error) {
    console.error("Error updating stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/orders/[id]/stages/[stageId] - удалить этап
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, stageId } = await params

    const existingStage = await db.installationStage.findFirst({
      where: { id: stageId, orderId: id },
    })

    if (!existingStage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    await db.installationStage.delete({ where: { id: stageId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
