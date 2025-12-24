import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createStageSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().min(1, "Описание обязательно"),
  type: z.enum(["CLIENT_ACTION", "ADMIN_WORK", "CONFIRMATION"]),
  sortOrder: z.number().optional(),
})

// GET /api/admin/orders/[id]/stages - получить все этапы заказа
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

    const order = await db.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        stages: {
          orderBy: { sortOrder: "asc" },
          include: {
            comments: {
              orderBy: { createdAt: "asc" },
              include: { user: { select: { id: true, name: true, role: true } } },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order stages:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/orders/[id]/stages - создать новый этап
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
    const body = await request.json()

    const validation = createStageSchema.safeParse(body)
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

    // Определяем sortOrder если не указан
    let sortOrder = validation.data.sortOrder
    if (sortOrder === undefined) {
      const lastStage = await db.installationStage.findFirst({
        where: { orderId: id },
        orderBy: { sortOrder: "desc" },
      })
      sortOrder = (lastStage?.sortOrder ?? 0) + 1
    }

    const stage = await db.installationStage.create({
      data: {
        orderId: id,
        title: validation.data.title,
        description: validation.data.description,
        type: validation.data.type,
        sortOrder,
        status: "PENDING",
      },
    })

    return NextResponse.json(stage, { status: 201 })
  } catch (error) {
    console.error("Error creating stage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
