import { db } from "@/lib/db"

async function createCustomerOrder() {
  // Get customer user and a product with templates
  const customer = await db.user.findFirst({ where: { role: "CUSTOMER" } })
  const product = await db.product.findFirst({
    where: { stageTemplates: { some: {} } },
    include: { stageTemplates: { orderBy: { sortOrder: "asc" } } },
  })

  if (!customer || !product) {
    console.log("Customer or product not found")
    return
  }

  // Create order for customer
  const order = await db.order.create({
    data: {
      orderNumber: "CUST-001",
      userId: customer.id,
      total: product.price,
      status: "PAID",
      installationStatus: "IN_PROGRESS",
      customerEmail: customer.email,
      customerName: customer.name,
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

  console.log("Customer order created:", order.id)
  console.log("Customer email:", customer.email)
}

createCustomerOrder()
  .catch(console.error)
  .finally(() => db.$disconnect())
