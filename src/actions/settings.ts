"use server"

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { invalidate } from "@/lib/cache"
import { CACHE_KEYS } from "@/lib/cache-keys"

const SETTING_KEYS = [
  // Store
  "store_name",
  "store_email",
  "store_description",
  "store_phone",
  "store_address",
  "store_logo",
  // Payment
  "yookassa_shop_id",
  "yookassa_secret_key",
  "yookassa_return_url",
  "currency",
  // Email
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_password",
  "smtp_from_name",
  "smtp_from_email",
  // SEO
  "seo_title",
  "seo_description",
  "seo_keywords",
  "seo_og_image",
  "google_analytics",
  "yandex_metrika",
  // Social
  "social_telegram",
  "social_whatsapp",
  "social_vk",
  "social_youtube",
  "social_github",
  "social_discord",
  // Legal
  "legal_company_name",
  "legal_inn",
  "legal_ogrn",
  "legal_address",
  "legal_terms_url",
  "legal_privacy_url",
]

export async function saveSettingsAction(formData: FormData) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized")
  }

  // Собираем все настройки из формы
  const settings: { key: string; value: string }[] = []

  for (const key of SETTING_KEYS) {
    const value = formData.get(key)
    if (value !== null) {
      settings.push({ key, value: value.toString() })
    }
  }

  // Сохраняем каждую настройку
  for (const setting of settings) {
    await db.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    })
  }

  revalidatePath("/admin/settings")

  // Инвалидация Redis кеша
  await invalidate(CACHE_KEYS.SETTINGS)

  return { success: true }
}

export async function getSettingAction(key: string): Promise<string | null> {
  const setting = await db.setting.findUnique({
    where: { key },
  })
  return setting?.value ?? null
}

export async function getSettingsAction(keys: string[]): Promise<Record<string, string>> {
  const settings = await db.setting.findMany({
    where: { key: { in: keys } },
  })

  const result: Record<string, string> = {}
  for (const setting of settings) {
    result[setting.key] = setting.value
  }

  return result
}
