import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ProductForm } from "@/components/admin/ProductForm"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Редактирование товара</h1>
          <p className="text-muted-foreground">{product.name}</p>
        </div>
        <Link href={`/admin/products/${id}/stages`}>
          <Button variant="outline">
            <Settings2 className="h-4 w-4 mr-2" />
            Этапы установки
          </Button>
        </Link>
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  )
}
