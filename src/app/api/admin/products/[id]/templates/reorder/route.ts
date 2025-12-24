import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const reorderSchema = z.object({
  templateIds: z.array(z.string()).min(1, "Нужен хотя бы один шаблон"),
})

// PUT /api/admin/products/[id]/templates/reorder - изменить порядок шаблонов
export async function PUT(
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

    const validation = reorderSchema.safeParse(body)
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

    // Обновляем sortOrder для каждого шаблона
    const updates = validation.data.templateIds.map((templateId, index) =>
      db.stageTemplate.updateMany({
        where: { id: templateId, productId: id },
        data: { sortOrder: index + 1 },
      })
    )

    await db.$transaction(updates)

    // Возвращаем обновлённый список
    const templates = await db.stageTemplate.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Error reordering templates:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
