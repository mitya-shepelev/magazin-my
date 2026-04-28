import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await request.json()

    await db.user.update({
      where: { id: session.user.id },
      data: { name },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Ошибка при обновлении профиля" },
      { status: 500 }
    )
  }
}
