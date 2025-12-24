"use server"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import slugify from "slugify"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// Константы для валидации файлов
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_DOWNLOAD_SIZE = 100 * 1024 * 1024 // 100MB

// Санитизация имени файла для предотвращения path traversal
function sanitizeFilename(filename: string): string {
  return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_")
}

// Проверка авторизации администратора
async function requireAdmin() {
  const session = await auth()
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }
  return session
}

export async function createProduct(formData: FormData) {
  await requireAdmin()

  const name = formData.get("name") as string
  const shortDesc = formData.get("shortDesc") as string
  const description = formData.get("description") as string
  const price = parseFloat(formData.get("price") as string)
  const oldPrice = formData.get("oldPrice") ? parseFloat(formData.get("oldPrice") as string) : null
  const categoryId = formData.get("categoryId") as string
  const productType = formData.get("productType") as string
  const demoUrl = formData.get("demoUrl") as string
  const version = formData.get("version") as string
  const features = formData.get("features") as string
  const isFeatured = formData.get("isFeatured") === "on"

  // SEO данные
  const seoTitle = formData.get("seoTitle") as string
  const seoDescription = formData.get("seoDescription") as string
  const seoKeywords = formData.get("seoKeywords") as string
  const canonicalUrl = formData.get("canonicalUrl") as string

  // Файлы
  const downloadFile = formData.get("downloadFile") as File
  const imageFiles = formData.getAll("images") as File[]

  const slug = slugify(name, { lower: true, locale: "ru" })

  try {
    // Сохраняем файл для скачивания
    let downloadFilePath = ""
    if (downloadFile && downloadFile.size > 0) {
      // Валидация размера файла
      if (downloadFile.size > MAX_DOWNLOAD_SIZE) {
        return { error: "Файл для скачивания слишком большой (макс. 100MB)" }
      }

      const downloadsDir = path.join(process.cwd(), "downloads")
      await mkdir(downloadsDir, { recursive: true })

      // Санитизация имени файла
      const safeExt = path.extname(sanitizeFilename(downloadFile.name))
      const fileName = `${slug}-${Date.now()}${safeExt}`
      downloadFilePath = `/downloads/${fileName}`

      const buffer = Buffer.from(await downloadFile.arrayBuffer())
      await writeFile(path.join(downloadsDir, fileName), buffer)
    }

    // Сохраняем изображения
    const images: string[] = []
    if (imageFiles.length > 0) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "products")
      await mkdir(uploadsDir, { recursive: true })

      for (const file of imageFiles) {
        if (file.size > 0) {
          // Валидация типа файла
          if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return { error: `Недопустимый тип изображения: ${file.type}. Разрешены: JPEG, PNG, WebP, GIF` }
          }
          // Валидация размера
          if (file.size > MAX_IMAGE_SIZE) {
            return { error: "Изображение слишком большое (макс. 10MB)" }
          }

          // Санитизация имени файла
          const safeExt = path.extname(sanitizeFilename(file.name))
          const fileName = `${slug}-${Date.now()}-${Math.random().toString(36).substring(7)}${safeExt}`
          const filePath = `/uploads/products/${fileName}`

          const buffer = Buffer.from(await file.arrayBuffer())
          await writeFile(path.join(uploadsDir, fileName), buffer)

          images.push(filePath)
        }
      }
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        shortDesc,
        description,
        price,
        oldPrice,
        categoryId,
        productType,
        demoUrl: demoUrl || null,
        version: version || null,
        features: features || null,
        isFeatured,
        downloadFile: downloadFilePath,
        images: JSON.stringify(images),
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

    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/catalog")
    return { success: true, product }
  } catch (error) {
    console.error(error)
    return { error: "Ошибка при создании товара" }
  }
}

export async function updateProduct(id: string, formData: FormData) {
  await requireAdmin()

  const name = formData.get("name") as string
  const shortDesc = formData.get("shortDesc") as string
  const description = formData.get("description") as string
  const price = parseFloat(formData.get("price") as string)
  const oldPrice = formData.get("oldPrice") ? parseFloat(formData.get("oldPrice") as string) : null
  const categoryId = formData.get("categoryId") as string
  const productType = formData.get("productType") as string
  const demoUrl = formData.get("demoUrl") as string
  const version = formData.get("version") as string
  const features = formData.get("features") as string
  const isFeatured = formData.get("isFeatured") === "on"
  const isActive = formData.get("isActive") === "on"
  const existingImages = formData.get("existingImages") as string

  // SEO данные
  const seoTitle = formData.get("seoTitle") as string
  const seoDescription = formData.get("seoDescription") as string
  const seoKeywords = formData.get("seoKeywords") as string
  const canonicalUrl = formData.get("canonicalUrl") as string

  const slug = slugify(name, { lower: true, locale: "ru" })

  try {
    // Получаем текущий товар
    const currentProduct = await db.product.findUnique({ where: { id } })
    if (!currentProduct) {
      return { error: "Товар не найден" }
    }

    // Обрабатываем новый файл для скачивания
    const downloadFile = formData.get("downloadFile") as File
    let downloadFilePath = currentProduct.downloadFile

    if (downloadFile && downloadFile.size > 0) {
      // Валидация размера файла
      if (downloadFile.size > MAX_DOWNLOAD_SIZE) {
        return { error: "Файл для скачивания слишком большой (макс. 100MB)" }
      }

      const downloadsDir = path.join(process.cwd(), "downloads")
      await mkdir(downloadsDir, { recursive: true })

      // Санитизация имени файла
      const safeExt = path.extname(sanitizeFilename(downloadFile.name))
      const fileName = `${slug}-${Date.now()}${safeExt}`
      downloadFilePath = `/downloads/${fileName}`

      const buffer = Buffer.from(await downloadFile.arrayBuffer())
      await writeFile(path.join(downloadsDir, fileName), buffer)
    }

    // Обрабатываем изображения
    let images: string[] = existingImages ? JSON.parse(existingImages) : []
    const imageFiles = formData.getAll("images") as File[]

    if (imageFiles.length > 0) {
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "products")
      await mkdir(uploadsDir, { recursive: true })

      for (const file of imageFiles) {
        if (file.size > 0) {
          // Валидация типа файла
          if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return { error: `Недопустимый тип изображения: ${file.type}. Разрешены: JPEG, PNG, WebP, GIF` }
          }
          // Валидация размера
          if (file.size > MAX_IMAGE_SIZE) {
            return { error: "Изображение слишком большое (макс. 10MB)" }
          }

          // Санитизация имени файла
          const safeExt = path.extname(sanitizeFilename(file.name))
          const fileName = `${slug}-${Date.now()}-${Math.random().toString(36).substring(7)}${safeExt}`
          const filePath = `/uploads/products/${fileName}`

          const buffer = Buffer.from(await file.arrayBuffer())
          await writeFile(path.join(uploadsDir, fileName), buffer)

          images.push(filePath)
        }
      }
    }

    // Обновляем товар
    await db.product.update({
      where: { id },
      data: {
        name,
        slug,
        shortDesc,
        description,
        price,
        oldPrice,
        categoryId,
        productType,
        demoUrl: demoUrl || null,
        version: version || null,
        features: features || null,
        isFeatured,
        isActive,
        downloadFile: downloadFilePath,
        images: JSON.stringify(images),
      }
    })

    // Обновляем SEO
    if (seoTitle) {
      await db.seoMeta.upsert({
        where: { productId: id },
        create: {
          productId: id,
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

    revalidatePath("/admin/products")
    revalidatePath(`/product/${slug}`)
    revalidatePath("/")
    revalidatePath("/catalog")
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Ошибка при обновлении товара" }
  }
}

export async function deleteProduct(id: string) {
  await requireAdmin()

  try {
    // Удаляем SEO
    await db.seoMeta.deleteMany({
      where: { productId: id }
    })

    // Удаляем товар
    await db.product.delete({
      where: { id }
    })

    revalidatePath("/admin/products")
    revalidatePath("/")
    revalidatePath("/catalog")
    return { success: true }
  } catch (error) {
    return { error: "Ошибка при удалении товара" }
  }
}
