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
import { createCategory, updateCategory } from "@/actions/categories"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  seo: {
    title: string
    description: string
    keywords: string
    canonicalUrl: string | null
  } | null
}

interface CategoryFormProps {
  category?: Category
  categories: { id: string; name: string }[]
}

export function CategoryForm({ category, categories }: CategoryFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!category

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)

    const result = isEditing
      ? await updateCategory(category.id, formData)
      : await createCategory(formData)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(isEditing ? "Категория обновлена" : "Категория создана")
      router.push("/admin/categories")
    }
    setIsLoading(false)
  }

  // Фильтруем категории, исключая текущую и её дочерние
  const availableParents = categories.filter((c) => c.id !== category?.id)

  return (
    <form action={handleSubmit}>
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Основное</TabsTrigger>
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
                    defaultValue={category?.name}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parentId">Родительская категория</Label>
                  <Select name="parentId" defaultValue={category?.parentId || "__none__"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Нет (корневая)</SelectItem>
                      {availableParents.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={category?.description || ""}
                  rows={4}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Порядок сортировки</Label>
                  <Input
                    id="sortOrder"
                    name="sortOrder"
                    type="number"
                    defaultValue={category?.sortOrder || 0}
                    disabled={isLoading}
                  />
                </div>

                {isEditing && (
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id="isActive"
                      name="isActive"
                      defaultChecked={category?.isActive}
                    />
                    <Label htmlFor="isActive">Активна</Label>
                  </div>
                )}
              </div>
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
                  defaultValue={category?.seo?.title || ""}
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
                  defaultValue={category?.seo?.description || ""}
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
                  defaultValue={category?.seo?.keywords || ""}
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
                  defaultValue={category?.seo?.canonicalUrl || ""}
                  placeholder="https://example.com/category/slug"
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
            "Создать категорию"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/categories")}
        >
          Отмена
        </Button>
      </div>
    </form>
  )
}
