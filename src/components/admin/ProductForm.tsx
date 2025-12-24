"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createProduct, updateProduct } from "@/actions/products"
import { toast } from "sonner"
import { Loader2, X, Upload } from "lucide-react"

interface Product {
  id: string
  name: string
  slug: string
  shortDesc: string | null
  description: string
  price: number
  oldPrice: number | null
  categoryId: string
  productType: string
  demoUrl: string | null
  version: string | null
  features: string | null
  images: string
  downloadFile: string
  isFeatured: boolean
  isActive: boolean
  seo: {
    title: string
    description: string
    keywords: string
    canonicalUrl: string | null
  } | null
}

interface ProductFormProps {
  product?: Product
  categories: { id: string; name: string }[]
}

export function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [images, setImages] = useState<string[]>(
    product ? JSON.parse(product.images || "[]") : []
  )
  const isEditing = !!product

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)

    // Добавляем существующие изображения
    formData.set("existingImages", JSON.stringify(images))

    const result = isEditing
      ? await updateProduct(product.id, formData)
      : await createProduct(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(isEditing ? "Товар обновлён" : "Товар создан")
      router.push("/admin/products")
    }
    setIsLoading(false)
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index))
  }

  return (
    <form action={handleSubmit}>
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Основное</TabsTrigger>
          <TabsTrigger value="media">Медиа</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Основные данные */}
        <TabsContent value="general" forceMount className="data-[state=inactive]:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={product?.name}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Категория *</Label>
                  <Select name="categoryId" defaultValue={product?.categoryId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDesc">Краткое описание</Label>
                <Input
                  id="shortDesc"
                  name="shortDesc"
                  defaultValue={product?.shortDesc || ""}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Полное описание *</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={product?.description}
                  rows={6}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Цена (₽) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={product?.price}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oldPrice">Старая цена (₽)</Label>
                  <Input
                    id="oldPrice"
                    name="oldPrice"
                    type="number"
                    step="0.01"
                    defaultValue={product?.oldPrice || ""}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productType">Тип продукта</Label>
                  <Select name="productType" defaultValue={product?.productType || "WEB_APP"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEB_APP">Веб-приложение</SelectItem>
                      <SelectItem value="MOBILE_APP">Мобильное приложение</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demoUrl">Ссылка на демо</Label>
                  <Input
                    id="demoUrl"
                    name="demoUrl"
                    type="url"
                    defaultValue={product?.demoUrl || ""}
                    placeholder="https://demo.example.com"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="version">Версия</Label>
                  <Input
                    id="version"
                    name="version"
                    defaultValue={product?.version || ""}
                    placeholder="1.0.0"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="features">Характеристики (JSON)</Label>
                <Textarea
                  id="features"
                  name="features"
                  defaultValue={product?.features || ""}
                  rows={4}
                  placeholder='["Адаптивный дизайн", "Тёмная тема", "API интеграция"]'
                  disabled={isLoading}
                />
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isFeatured"
                    name="isFeatured"
                    defaultChecked={product?.isFeatured}
                  />
                  <Label htmlFor="isFeatured">Рекомендуемый товар</Label>
                </div>

                {isEditing && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      name="isActive"
                      defaultChecked={product?.isActive}
                    />
                    <Label htmlFor="isActive">Активен</Label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Медиа файлы */}
        <TabsContent value="media" forceMount className="data-[state=inactive]:hidden">
          <Card>
            <CardHeader>
              <CardTitle>Файлы и изображения</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="downloadFile">Файл для скачивания</Label>
                <Input
                  id="downloadFile"
                  name="downloadFile"
                  type="file"
                  accept=".zip,.rar,.7z,.tar,.gz"
                  disabled={isLoading}
                />
                {product?.downloadFile && (
                  <p className="text-sm text-muted-foreground">
                    Текущий файл: {product.downloadFile}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="images">Изображения</Label>
                <Input
                  id="images"
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isLoading}
                />
              </div>

              {images.length > 0 && (
                <div className="space-y-2">
                  <Label>Текущие изображения</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Изображение ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO данные */}
        <TabsContent value="seo" forceMount className="data-[state=inactive]:hidden">
          <Card>
            <CardHeader>
              <CardTitle>SEO настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">Мета-заголовок (title)</Label>
                <Input
                  id="seoTitle"
                  name="seoTitle"
                  defaultValue={product?.seo?.title || ""}
                  maxLength={60}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Рекомендуемая длина: до 60 символов
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">Мета-описание (description)</Label>
                <Textarea
                  id="seoDescription"
                  name="seoDescription"
                  defaultValue={product?.seo?.description || ""}
                  maxLength={160}
                  rows={3}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Рекомендуемая длина: до 160 символов
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoKeywords">Ключевые слова (keywords)</Label>
                <Input
                  id="seoKeywords"
                  name="seoKeywords"
                  defaultValue={product?.seo?.keywords || ""}
                  placeholder="слово1, слово2, слово3"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Через запятую
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Канонический URL</Label>
                <Input
                  id="canonicalUrl"
                  name="canonicalUrl"
                  defaultValue={product?.seo?.canonicalUrl || ""}
                  placeholder="https://example.com/product/slug"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-4 mt-6">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение...
            </>
          ) : isEditing ? (
            "Сохранить изменения"
          ) : (
            "Создать товар"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
        >
          Отмена
        </Button>
      </div>
    </form>
  )
}
