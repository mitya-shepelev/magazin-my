import { NextRequest } from "next/server"
import { registerAction } from "../src/actions/auth"
import { db } from "../src/lib/db"
import { hashPassword, verifyPassword } from "../src/lib/password"
import { redis } from "../src/lib/redis"

type SmokeContext = {
  registeredUserId?: string
  adminId?: string
  otherUserId?: string
  categoryId?: string
  productId?: string
  orderId?: string
}

type SmokeUser = {
  id: string
  email: string
  name: string | null
  role: string
}

process.env.PAYMENT_PROVIDER = "mock"

const runId = `auth_checkout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const context: SmokeContext = {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function logStep(message: string) {
  console.log(`✓ ${message}`)
}

function isRedirectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const maybeError = error as { message?: string; digest?: string }
  return (
    maybeError.message?.includes("NEXT_REDIRECT") ||
    maybeError.digest?.includes("NEXT_REDIRECT")
  )
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

function formData(fields: Record<string, string>) {
  const data = new FormData()

  Object.entries(fields).forEach(([key, value]) => {
    data.set(key, value)
  })

  return data
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

  await db.user.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: [context.registeredUserId, context.adminId, context.otherUserId].filter(
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

async function verifyRegistration() {
  const weakPassword = await registerAction(
    formData({
      email: `weak-${runId}@example.com`,
      password: "weak",
      name: "Weak Smoke User",
    })
  )
  assert(weakPassword?.error, "Weak registration password should return a validation error")

  const email = `Registered-${runId}@Example.com`
  const password = "SmokePass123"

  try {
    await registerAction(
      formData({
        email,
        password,
        name: "Registered Smoke User",
      })
    )
    throw new Error("Successful registration should redirect to login")
  } catch (error) {
    if (!isRedirectError(error)) {
      throw error
    }
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  assert(user, "Successful registration should create a user")
  assert(user.role === "CUSTOMER", "Registered user should get CUSTOMER role")
  assert(user.name === "Registered Smoke User", "Registered user name should be saved")
  assert(user.password !== password, "Registered password should be hashed")
  assert(await verifyPassword(password, user.password), "Registered password hash should verify")
  context.registeredUserId = user.id

  const duplicate = await registerAction(
    formData({
      email: email.toLowerCase(),
      password,
      name: "Duplicate Smoke User",
    })
  )
  assert(duplicate?.error, "Duplicate registration should return a validation error")

  logStep("registration validates input, hashes password, normalizes email, and rejects duplicates")

  return user
}

async function createFixtures() {
  const [admin, otherUser] = await Promise.all([
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
        email: `${runId}-other@example.com`,
        password: await hashPassword("SmokePass123"),
        name: "Smoke Other",
        role: "CUSTOMER",
      },
    }),
  ])

  context.adminId = admin.id
  context.otherUserId = otherUser.id

  const category = await db.category.create({
    data: {
      name: `Auth Checkout Category ${runId}`,
      slug: `auth-checkout-category-${runId}`,
      description: "Temporary category for auth/checkout smoke tests",
    },
  })
  context.categoryId = category.id

  const product = await db.product.create({
    data: {
      name: `Auth Checkout Product ${runId}`,
      slug: `auth-checkout-product-${runId}`,
      shortDesc: "Auth checkout smoke product",
      description: "Temporary product for auth/checkout smoke tests",
      price: 499,
      categoryId: category.id,
      images: "[]",
      downloadFile: "/downloads/auth-checkout-package.zip",
      productType: "WEB_APP",
      stageTemplates: {
        create: {
          title: "Install product",
          description: "Admin installs the product",
          type: "ADMIN_WORK",
          sortOrder: 1,
        },
      },
    },
  })
  context.productId = product.id

  return {
    admin,
    otherUser,
    product,
  }
}

async function verifyCheckoutFlow(
  registeredUser: SmokeUser,
  fixtures: Awaited<ReturnType<typeof createFixtures>>
) {
  const { POST: createPayment } = await import("../src/app/api/payment/create/route")

  setUnauthenticatedSmokeSession()
  const unauthorizedResponse = await createPayment(
    jsonRequest(
      "http://localhost:3000/api/payment/create",
      { items: [{ id: fixtures.product.id }] },
      "198.51.100.50"
    )
  )
  assert(unauthorizedResponse.status === 401, "Checkout payment creation should require auth")

  setSmokeSession(registeredUser)
  const unavailableProductResponse = await createPayment(
    jsonRequest(
      "http://localhost:3000/api/payment/create",
      { items: [{ id: "missing-product-id" }] },
      "198.51.100.51"
    )
  )
  assert(unavailableProductResponse.status === 400, "Checkout should reject unavailable products")

  const createPaymentResponse = await createPayment(
    jsonRequest(
      "http://localhost:3000/api/payment/create",
      {
        items: [
          {
            id: fixtures.product.id,
            price: 1,
          },
        ],
      },
      "198.51.100.52"
    )
  )
  assert(createPaymentResponse.status === 200, "Authenticated customer should create checkout payment")

  const paymentJson = await readJson(createPaymentResponse)
  assert(typeof paymentJson.orderId === "string", "Payment response should include orderId")
  assert(typeof paymentJson.confirmationUrl === "string", "Payment response should include confirmationUrl")
  assert(
    paymentJson.confirmationUrl.includes(
      `/api/payment/mock/success?orderId=${paymentJson.orderId}`
    ),
    "Mock checkout should return a mock success URL"
  )

  context.orderId = paymentJson.orderId

  const order = await db.order.findUnique({
    where: { id: context.orderId },
    include: { items: true },
  })
  assert(order, "Checkout should create an order")
  assert(order.userId === registeredUser.id, "Checkout order should belong to the authenticated customer")
  assert(order.status === "PENDING", "Checkout order should start as PENDING")
  assert(order.total === fixtures.product.price, "Checkout order should use current product price")
  assert(order.paymentId === `mock_${order.id}`, "Checkout order should store mock payment id")
  assert(order.paymentMethod === "mock", "Checkout order should store mock payment method")
  assert(order.items.length === 1, "Checkout order should create one order item")
  assert(order.items[0]?.price === fixtures.product.price, "Order item should use current product price")

  logStep("authenticated checkout creates a pending mock-payment order with current product prices")
}

async function verifyMockPaymentAndOrderAccess(
  registeredUser: SmokeUser,
  fixtures: Awaited<ReturnType<typeof createFixtures>>
) {
  assert(context.orderId, "Order id should exist before mock payment verification")

  const { GET: mockSuccess } = await import("../src/app/api/payment/mock/success/route")
  const { GET: getOrder } = await import("../src/app/api/orders/[id]/route")
  const { GET: getAdminCacheStats } = await import("../src/app/api/admin/cache/stats/route")

  setSmokeSession(fixtures.otherUser)
  const otherPaymentResponse = await mockSuccess(
    getRequest(
      `http://localhost:3000/api/payment/mock/success?orderId=${context.orderId}`,
      "198.51.100.53"
    )
  )
  assert(
    otherPaymentResponse.status === 404,
    "Other customer must not complete someone else's mock payment"
  )

  const otherOrderResponse = await getOrder(
    getRequest(`http://localhost:3000/api/orders/${context.orderId}`, "198.51.100.54"),
    { params: Promise.resolve({ id: context.orderId }) }
  )
  assert(otherOrderResponse.status === 403, "Other customer must not read someone else's order")

  const customerAdminResponse = await getAdminCacheStats()
  assert(customerAdminResponse.status === 401, "Customer must not access admin APIs")

  setSmokeSession(registeredUser)
  const ownerPaymentResponse = await mockSuccess(
    getRequest(
      `http://localhost:3000/api/payment/mock/success?orderId=${context.orderId}`,
      "198.51.100.55"
    )
  )
  assert(
    ownerPaymentResponse.status >= 300 && ownerPaymentResponse.status < 400,
    "Mock payment success should redirect"
  )
  assert(
    ownerPaymentResponse.headers
      .get("location")
      ?.includes(`/cabinet/orders/${context.orderId}?payment=success`),
    "Mock payment success should redirect to the paid order"
  )

  const paidOrder = await db.order.findUnique({
    where: { id: context.orderId },
    include: {
      licenses: true,
      stages: true,
    },
  })
  assert(paidOrder, "Paid order should exist")
  assert(paidOrder.status === "PAID", "Mock success should mark order paid")
  assert(paidOrder.licenses.length === 1, "Mock success should create one license")
  assert(paidOrder.stages.length === 1, "Mock success should copy installation stages")

  const ownerOrderResponse = await getOrder(
    getRequest(`http://localhost:3000/api/orders/${context.orderId}`, "198.51.100.56"),
    { params: Promise.resolve({ id: context.orderId }) }
  )
  assert(ownerOrderResponse.status === 200, "Order owner should read their order")

  setSmokeSession(fixtures.admin)
  const adminOrderResponse = await getOrder(
    getRequest(`http://localhost:3000/api/orders/${context.orderId}`, "198.51.100.57"),
    { params: Promise.resolve({ id: context.orderId }) }
  )
  assert(adminOrderResponse.status === 200, "Admin should read customer orders")

  logStep("mock payment completes only for owner and order access is owner/admin scoped")
}

async function main() {
  await cleanup()
  const registeredUser = await verifyRegistration()
  const fixtures = await createFixtures()
  await verifyCheckoutFlow(registeredUser, fixtures)
  await verifyMockPaymentAndOrderAccess(registeredUser, fixtures)
}

main()
  .then(async () => {
    await cleanup()
    await disconnect()
    console.log("Auth and checkout smoke passed")
  })
  .catch(async (error) => {
    console.error("Auth and checkout smoke failed")
    console.error(error)
    await cleanup()
    await disconnect()
    process.exit(1)
  })
