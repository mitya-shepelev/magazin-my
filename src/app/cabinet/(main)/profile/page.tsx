"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const passwordFormRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    const newName = formData.get("name") as string

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      })

      if (response.ok) {
        // Update session with new name
        await update({ name: newName })
        toast.success("Профиль обновлён")
      } else {
        const data = await response.json()
        toast.error(data.error || "Ошибка при обновлении профиля")
      }
    } catch (error) {
      console.error("Profile update error:", error)
      toast.error("Ошибка при обновлении профиля")
    }

    setIsLoading(false)
  }

  async function handlePasswordChange(formData: FormData) {
    setIsLoading(true)

    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают")
      setIsLoading(false)
      return
    }

    // Валидация: минимум 8 символов, заглавная, строчная буква и цифра
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
    if (!passwordRegex.test(newPassword)) {
      toast.error("Пароль должен содержать минимум 8 символов, включая заглавную букву, строчную букву и цифру")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.get("currentPassword"),
          newPassword,
        }),
      })

      if (response.ok) {
        toast.success("Пароль изменён")
        passwordFormRef.current?.reset()
      } else {
        const data = await response.json()
        toast.error(data.error || "Ошибка при смене пароля")
      }
    } catch (error) {
      toast.error("Ошибка при смене пароля")
    }

    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Профиль</h1>
        <p className="text-muted-foreground">Управление вашим аккаунтом</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
          <CardDescription>Обновите информацию о себе</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={session?.user.email || ""}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email нельзя изменить
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                name="name"
                defaultValue={session?.user.name || ""}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить изменения"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Смена пароля</CardTitle>
          <CardDescription>Обновите пароль для входа в аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={passwordFormRef} action={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Минимум 8 символов, заглавная и строчная буква, цифра
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Изменить пароль"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
