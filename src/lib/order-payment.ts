import { db } from "@/lib/db"

interface MarkOrderPaidParams {
  orderId: string
  paymentId?: string
  paymentMethod?: string
}

interface OrderItemWithStageTemplates {
  productId: string
  product: {
    name: string
    stageTemplates: Array<{
      title: string
      description: string
      type: string
    }>
  }
}

export async function markOrderPaid({
  orderId,
  paymentId,
  paymentMethod,
}: MarkOrderPaidParams) {
  const updateResult = await db.order.updateMany({
    where: {
      id: orderId,
      status: { not: "PAID" },
    },
    data: {
      status: "PAID",
      installationStatus: "IN_PROGRESS",
      paidAt: new Date(),
      ...(paymentId ? { paymentId } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
    },
  })

  if (updateResult.count === 0) {
    return { changed: false }
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              stageTemplates: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  })

  if (!order) {
    return { changed: false }
  }

  for (const item of order.items) {
    await db.product.update({
      where: { id: item.productId },
      data: {
        downloads: { increment: 1 },
      },
    })
  }

  await createInstallationStages(orderId, order.items)

  return { changed: true }
}

export async function markOrderCancelled(orderId: string) {
  await db.order.updateMany({
    where: {
      id: orderId,
      status: { not: "PAID" },
    },
    data: {
      status: "CANCELLED",
    },
  })
}

async function createInstallationStages(
  orderId: string,
  items: OrderItemWithStageTemplates[]
) {
  const allTemplates: Array<{
    title: string
    description: string
    type: string
    sortOrder: number
    productName: string
  }> = []

  for (const item of items) {
    const templates = item.product.stageTemplates || []
    for (const template of templates) {
      allTemplates.push({
        title: template.title,
        description: template.description,
        type: template.type,
        sortOrder: allTemplates.length + 1,
        productName: item.product.name,
      })
    }
  }

  const hasMultipleProducts = items.length > 1

  for (const template of allTemplates) {
    const title = hasMultipleProducts
      ? `${template.title} (${template.productName})`
      : template.title

    await db.installationStage.create({
      data: {
        orderId,
        title,
        description: template.description,
        type: template.type,
        sortOrder: template.sortOrder,
        status: "PENDING",
      },
    })
  }
}
