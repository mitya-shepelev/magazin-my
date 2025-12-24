import { db } from "@/lib/db"

async function updateOrderFields() {
  // Find the test order
  const order = await db.order.findFirst({
    where: { orderNumber: "CUST-001" },
  })

  if (!order) {
    console.log("Order CUST-001 not found")
    return
  }

  // Calculate support end date (30 days from now)
  const supportEndsAt = new Date()
  supportEndsAt.setDate(supportEndsAt.getDate() + 30)

  // Update with paymentId and supportEndsAt
  const updated = await db.order.update({
    where: { id: order.id },
    data: {
      paymentId: "2e9f8d7c-1234-5678-abcd-ef0123456789",
      supportEndsAt,
    },
  })

  console.log("Order updated:")
  console.log("  paymentId:", updated.paymentId)
  console.log("  supportEndsAt:", updated.supportEndsAt)
}

updateOrderFields()
  .catch(console.error)
  .finally(() => db.$disconnect())
