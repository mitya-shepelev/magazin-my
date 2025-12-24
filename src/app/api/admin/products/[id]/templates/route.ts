import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createTemplateSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().min(1, "Описание обязательно"),
  type: z.enum(["CLIENT_ACTION", "ADMIN_WORK", "CONFIRMATION"]),
  sortOrder: z.number().optional(),
})

// GET /api/admin/products/[id]/templates - получить все шаблоны этапов товара
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

    const product = await db.product.findUnique({
      where: { id },
      include: {
        stageTemplates: {
          orderBy: { sortOrder: "asc" },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        supportDays: product.supportDays,
      },
      templates: product.stageTemplates,
    })
  } catch (error) {
    console.error("Error fetching templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/products/[id]/templates - создать новый шаблон этапа
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

    const validation = createTemplateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const product = await db.product.findUnique({ where: { id } })
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Определяем sortOrder если не указан
    let sortOrder = validation.data.sortOrder
    if (sortOrder === undefined) {
      const lastTemplate = await db.stageTemplate.findFirst({
        where: { productId: id },
        orderBy: { sortOrder: "desc" },
      })
      sortOrder = (lastTemplate?.sortOrder ?? 0) + 1
    }

    const template = await db.stageTemplate.create({
      data: {
        productId: id,
        title: validation.data.title,
        description: validation.data.description,
        type: validation.data.type,
        sortOrder,
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error("Error creating template:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
