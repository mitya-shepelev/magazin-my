import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { StageTemplateManager } from "@/components/admin/StageTemplateManager"

async function getProduct(id: string) {
  return db.product.findUnique({
    where: { id },
    include: {
      stageTemplates: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })
}

interface StagesPageProps {
  params: Promise<{ id: string }>
}

export default async function StagesPage({ params }: StagesPageProps) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/products/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Этапы установки</h1>
          <p className="text-muted-foreground">{product.name}</p>
        </div>
      </div>

      <StageTemplateManager
        productId={product.id}
        productName={product.name}
        supportDays={product.supportDays}
        initialTemplates={product.stageTemplates}
      />
    </div>
  )
}
