import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { randomUUID } from "crypto"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES = 5
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
]

// POST /api/orders/[id]/upload - загрузить файл
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const isAdmin = session.user.role === "ADMIN"

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

    // Проверяем можно ли загружать файлы
    if (!isAdmin) {
      if (order.status !== "PAID") {
        return NextResponse.json(
          { error: "Загрузка файлов доступна только для оплаченных заказов" },
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

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Максимум ${MAX_FILES} файлов за раз` },
        { status: 400 }
      )
    }

    // Проверяем файлы
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Файл ${file.name} превышает лимит 10 MB` },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Тип файла ${file.name} не поддерживается` },
          { status: 400 }
        )
      }
    }

    // Создаём директорию для файлов заказа
    const uploadDir = path.join(process.cwd(), "uploads", "messages", id)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedFiles = []

    for (const file of files) {
      const fileId = randomUUID()
      const ext = path.extname(file.name)
      const fileName = `${fileId}${ext}`
      const filePath = path.join(uploadDir, fileName)

      // Сохраняем файл
      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      uploadedFiles.push({
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        path: `/api/files/${fileId}`,
      })
    }

    return NextResponse.json({ files: uploadedFiles }, { status: 201 })
  } catch (error) {
    console.error("Error uploading files:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
