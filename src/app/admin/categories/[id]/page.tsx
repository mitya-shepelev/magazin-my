import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { CategoryForm } from "@/components/admin/CategoryForm"

async function getCategory(id: string) {
  return db.category.findUnique({
    where: { id },
    include: { seo: true }
  })
}

async function getCategories() {
  return db.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })
}

interface EditCategoryPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params
  const [category, categories] = await Promise.all([
    getCategory(id),
    getCategories()
  ])

  if (!category) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Редактирование категории</h1>
        <p className="text-muted-foreground">{category.name}</p>
      </div>

      <CategoryForm category={category} categories={categories} />
    </div>
  )
}
