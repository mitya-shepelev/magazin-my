import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/password"

// Валидация пароля: минимум 8 символов, заглавная, строчная буква и цифра
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    // Валидация нового пароля
    if (!newPassword || !PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 8 символов, включая заглавную букву, строчную букву и цифру" },
        { status: 400 }
      )
    }

    // Get user with password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: "Неверный текущий пароль" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update password
    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Ошибка при смене пароля" },
      { status: 500 }
    )
  }
}
