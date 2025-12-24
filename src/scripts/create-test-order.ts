import { db } from "@/lib/db"

async function createTestOrder() {
  // Get admin user and a product with templates
  const admin = await db.user.findFirst({ where: { role: "ADMIN" } })
  const product = await db.product.findFirst({
    where: { stageTemplates: { some: {} } },
    include: { stageTemplates: { orderBy: { sortOrder: "asc" } } },
  })

  if (!admin || !product) {
    console.log("Admin or product not found")
    return
  }

  // Create order
  const order = await db.order.create({
    data: {
      orderNumber: "TEST-001",
      userId: admin.id,
      total: product.price,
      status: "PAID",
      installationStatus: "IN_PROGRESS",
      customerEmail: admin.email,
      customerName: admin.name,
      paidAt: new Date(),
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          price: product.price,
        },
      },
      stages: {
        create: product.stageTemplates.map((t, i) => ({
          title: t.title,
          description: t.description,
          type: t.type,
          status: i === 0 ? "IN_PROGRESS" : "PENDING",
          sortOrder: t.sortOrder,
        })),
      },
    },
  })

  console.log("Test order created:", order.id)
}

createTestOrder()
  .catch(console.error)
  .finally(() => db.$disconnect())
