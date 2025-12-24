import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { readFile } from "fs/promises"
import path from "path"

interface DownloadParams {
  params: Promise<{ key: string }>
}

export async function GET(request: NextRequest, { params }: DownloadParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { key } = await params

    // Find order item by download key
    const orderItem = await db.orderItem.findUnique({
      where: { downloadKey: key },
      include: {
        order: true,
        product: true,
      },
    })

    if (!orderItem) {
      return NextResponse.json(
        { error: "Ссылка для скачивания не найдена" },
        { status: 404 }
      )
    }

    // Verify the order belongs to the user
    if (orderItem.order.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Доступ запрещён" },
        { status: 403 }
      )
    }

    // Verify the order is paid
    if (orderItem.order.status !== "PAID") {
      return NextResponse.json(
        { error: "Заказ не оплачен" },
        { status: 403 }
      )
    }

    // Get file path
    const filePath = path.join(process.cwd(), orderItem.product.downloadFile)

    try {
      const fileBuffer = await readFile(filePath)

      // Update download count
      await db.orderItem.update({
        where: { id: orderItem.id },
        data: {
          downloadCount: { increment: 1 },
        },
      })

      // Get filename from path
      const fileName = path.basename(orderItem.product.downloadFile)

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      })
    } catch (error) {
      console.error("File read error:", error)
      return NextResponse.json(
        { error: "Файл не найден" },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json(
      { error: "Ошибка при скачивании" },
      { status: 500 }
    )
  }
}
