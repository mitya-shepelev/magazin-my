import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { readFile, readdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

// GET /api/files/[fileId] - скачать файл
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileId } = await params
    const isAdmin = session.user.role === "ADMIN"

    // Ищем файл в директории uploads/messages
    const uploadsDir = path.join(process.cwd(), "uploads", "messages")

    if (!existsSync(uploadsDir)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Проходим по директориям заказов
    const orderDirs = await readdir(uploadsDir)
    let foundFilePath: string | null = null
    let foundOrderId: string | null = null

    for (const orderDir of orderDirs) {
      const orderPath = path.join(uploadsDir, orderDir)
      const files = await readdir(orderPath).catch(() => [])

      for (const file of files) {
        if (file.startsWith(fileId)) {
          foundFilePath = path.join(orderPath, file)
          foundOrderId = orderDir
          break
        }
      }

      if (foundFilePath) break
    }

    if (!foundFilePath || !foundOrderId) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Проверяем доступ к заказу
    const order = await db.order.findUnique({
      where: { id: foundOrderId },
      select: { id: true, userId: true },
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Читаем и возвращаем файл
    const fileBuffer = await readFile(foundFilePath)
    const fileName = path.basename(foundFilePath)
    const ext = path.extname(fileName).toLowerCase()

    // Определяем MIME тип
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
      ".7z": "application/x-7z-compressed",
    }

    const contentType = mimeTypes[ext] || "application/octet-stream"

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
