import { db } from "@/lib/db"
import { ProductForm } from "@/components/admin/ProductForm"
import { redirect } from "next/navigation"

async function getCategories() {
  return db.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })
}

export default async function NewProductPage() {
  const categories = await getCategories()

  if (categories.length === 0) {
    redirect("/admin/categories/new?message=Сначала создайте категорию")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Новый товар</h1>
        <p className="text-muted-foreground">Добавление нового товара в каталог</p>
      </div>

      <ProductForm categories={categories} />
    </div>
  )
}
