import { NextRequest } from "next/server"
import { db } from "../src/lib/db"
import { redis } from "../src/lib/redis"
import { markOrderPaid } from "../src/lib/order-payment"
import { POST as activateLicense } from "../src/app/api/licenses/activate/route"

type SmokeContext = {
  userId?: string
  categoryId?: string
  productId?: string
  orderId?: string
}

const runId = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const context: SmokeContext = {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function logStep(message: string) {
  console.log(`✓ ${message}`)
}

async function postLicenseActivation(body: Record<string, unknown>) {
  const request = new NextRequest("http://localhost:3000/api/licenses/activate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": "203.0.113.55",
    },
    body: JSON.stringify(body),
  })

  const response = await activateLicense(request)
  const json = await response.json()

  return {
    status: response.status,
    json,
  }
}

async function cleanup() {
  if (context.orderId) {
    await db.order.deleteMany({ where: { id: context.orderId } })
  }

  if (context.productId) {
    await db.product.deleteMany({ where: { id: context.productId } })
  }

  if (context.categoryId) {
    await db.category.deleteMany({ where: { id: context.categoryId } })
  }

  if (context.userId) {
    await db.user.deleteMany({ where: { id: context.userId } })
  }
}

async function disconnect() {
  await db.$disconnect()
  await redis.quit()
}

async function main() {
  await cleanup()

  const user = await db.user.create({
    data: {
      email: `${runId}@example.com`,
      password: "smoke-password",
      name: "Smoke Customer",
      role: "CUSTOMER",
    },
  })
  context.userId = user.id

  const category = await db.category.create({
    data: {
      name: `Smoke Category ${runId}`,
      slug: `smoke-category-${runId}`,
      description: "Temporary category for critical flow smoke tests",
    },
  })
  context.categoryId = category.id

  const product = await db.product.create({
    data: {
      name: `Smoke Product ${runId}`,
      slug: `smoke-product-${runId}`,
      shortDesc: "Smoke product",
      description: "Temporary product for critical flow smoke tests",
      price: 199,
      categoryId: category.id,
      images: "[]",
      downloadFile: "/downloads/smoke-package.zip",
      productType: "WEB_APP",
      stageTemplates: {
        create: [
          {
            title: "Collect server access",
            description: "Customer provides server access",
            type: "CLIENT_ACTION",
            sortOrder: 1,
          },
          {
            title: "Install product",
            description: "Admin installs product",
            type: "ADMIN_WORK",
            sortOrder: 2,
          },
          {
            title: "Confirm launch",
            description: "Customer confirms installation",
            type: "CONFIRMATION",
            sortOrder: 3,
          },
        ],
      },
    },
    include: {
      stageTemplates: true,
    },
  })
  context.productId = product.id

  const order = await db.order.create({
    data: {
      orderNumber: `ORD-SMOKE-${runId}`,
      userId: user.id,
      total: product.price,
      customerEmail: user.email,
      customerName: user.name,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          price: product.price,
        },
      },
    },
    include: {
      items: true,
    },
  })
  context.orderId = order.id
  const orderItem = order.items[0]
  assert(orderItem, "Smoke order item was not created")
  logStep("created isolated smoke user, product, stage templates, and order")

  const firstPayment = await markOrderPaid({
    orderId: order.id,
    paymentId: `pay_${runId}`,
    paymentMethod: "smoke",
  })
  assert(firstPayment.changed, "First payment transition should change the order")

  const secondPayment = await markOrderPaid({
    orderId: order.id,
    paymentId: `pay_${runId}_duplicate`,
    paymentMethod: "smoke",
  })
  assert(!secondPayment.changed, "Duplicate payment transition should be idempotent")
  logStep("payment transition is idempotent")

  const paidOrder = await db.order.findUnique({
    where: { id: order.id },
    include: {
      licenses: true,
      stages: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })

  assert(paidOrder, "Paid order was not found")
  assert(paidOrder.status === "PAID", "Order should be PAID")
  assert(paidOrder.installationStatus === "IN_PROGRESS", "Installation status should be IN_PROGRESS")
  assert(paidOrder.paymentId === `pay_${runId}`, "Duplicate payment must not overwrite original paymentId")
  assert(paidOrder.licenses.length === 1, "Paid order item should get exactly one license")
  assert(paidOrder.stages.length === product.stageTemplates.length, "Stage templates should be copied to installation stages")

  const updatedProduct = await db.product.findUnique({ where: { id: product.id } })
  assert(updatedProduct?.downloads === 1, "Product purchase/install counter should increment only once")
  logStep("paid order generated one license, copied stages, and incremented product counter once")

  const license = paidOrder.licenses[0]
  assert(license, "License was not created")

  const activationSuccess = await postLicenseActivation({
    licenseKey: license.licenseKey,
    productId: product.id,
    domain: "https://Smoke.Example.com/path",
    serverIp: "203.0.113.55",
    version: "smoke",
  })
  assert(activationSuccess.status === 200, "License activation should succeed")
  assert(activationSuccess.json.valid === true, "License activation response should be valid")
  assert(activationSuccess.json.license.domain === "smoke.example.com", "License activation should normalize domain")
  logStep("license activation succeeds and normalizes domain")

  const wrongDomain = await postLicenseActivation({
    licenseKey: license.licenseKey,
    productId: product.id,
    domain: "other.example.com",
    serverIp: "203.0.113.55",
    version: "smoke",
  })
  assert(wrongDomain.status === 403, "Wrong domain activation should be rejected")
  assert(wrongDomain.json.valid === false, "Wrong domain response should be invalid")
  logStep("wrong-domain activation is rejected")

  await db.license.update({
    where: { id: license.id },
    data: { status: "SUSPENDED" },
  })

  const suspended = await postLicenseActivation({
    licenseKey: license.licenseKey,
    productId: product.id,
    domain: "smoke.example.com",
    serverIp: "203.0.113.55",
    version: "smoke",
  })
  assert(suspended.status === 403, "Suspended license activation should be rejected")
  assert(suspended.json.status === "SUSPENDED", "Suspended license response should include status")
  logStep("suspended license activation is rejected")

  const events = await db.licenseEvent.findMany({
    where: { licenseId: license.id },
    orderBy: { createdAt: "asc" },
  })
  const eventTypes = events.map((event) => event.eventType)

  assert(eventTypes.includes("ACTIVATION_SUCCESS"), "Activation success should create audit event")
  assert(eventTypes.filter((eventType) => eventType === "ACTIVATION_REJECTED").length >= 2, "Rejected activations should create audit events")
  logStep("license activation audit events are written")
}

main()
  .then(async () => {
    await cleanup()
    await disconnect()
    console.log("Critical flow smoke passed")
  })
  .catch(async (error) => {
    console.error("Critical flow smoke failed")
    console.error(error)
    await cleanup()
    await disconnect()
    process.exit(1)
  })
