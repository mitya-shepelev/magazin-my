import { db } from "@/lib/db"
import { CategoryForm } from "@/components/admin/CategoryForm"

async function getCategories() {
  return db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })
}

export default async function NewCategoryPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Новая категория</h1>
        <p className="text-muted-foreground">Создание новой категории товаров</p>
      </div>

      <CategoryForm categories={categories} />
    </div>
  )
}
