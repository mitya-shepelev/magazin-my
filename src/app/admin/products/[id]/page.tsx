import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { ProductForm } from "@/components/admin/ProductForm"

async function getProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: { seo: true }
  })
}

async function getCategories() {
  return db.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  })
}

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const [product, categories] = await Promise.all([
    getProduct(id),
    getCategories()
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Редактирование товара</h1>
        <p className="text-muted-foreground">{product.name}</p>
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  )
}
