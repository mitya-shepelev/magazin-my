import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const updateProductSchema = z.object({
  supportDays: z.number().min(0).optional(),
})

// PUT /api/admin/products/[id] - обновить товар (частично)
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

    const validation = updateProductSchema.safeParse(body)
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

    const updated = await db.product.update({
      where: { id },
      data: validation.data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
