import { createHmac } from "crypto"
import { NextRequest } from "next/server"
import { db } from "../src/lib/db"
import { redis } from "../src/lib/redis"
import { markOrderPaid } from "../src/lib/order-payment"

type SmokeContext = {
  adminId?: string
  ownerId?: string
  otherUserId?: string
  categoryId?: string
  productId?: string
  orderId?: string
  otherOrderId?: string
  webhookOrderId?: string
}

type SmokeUser = {
  id: string
  email: string
  name: string | null
  role: string
}

const runId = `api_security_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const context: SmokeContext = {}
const webhookSecret = "api-security-webhook-secret-at-least-32-chars"

process.env.ROLLYPAY_WEBHOOK_SECRET = webhookSecret

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function logStep(message: string) {
  console.log(`✓ ${message}`)
}

function setSmokeSession(user: SmokeUser) {
  process.env.INTERNAL_SMOKE_AUTH_USER_ID = user.id
  process.env.INTERNAL_SMOKE_AUTH_ROLE = user.role
  process.env.INTERNAL_SMOKE_AUTH_EMAIL = user.email
  process.env.INTERNAL_SMOKE_AUTH_NAME = user.name || "Smoke User"
}

function clearSmokeSession() {
  delete process.env.INTERNAL_SMOKE_AUTH_USER_ID
  delete process.env.INTERNAL_SMOKE_AUTH_ROLE
  delete process.env.INTERNAL_SMOKE_AUTH_EMAIL
  delete process.env.INTERNAL_SMOKE_AUTH_NAME
}

function jsonRequest(url: string, body: Record<string, unknown>, ip: string) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": ip,
    },
    body: JSON.stringify(body),
  })
}

function formRequest(url: string, formData: FormData, ip: string) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "x-real-ip": ip,
    },
    body: formData,
  })
}

function signedWebhookRequest(
  body: Record<string, unknown>,
  timestamp: number,
  signature: string,
  ip: string
) {
  const rawBody = JSON.stringify(body)

  return new NextRequest("http://localhost:3000/api/payment/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-real-ip": ip,
      "x-signature": signature,
      "x-timestamp": String(timestamp),
    },
    body: rawBody,
  })
}

function signWebhook(body: Record<string, unknown>, timestamp: number) {
  return createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${JSON.stringify(body)}`)
    .digest("hex")
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

async function cleanup() {
  await db.paymentWebhookEvent.deleteMany({
    where: {
      OR: [
        { paymentId: { contains: runId } },
        {
          orderId: {
            in: [context.orderId, context.otherOrderId, context.webhookOrderId].filter(
              (id): id is string => Boolean(id)
            ),
          },
        },
      ],
    },
  })

  if (context.orderId || context.otherOrderId || context.webhookOrderId) {
    await db.order.deleteMany({
      where: {
        id: {
          in: [context.orderId, context.otherOrderId, context.webhookOrderId].filter(
            (id): id is string => Boolean(id)
          ),
        },
      },
    })
  }

  if (context.productId) {
    await db.product.deleteMany({ where: { id: context.productId } })
  }

  if (context.categoryId) {
    await db.category.deleteMany({ where: { id: context.categoryId } })
  }

  await db.user.deleteMany({
    where: {
      id: {
        in: [context.adminId, context.ownerId, context.otherUserId].filter(
          (id): id is string => Boolean(id)
        ),
      },
    },
  })
}

async function disconnect() {
  clearSmokeSession()
  await db.$disconnect()
  await redis.quit()
}

async function createFixtures() {
  const [admin, owner, otherUser] = await Promise.all([
    db.user.create({
      data: {
        email: `${runId}-admin@example.com`,
        password: "smoke-password",
        name: "Smoke Admin",
        role: "ADMIN",
      },
    }),
    db.user.create({
      data: {
        email: `${runId}-owner@example.com`,
        password: "smoke-password",
        name: "Smoke Owner",
        role: "CUSTOMER",
      },
    }),
    db.user.create({
      data: {
        email: `${runId}-other@example.com`,
        password: "smoke-password",
        name: "Smoke Other",
        role: "CUSTOMER",
      },
    }),
  ])

  context.adminId = admin.id
  context.ownerId = owner.id
  context.otherUserId = otherUser.id

  const category = await db.category.create({
    data: {
      name: `API Security Category ${runId}`,
      slug: `api-security-category-${runId}`,
      description: "Temporary category for API security smoke tests",
    },
  })
  context.categoryId = category.id

  const product = await db.product.create({
    data: {
      name: `API Security Product ${runId}`,
      slug: `api-security-product-${runId}`,
      shortDesc: "API security smoke product",
      description: "Temporary product for API security smoke tests",
      price: 299,
      categoryId: category.id,
      images: "[]",
      downloadFile: "/downloads/api-security-package.zip",
      productType: "WEB_APP",
      stageTemplates: {
        create: [
          {
            title: "Collect access",
            description: "Customer provides access",
            type: "CLIENT_ACTION",
            sortOrder: 1,
          },
          {
            title: "Confirm installation",
            description: "Customer confirms installation",
            type: "CONFIRMATION",
            sortOrder: 2,
          },
        ],
      },
    },
  })
  context.productId = product.id

  const order = await db.order.create({
    data: {
      orderNumber: `ORD-API-SEC-${runId}`,
      userId: owner.id,
      total: product.price,
      customerEmail: owner.email,
      customerName: owner.name,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          price: product.price,
        },
      },
    },
  })
  context.orderId = order.id

  const otherOrder = await db.order.create({
    data: {
      orderNumber: `ORD-API-SEC-OTHER-${runId}`,
      userId: owner.id,
      total: product.price,
      customerEmail: owner.email,
      customerName: owner.name,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          price: product.price,
        },
      },
    },
  })
  context.otherOrderId = otherOrder.id

  const webhookOrder = await db.order.create({
    data: {
      orderNumber: `ORD-API-SEC-WEBHOOK-${runId}`,
      userId: owner.id,
      total: product.price,
      customerEmail: owner.email,
      customerName: owner.name,
      items: {
        create: {
          productId: product.id,
          productName: product.name,
          price: product.price,
        },
      },
    },
  })
  context.webhookOrderId = webhookOrder.id

  await markOrderPaid({
    orderId: order.id,
    paymentId: `pay_${runId}`,
    paymentMethod: "smoke",
  })

  const stages = await db.installationStage.findMany({
    where: { orderId: order.id },
    orderBy: { sortOrder: "asc" },
  })
  const clientActionStage = stages.find((stage) => stage.type === "CLIENT_ACTION")
  const confirmationStage = stages.find((stage) => stage.type === "CONFIRMATION")

  assert(clientActionStage, "Client action stage was not created")
  assert(confirmationStage, "Confirmation stage was not created")

  await db.installationStage.updateMany({
    where: { id: { in: [clientActionStage.id, confirmationStage.id] } },
    data: { status: "IN_PROGRESS" },
  })

  const otherStage = await db.installationStage.create({
    data: {
      orderId: otherOrder.id,
      title: "Other order stage",
      description: "Used to verify order/stage scoping",
      type: "ADMIN_WORK",
      status: "PENDING",
      sortOrder: 1,
    },
  })

  return {
    admin,
    owner,
    otherUser,
    product,
    order,
    otherOrder,
    webhookOrder,
    clientActionStage,
    confirmationStage,
    otherStage,
  }
}

async function verifyWebhookSecurity() {
  const { POST } = await import("../src/app/api/payment/webhook/route")
  const body = {
    event_type: "payment.paid",
    payment_id: `webhook_${runId}`,
  }
  const now = Math.floor(Date.now() / 1000)

  const validResponse = await POST(
    signedWebhookRequest(body, now, signWebhook(body, now), "198.51.100.10")
  )
  assert(validResponse.status === 200, "Valid webhook signature should be accepted")

  const invalidResponse = await POST(
    signedWebhookRequest(body, now, "invalid-signature", "198.51.100.11")
  )
  assert(invalidResponse.status === 403, "Invalid webhook signature should be rejected")

  const staleTimestamp = now - 10 * 60
  const staleResponse = await POST(
    signedWebhookRequest(
      body,
      staleTimestamp,
      signWebhook(body, staleTimestamp),
      "198.51.100.12"
    )
  )
  assert(staleResponse.status === 403, "Stale webhook timestamp should be rejected")

  logStep("webhook signatures reject invalid and stale requests")
}

async function verifyWebhookIdempotency(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { POST } = await import("../src/app/api/payment/webhook/route")
  const body = {
    event_id: `evt_${runId}`,
    event_type: "payment.paid",
    payment_id: `webhook_paid_${runId}`,
    order_id: fixtures.webhookOrder.id,
    status: "paid",
  }
  const now = Math.floor(Date.now() / 1000)

  const firstResponse = await POST(
    signedWebhookRequest(body, now, signWebhook(body, now), "198.51.100.13")
  )
  assert(firstResponse.status === 200, "First paid webhook should be accepted")

  const secondResponse = await POST(
    signedWebhookRequest(body, now, signWebhook(body, now), "198.51.100.14")
  )
  assert(secondResponse.status === 200, "Duplicate paid webhook should be acknowledged")

  const duplicateResult = await readJson(secondResponse)
  assert(duplicateResult.duplicate === true, "Duplicate webhook should be reported as duplicate")

  const [webhookEvents, webhookOrder, product] = await Promise.all([
    db.paymentWebhookEvent.findMany({
      where: { paymentId: `webhook_paid_${runId}` },
    }),
    db.order.findUnique({
      where: { id: fixtures.webhookOrder.id },
      include: {
        licenses: true,
        stages: true,
      },
    }),
    db.product.findUnique({ where: { id: fixtures.product.id } }),
  ])

  assert(webhookEvents.length === 1, "Duplicate webhook should create one stored event")
  assert(webhookEvents[0]?.processingStatus === "PROCESSED", "Stored webhook event should be processed")
  assert(webhookOrder?.status === "PAID", "Webhook order should be paid")
  assert(webhookOrder.licenses.length === 1, "Duplicate webhook should create one license")
  assert(webhookOrder.stages.length === 2, "Duplicate webhook should create one stage set")
  assert(product?.downloads === 2, "Duplicate webhook should increment purchase counter once")

  logStep("payment webhook duplicate delivery is idempotent")
}

async function verifyOrderMessageSecurity(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { POST } = await import("../src/app/api/orders/[id]/messages/route")

  setSmokeSession(fixtures.owner)
  const ownerResponse = await POST(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/messages`,
      { content: "Owner smoke message" },
      "198.51.100.20"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(ownerResponse.status === 201, "Order owner should be able to send a message")

  setSmokeSession(fixtures.otherUser)
  const otherUserResponse = await POST(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/messages`,
      { content: "Forbidden smoke message" },
      "198.51.100.21"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(otherUserResponse.status === 403, "Other customer must not send messages to someone else's order")

  logStep("order message API enforces order ownership")
}

async function verifyUploadSecurity(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { POST } = await import("../src/app/api/orders/[id]/upload/route")
  const formData = new FormData()
  formData.append("files", new File(["hello"], "hello.txt", { type: "text/plain" }))

  setSmokeSession(fixtures.otherUser)
  const response = await POST(
    formRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/upload`,
      formData,
      "198.51.100.30"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )

  assert(response.status === 403, "Other customer must not upload files to someone else's order")
  logStep("order upload API enforces order ownership before accepting files")
}

async function verifyStageSecurity(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { POST: confirmStage } = await import(
    "../src/app/api/orders/[id]/stages/[stageId]/confirm/route"
  )
  const { POST: updateStageStatus } = await import(
    "../src/app/api/admin/orders/[id]/stages/[stageId]/status/route"
  )

  setSmokeSession(fixtures.otherUser)
  const otherUserConfirmResponse = await confirmStage(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/stages/${fixtures.confirmationStage.id}/confirm`,
      {},
      "198.51.100.40"
    ),
    {
      params: Promise.resolve({
        id: fixtures.order.id,
        stageId: fixtures.confirmationStage.id,
      }),
    }
  )
  assert(otherUserConfirmResponse.status === 403, "Other customer must not confirm someone else's stage")

  setSmokeSession(fixtures.owner)
  const wrongTypeResponse = await confirmStage(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/stages/${fixtures.clientActionStage.id}/confirm`,
      {},
      "198.51.100.41"
    ),
    {
      params: Promise.resolve({
        id: fixtures.order.id,
        stageId: fixtures.clientActionStage.id,
      }),
    }
  )
  assert(wrongTypeResponse.status === 400, "Customer must not confirm a non-confirmation stage")

  const ownerConfirmResponse = await confirmStage(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/stages/${fixtures.confirmationStage.id}/confirm`,
      {},
      "198.51.100.42"
    ),
    {
      params: Promise.resolve({
        id: fixtures.order.id,
        stageId: fixtures.confirmationStage.id,
      }),
    }
  )
  assert(ownerConfirmResponse.status === 200, "Order owner should confirm an active confirmation stage")

  const confirmedStage = await readJson(ownerConfirmResponse)
  assert(confirmedStage.status === "COMPLETED", "Confirmed stage should be completed")

  setSmokeSession(fixtures.owner)
  const customerAdminResponse = await updateStageStatus(
    jsonRequest(
      `http://localhost:3000/api/admin/orders/${fixtures.order.id}/stages/${fixtures.clientActionStage.id}/status`,
      { status: "COMPLETED" },
      "198.51.100.43"
    ),
    {
      params: Promise.resolve({
        id: fixtures.order.id,
        stageId: fixtures.clientActionStage.id,
      }),
    }
  )
  assert(customerAdminResponse.status === 401, "Customer must not use admin stage status API")

  setSmokeSession(fixtures.admin)
  const wrongOrderStageResponse = await updateStageStatus(
    jsonRequest(
      `http://localhost:3000/api/admin/orders/${fixtures.order.id}/stages/${fixtures.otherStage.id}/status`,
      { status: "COMPLETED" },
      "198.51.100.44"
    ),
    {
      params: Promise.resolve({
        id: fixtures.order.id,
        stageId: fixtures.otherStage.id,
      }),
    }
  )
  assert(wrongOrderStageResponse.status === 404, "Admin stage update must scope stage by order id")

  const adminUpdateResponse = await updateStageStatus(
    jsonRequest(
      `http://localhost:3000/api/admin/orders/${fixtures.order.id}/stages/${fixtures.clientActionStage.id}/status`,
      { status: "COMPLETED" },
      "198.51.100.45"
    ),
    {
      params: Promise.resolve({
        id: fixtures.order.id,
        stageId: fixtures.clientActionStage.id,
      }),
    }
  )
  assert(adminUpdateResponse.status === 200, "Admin should update a stage in the requested order")

  const adminUpdatedStage = await readJson(adminUpdateResponse)
  assert(adminUpdatedStage.completedBy === fixtures.admin.id, "Admin update should record completedBy")

  logStep("stage APIs enforce owner/admin permissions and order scoping")
}

async function main() {
  await cleanup()
  const fixtures = await createFixtures()
  logStep("created isolated users, product, paid order, and stages")

  await verifyWebhookSecurity()
  await verifyWebhookIdempotency(fixtures)
  await verifyOrderMessageSecurity(fixtures)
  await verifyUploadSecurity(fixtures)
  await verifyStageSecurity(fixtures)
}

main()
  .then(async () => {
    await cleanup()
    await disconnect()
    console.log("API security smoke passed")
  })
  .catch(async (error) => {
    console.error("API security smoke failed")
    console.error(error)
    await cleanup()
    await disconnect()
    process.exit(1)
  })
