"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { invalidate, invalidatePattern } from "@/lib/cache"
import { CACHE_KEYS } from "@/lib/cache-keys"
import slugify from "slugify"

// Проверка авторизации администратора
async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }
  return session
}

export async function createCategory(formData: FormData) {
  await requireAdmin()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const parentIdRaw = formData.get("parentId") as string
  const parentId = parentIdRaw && parentIdRaw !== "__none__" ? parentIdRaw : null
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0

  // SEO данные
  const seoTitle = formData.get("seoTitle") as string
  const seoDescription = formData.get("seoDescription") as string
  const seoKeywords = formData.get("seoKeywords") as string
  const canonicalUrl = formData.get("canonicalUrl") as string

  const slug = slugify(name, { lower: true, locale: "ru" })

  try {
    const category = await db.category.create({
      data: {
        name,
        slug,
        description,
        parentId,
        sortOrder,
        seo: seoTitle ? {
          create: {
            title: seoTitle,
            description: seoDescription,
            keywords: seoKeywords,
            canonicalUrl: canonicalUrl || null,
          }
        } : undefined
      }
    })

    revalidatePath("/admin/categories")
    revalidatePath("/")

    // Инвалидация Redis кеша
    await invalidate(CACHE_KEYS.CATEGORIES)
    await invalidatePattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`)

    return { success: true, category }
  } catch {
    return { error: "Ошибка при создании категории" }
  }
}

export async function updateCategory(id: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const parentIdRaw = formData.get("parentId") as string
  const parentId = parentIdRaw && parentIdRaw !== "__none__" ? parentIdRaw : null
  const sortOrder = parseInt(formData.get("sortOrder") as string) || 0
  const isActive = formData.get("isActive") === "on"

  // SEO данные
  const seoTitle = formData.get("seoTitle") as string
  const seoDescription = formData.get("seoDescription") as string
  const seoKeywords = formData.get("seoKeywords") as string
  const canonicalUrl = formData.get("canonicalUrl") as string

  const slug = slugify(name, { lower: true, locale: "ru" })

  try {
    // Обновляем категорию
    await db.category.update({
      where: { id },
      data: {
        name,
        slug,
        description,
        parentId,
        sortOrder,
        isActive,
      }
    })

    // Обновляем или создаём SEO
    if (seoTitle) {
      await db.seoMeta.upsert({
        where: { categoryId: id },
        create: {
          categoryId: id,
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords,
          canonicalUrl: canonicalUrl || null,
        },
        update: {
          title: seoTitle,
          description: seoDescription,
          keywords: seoKeywords,
          canonicalUrl: canonicalUrl || null,
        }
      })
    }

    revalidatePath("/admin/categories")
    revalidatePath(`/category/${slug}`)
    revalidatePath("/")

    // Инвалидация Redis кеша
    await invalidate(CACHE_KEYS.CATEGORIES)
    await invalidatePattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`)
    await invalidatePattern('category:*:products:*')

    return { success: true }
  } catch {
    return { error: "Ошибка при обновлении категории" }
  }
}

export async function deleteCategory(id: string) {
  await requireAdmin()

  try {
    // Сначала удаляем SEO
    await db.seoMeta.deleteMany({
      where: { categoryId: id }
    })

    // Затем удаляем категорию
    await db.category.delete({
      where: { id }
    })

    revalidatePath("/admin/categories")
    revalidatePath("/")

    // Инвалидация Redis кеша
    await invalidate(CACHE_KEYS.CATEGORIES)
    await invalidatePattern(`${CACHE_KEYS.PRODUCTS_LIST}:*`)
    await invalidatePattern('category:*:products:*')
    await invalidate('products:count')

    return { success: true }
  } catch {
    return { error: "Ошибка при удалении категории" }
  }
}
