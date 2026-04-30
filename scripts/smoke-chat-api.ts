import { NextRequest } from "next/server"
import { CACHE_KEYS } from "../src/lib/cache-keys"
import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/password"
import { redis } from "../src/lib/redis"

type SmokeContext = {
  adminId?: string
  ownerId?: string
  otherUserId?: string
  categoryId?: string
  productId?: string
  orderId?: string
  unpaidOrderId?: string
}

type SmokeUser = {
  id: string
  email: string
  name: string | null
  role: string
}

type RealtimeEvent = {
  type: string
  payload: Record<string, unknown>
}

const runId = `chat_api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const context: SmokeContext = {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function logStep(message: string) {
  console.log(`✓ ${message}`)
}

function setSmokeSession(user: SmokeUser) {
  delete process.env.INTERNAL_SMOKE_AUTH_DISABLED
  process.env.INTERNAL_SMOKE_AUTH_USER_ID = user.id
  process.env.INTERNAL_SMOKE_AUTH_ROLE = user.role
  process.env.INTERNAL_SMOKE_AUTH_EMAIL = user.email
  process.env.INTERNAL_SMOKE_AUTH_NAME = user.name || "Smoke User"
}

function setUnauthenticatedSmokeSession() {
  clearSmokeSession()
  process.env.INTERNAL_SMOKE_AUTH_DISABLED = "1"
}

function clearSmokeSession() {
  delete process.env.INTERNAL_SMOKE_AUTH_DISABLED
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

function getRequest(url: string, ip: string) {
  return new NextRequest(url, {
    method: "GET",
    headers: {
      "x-real-ip": ip,
    },
  })
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

async function readJsonArray(response: Response) {
  return (await response.json()) as Array<Record<string, unknown>>
}

async function waitForRealtimeEvent(
  orderId: string,
  action: () => Promise<Response>,
  expectedType: string
) {
  const subscriber = redis.duplicate()
  const channel = `order:${orderId}:events`

  await subscriber.subscribe(channel)

  const eventPromise = new Promise<RealtimeEvent>((resolve, reject) => {
    const timeout = setTimeout(() => {
      subscriber.off("message", onMessage)
      reject(new Error(`Timed out waiting for ${expectedType}`))
    }, 3000)

    function onMessage(receivedChannel: string, message: string) {
      if (receivedChannel !== channel) {
        return
      }

      const event = JSON.parse(message) as RealtimeEvent
      if (event.type !== expectedType) {
        return
      }

      clearTimeout(timeout)
      subscriber.off("message", onMessage)
      resolve(event)
    }

    subscriber.on("message", onMessage)
  })

  try {
    const response = await action()
    const event = await eventPromise
    return { response, event }
  } finally {
    await subscriber.unsubscribe(channel)
    subscriber.disconnect()
  }
}

async function cleanup() {
  const cacheKeys = [context.orderId, context.unpaidOrderId]
    .filter((id): id is string => Boolean(id))
    .map((id) => CACHE_KEYS.ORDER_MESSAGES(id))

  if (cacheKeys.length > 0) {
    await redis.del(...cacheKeys)
  }

  if (context.orderId || context.unpaidOrderId) {
    await db.order.deleteMany({
      where: {
        id: {
          in: [context.orderId, context.unpaidOrderId].filter((id): id is string =>
            Boolean(id)
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
      OR: [
        {
          id: {
            in: [context.adminId, context.ownerId, context.otherUserId].filter(
              (id): id is string => Boolean(id)
            ),
          },
        },
        { email: { contains: runId } },
      ],
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
        password: await hashPassword("SmokePass123"),
        name: "Smoke Admin",
        role: "ADMIN",
      },
    }),
    db.user.create({
      data: {
        email: `${runId}-owner@example.com`,
        password: await hashPassword("SmokePass123"),
        name: "Smoke Owner",
        role: "CUSTOMER",
      },
    }),
    db.user.create({
      data: {
        email: `${runId}-other@example.com`,
        password: await hashPassword("SmokePass123"),
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
      name: `Chat API Category ${runId}`,
      slug: `chat-api-category-${runId}`,
      description: "Temporary category for chat API smoke tests",
    },
  })
  context.categoryId = category.id

  const product = await db.product.create({
    data: {
      name: `Chat API Product ${runId}`,
      slug: `chat-api-product-${runId}`,
      shortDesc: "Chat API smoke product",
      description: "Temporary product for chat API smoke tests",
      price: 599,
      categoryId: category.id,
      images: "[]",
      downloadFile: "/downloads/chat-api-package.zip",
      productType: "WEB_APP",
    },
  })
  context.productId = product.id

  const order = await db.order.create({
    data: {
      orderNumber: `ORD-CHAT-${runId}`,
      userId: owner.id,
      total: product.price,
      status: "PAID",
      installationStatus: "IN_PROGRESS",
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

  const unpaidOrder = await db.order.create({
    data: {
      orderNumber: `ORD-CHAT-UNPAID-${runId}`,
      userId: owner.id,
      total: product.price,
      status: "PENDING",
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
  context.unpaidOrderId = unpaidOrder.id

  return {
    admin,
    owner,
    otherUser,
    order,
    unpaidOrder,
  }
}

async function verifyCustomerMessageApi(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { GET: getMessages, POST: postMessage } = await import(
    "../src/app/api/orders/[id]/messages/route"
  )

  setUnauthenticatedSmokeSession()
  const unauthenticatedResponse = await getMessages(
    getRequest(`http://localhost:3000/api/orders/${fixtures.order.id}/messages`, "198.51.100.90"),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(unauthenticatedResponse.status === 401, "Message list should require auth")

  setSmokeSession(fixtures.otherUser)
  const otherUserResponse = await getMessages(
    getRequest(`http://localhost:3000/api/orders/${fixtures.order.id}/messages`, "198.51.100.91"),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(otherUserResponse.status === 403, "Other customer must not read order messages")

  setSmokeSession(fixtures.owner)
  const emptyResponse = await getMessages(
    getRequest(`http://localhost:3000/api/orders/${fixtures.order.id}/messages`, "198.51.100.92"),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(emptyResponse.status === 200, "Order owner should read messages")
  assert((await readJsonArray(emptyResponse)).length === 0, "New order should have no messages")

  const invalidResponse = await postMessage(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/messages`,
      { content: "" },
      "198.51.100.93"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(invalidResponse.status === 400, "Customer message should validate content")

  const unpaidResponse = await postMessage(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.unpaidOrder.id}/messages`,
      { content: "Message before payment" },
      "198.51.100.94"
    ),
    { params: Promise.resolve({ id: fixtures.unpaidOrder.id }) }
  )
  assert(unpaidResponse.status === 400, "Customer must not message before payment")

  await redis.set(CACHE_KEYS.ORDER_MESSAGES(fixtures.order.id), "cached")

  const { response, event } = await waitForRealtimeEvent(
    fixtures.order.id,
    () =>
      postMessage(
        jsonRequest(
          `http://localhost:3000/api/orders/${fixtures.order.id}/messages`,
          {
            content: "Customer smoke message",
            files: JSON.stringify([
              {
                name: "brief.txt",
                url: "/api/files/smoke",
                type: "text/plain",
              },
            ]),
          },
          "198.51.100.95"
        ),
        { params: Promise.resolve({ id: fixtures.order.id }) }
      ),
    "message:new"
  )

  assert(response.status === 201, "Customer should create a paid-order message")
  const message = await readJson(response)
  assert(message.content === "Customer smoke message", "Message response should include content")
  assert(message.userId === fixtures.owner.id, "Message should belong to the customer")
  assert((await redis.get(CACHE_KEYS.ORDER_MESSAGES(fixtures.order.id))) === null, "Message post should invalidate cached messages")
  assert(event.payload.content === "Customer smoke message", "Realtime message event should include content")

  logStep("customer message API enforces auth, ownership, validation, payment status, cache invalidation, and realtime publish")

  return message
}

async function verifyAdminMessageApi(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { GET: getAdminMessages, POST: postAdminMessage } = await import(
    "../src/app/api/admin/orders/[id]/messages/route"
  )

  setSmokeSession(fixtures.owner)
  const customerListResponse = await getAdminMessages(
    getRequest(`http://localhost:3000/api/admin/orders/${fixtures.order.id}/messages`, "198.51.100.100"),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(customerListResponse.status === 401, "Customer must not use admin message list")

  const customerPostResponse = await postAdminMessage(
    jsonRequest(
      `http://localhost:3000/api/admin/orders/${fixtures.order.id}/messages`,
      { content: "Forbidden admin message" },
      "198.51.100.101"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(customerPostResponse.status === 401, "Customer must not use admin message create")

  setSmokeSession(fixtures.admin)
  const invalidResponse = await postAdminMessage(
    jsonRequest(
      `http://localhost:3000/api/admin/orders/${fixtures.order.id}/messages`,
      { content: "" },
      "198.51.100.102"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(invalidResponse.status === 400, "Admin message should validate content")

  const missingOrderResponse = await postAdminMessage(
    jsonRequest(
      "http://localhost:3000/api/admin/orders/missing-order/messages",
      { content: "Missing order message" },
      "198.51.100.103"
    ),
    { params: Promise.resolve({ id: "missing-order" }) }
  )
  assert(missingOrderResponse.status === 404, "Admin message create should 404 missing orders")

  const { response, event } = await waitForRealtimeEvent(
    fixtures.order.id,
    () =>
      postAdminMessage(
        jsonRequest(
          `http://localhost:3000/api/admin/orders/${fixtures.order.id}/messages`,
          { content: "Admin smoke message" },
          "198.51.100.104"
        ),
        { params: Promise.resolve({ id: fixtures.order.id }) }
      ),
    "message:new"
  )

  assert(response.status === 201, "Admin should create an order message")
  const message = await readJson(response)
  assert(message.content === "Admin smoke message", "Admin message response should include content")
  assert(message.userId === fixtures.admin.id, "Admin message should belong to admin")
  assert(event.payload.userId === fixtures.admin.id, "Realtime admin message event should include admin user")

  const listResponse = await getAdminMessages(
    getRequest(`http://localhost:3000/api/admin/orders/${fixtures.order.id}/messages`, "198.51.100.105"),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(listResponse.status === 200, "Admin should list order messages")
  assert((await readJsonArray(listResponse)).length === 2, "Admin message list should include customer and admin messages")

  logStep("admin message API enforces role, validation, missing order handling, listing, and realtime publish")

  return message
}

async function verifyReadApi(
  fixtures: Awaited<ReturnType<typeof createFixtures>>,
  customerMessage: Record<string, unknown>,
  adminMessage: Record<string, unknown>
) {
  const { POST: markRead } = await import("../src/app/api/orders/[id]/messages/read/route")

  setSmokeSession(fixtures.otherUser)
  const otherUserResponse = await markRead(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/messages/read`,
      { messageIds: [adminMessage.id] },
      "198.51.100.110"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(otherUserResponse.status === 403, "Other customer must not mark order messages read")

  setSmokeSession(fixtures.owner)
  const invalidResponse = await markRead(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/messages/read`,
      { messageIds: [] },
      "198.51.100.111"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(invalidResponse.status === 400, "Read endpoint should validate message IDs")

  const { response, event } = await waitForRealtimeEvent(
    fixtures.order.id,
    () =>
      markRead(
        jsonRequest(
          `http://localhost:3000/api/orders/${fixtures.order.id}/messages/read`,
          { messageIds: [customerMessage.id, adminMessage.id] },
          "198.51.100.112"
        ),
        { params: Promise.resolve({ id: fixtures.order.id }) }
      ),
    "message:read"
  )
  assert(response.status === 200, "Order owner should mark admin messages read")
  const readResult = await readJson(response)
  assert(readResult.updated === 1, "Owner read should update only the admin message")
  assert(event.payload.readBy === fixtures.owner.id, "Realtime read event should include reader")

  const [updatedCustomerMessage, updatedAdminMessage] = await Promise.all([
    db.orderMessage.findUnique({ where: { id: customerMessage.id as string } }),
    db.orderMessage.findUnique({ where: { id: adminMessage.id as string } }),
  ])

  assert(updatedCustomerMessage?.status === "SENT", "Owner should not mark their own message read")
  assert(updatedAdminMessage?.status === "READ", "Owner should mark admin message read")
  assert(updatedAdminMessage.isRead === true, "Read message should update backward-compatible isRead")
  assert(updatedAdminMessage.readAt, "Read message should get readAt timestamp")

  setSmokeSession(fixtures.admin)
  const adminReadResponse = await markRead(
    jsonRequest(
      `http://localhost:3000/api/orders/${fixtures.order.id}/messages/read`,
      { messageIds: [customerMessage.id] },
      "198.51.100.113"
    ),
    { params: Promise.resolve({ id: fixtures.order.id }) }
  )
  assert(adminReadResponse.status === 200, "Admin should mark customer messages read")
  assert((await readJson(adminReadResponse)).updated === 1, "Admin read should update customer message")

  logStep("read API enforces ownership, validation, self-message exclusion, status updates, and realtime publish")
}

async function main() {
  await cleanup()
  const fixtures = await createFixtures()
  logStep("created isolated admin, customers, paid order, and unpaid order")

  const customerMessage = await verifyCustomerMessageApi(fixtures)
  const adminMessage = await verifyAdminMessageApi(fixtures)
  await verifyReadApi(fixtures, customerMessage, adminMessage)
}

main()
  .then(async () => {
    await cleanup()
    await disconnect()
    console.log("Chat API smoke passed")
  })
  .catch(async (error) => {
    console.error("Chat API smoke failed")
    console.error(error)
    await cleanup()
    await disconnect()
    process.exit(1)
  })
