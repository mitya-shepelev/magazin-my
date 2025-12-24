"use server"

import { signIn, signOut } from "@/lib/auth"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/password"
import { redirect } from "next/navigation"

// Валидация email
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Валидация пароля: минимум 8 символов, заглавная, строчная буква и цифра
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const name = formData.get("name") as string

  if (!email || !password) {
    return { error: "Email и пароль обязательны" }
  }

  // Валидация email
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Некорректный формат email" }
  }

  // Валидация пароля
  if (!PASSWORD_REGEX.test(password)) {
    return {
      error: "Пароль должен содержать минимум 8 символов, включая заглавную букву, строчную букву и цифру"
    }
  }

  const existingUser = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  })

  if (existingUser) {
    return { error: "Пользователь с таким email уже существует" }
  }

  const hashedPassword = await hashPassword(password)

  await db.user.create({
    data: {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name?.trim() || null,
      role: "CUSTOMER"
    }
  })

  redirect("/login?registered=true")
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/"
    })
  } catch (error) {
    if ((error as Error).message.includes("NEXT_REDIRECT")) {
      throw error
    }
    return { error: "Неверный email или пароль" }
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}
