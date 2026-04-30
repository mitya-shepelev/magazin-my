import { NextRequest } from "next/server"
import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/password"
import { redis } from "../src/lib/redis"

type SmokeContext = {
  adminId?: string
  customerId?: string
  categoryId?: string
  productId?: string
  otherProductId?: string
  templateIds: string[]
  redisKey?: string
}

type SmokeUser = {
  id: string
  email: string
  name: string | null
  role: string
}

const runId = `admin_api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const context: SmokeContext = {
  templateIds: [],
}

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

function putJsonRequest(url: string, body: Record<string, unknown>, ip: string) {
  return new NextRequest(url, {
    method: "PUT",
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

function deleteRequest(url: string, ip: string) {
  return new NextRequest(url, {
    method: "DELETE",
    headers: {
      "x-real-ip": ip,
    },
  })
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>
}

async function cleanup() {
  if (context.redisKey) {
    await redis.del(context.redisKey)
  }

  if (context.productId || context.otherProductId) {
    await db.product.deleteMany({
      where: {
        id: {
          in: [context.productId, context.otherProductId].filter((id): id is string =>
            Boolean(id)
          ),
        },
      },
    })
  }

  if (context.categoryId) {
    await db.category.deleteMany({ where: { id: context.categoryId } })
  }

  await db.user.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: [context.adminId, context.customerId].filter((id): id is string =>
              Boolean(id)
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
  const [admin, customer] = await Promise.all([
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
        email: `${runId}-customer@example.com`,
        password: await hashPassword("SmokePass123"),
        name: "Smoke Customer",
        role: "CUSTOMER",
      },
    }),
  ])

  context.adminId = admin.id
  context.customerId = customer.id

  const category = await db.category.create({
    data: {
      name: `Admin API Category ${runId}`,
      slug: `admin-api-category-${runId}`,
      description: "Temporary category for admin API smoke tests",
    },
  })
  context.categoryId = category.id

  const product = await db.product.create({
    data: {
      name: `Admin API Product ${runId}`,
      slug: `admin-api-product-${runId}`,
      shortDesc: "Admin API smoke product",
      description: "Temporary product for admin API smoke tests",
      price: 799,
      categoryId: category.id,
      images: "[]",
      downloadFile: "/downloads/admin-api-package.zip",
      productType: "WEB_APP",
      supportDays: 30,
      stageTemplates: {
        create: [
          {
            title: "Collect server access",
            description: "Customer provides access",
            type: "CLIENT_ACTION",
            sortOrder: 1,
          },
          {
            title: "Install product",
            description: "Admin installs product",
            type: "ADMIN_WORK",
            sortOrder: 2,
          },
        ],
      },
    },
    include: {
      stageTemplates: {
        orderBy: { sortOrder: "asc" },
      },
    },
  })
  context.productId = product.id
  context.templateIds = product.stageTemplates.map((template) => template.id)

  const otherProduct = await db.product.create({
    data: {
      name: `Other Admin API Product ${runId}`,
      slug: `other-admin-api-product-${runId}`,
      shortDesc: "Other admin API smoke product",
      description: "Temporary other product for admin API smoke tests",
      price: 999,
      categoryId: category.id,
      images: "[]",
      downloadFile: "/downloads/other-admin-api-package.zip",
      productType: "WEB_APP",
      stageTemplates: {
        create: {
          title: "Other product stage",
          description: "Used to verify product scoping",
          type: "ADMIN_WORK",
          sortOrder: 1,
        },
      },
    },
    include: {
      stageTemplates: true,
    },
  })
  context.otherProductId = otherProduct.id

  const otherTemplate = otherProduct.stageTemplates[0]
  assert(otherTemplate, "Other product template should be created")

  return {
    admin,
    customer,
    product,
    otherProduct,
    otherTemplate,
  }
}

async function verifyProductAdminApi(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { PUT: updateProduct } = await import("../src/app/api/admin/products/[id]/route")

  setSmokeSession(fixtures.customer)
  const customerResponse = await updateProduct(
    putJsonRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}`,
      { supportDays: 45 },
      "198.51.100.60"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(customerResponse.status === 401, "Customer must not update products")

  setSmokeSession(fixtures.admin)
  const invalidResponse = await updateProduct(
    putJsonRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}`,
      { supportDays: -1 },
      "198.51.100.61"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(invalidResponse.status === 400, "Product update should validate supportDays")

  const missingResponse = await updateProduct(
    putJsonRequest(
      "http://localhost:3000/api/admin/products/missing-product",
      { supportDays: 45 },
      "198.51.100.62"
    ),
    { params: Promise.resolve({ id: "missing-product" }) }
  )
  assert(missingResponse.status === 404, "Product update should 404 missing products")

  const updateResponse = await updateProduct(
    putJsonRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}`,
      { supportDays: 45 },
      "198.51.100.63"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(updateResponse.status === 200, "Admin should update product supportDays")

  const product = await readJson(updateResponse)
  assert(product.supportDays === 45, "Product response should include updated supportDays")

  logStep("product admin API enforces role, validation, missing resource, and update behavior")
}

async function verifyTemplateAdminApi(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { GET: listTemplates, POST: createTemplate } = await import(
    "../src/app/api/admin/products/[id]/templates/route"
  )
  const {
    GET: getTemplate,
    PUT: updateTemplate,
    DELETE: deleteTemplate,
  } = await import("../src/app/api/admin/products/[id]/templates/[tid]/route")
  const { PUT: reorderTemplates } = await import(
    "../src/app/api/admin/products/[id]/templates/reorder/route"
  )

  setSmokeSession(fixtures.customer)
  const customerListResponse = await listTemplates(
    getRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates`,
      "198.51.100.70"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(customerListResponse.status === 401, "Customer must not list stage templates")

  setSmokeSession(fixtures.admin)
  const listResponse = await listTemplates(
    getRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates`,
      "198.51.100.71"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(listResponse.status === 200, "Admin should list stage templates")
  const listJson = await readJson(listResponse)
  const templates = listJson.templates as Array<{ id: string; sortOrder: number }>
  assert(templates.length === 2, "Template list should include initial templates")
  assert(templates[0]?.sortOrder === 1 && templates[1]?.sortOrder === 2, "Templates should be sorted")

  const invalidCreateResponse = await createTemplate(
    jsonRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates`,
      { title: "", description: "", type: "BAD_TYPE" },
      "198.51.100.72"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(invalidCreateResponse.status === 400, "Template create should validate payload")

  const createResponse = await createTemplate(
    jsonRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates`,
      {
        title: "Confirm launch",
        description: "Customer confirms launch",
        type: "CONFIRMATION",
      },
      "198.51.100.73"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(createResponse.status === 201, "Admin should create a stage template")
  const createdTemplate = await readJson(createResponse)
  assert(createdTemplate.sortOrder === 3, "Created template should get next sortOrder")
  assert(typeof createdTemplate.id === "string", "Created template should include id")
  context.templateIds.push(createdTemplate.id)

  const wrongProductResponse = await getTemplate(
    getRequest(
      `http://localhost:3000/api/admin/products/${fixtures.otherProduct.id}/templates/${createdTemplate.id}`,
      "198.51.100.74"
    ),
    {
      params: Promise.resolve({
        id: fixtures.otherProduct.id,
        tid: createdTemplate.id,
      }),
    }
  )
  assert(wrongProductResponse.status === 404, "Template detail should scope by product id")

  const updateResponse = await updateTemplate(
    putJsonRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates/${createdTemplate.id}`,
      {
        title: "Customer confirms launch",
        type: "CONFIRMATION",
      },
      "198.51.100.75"
    ),
    {
      params: Promise.resolve({
        id: fixtures.product.id,
        tid: createdTemplate.id,
      }),
    }
  )
  assert(updateResponse.status === 200, "Admin should update a stage template")
  const updatedTemplate = await readJson(updateResponse)
  assert(updatedTemplate.title === "Customer confirms launch", "Template update should persist title")

  const reorderIds = [createdTemplate.id, context.templateIds[1], context.templateIds[0]]
  const reorderResponse = await reorderTemplates(
    putJsonRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates/reorder`,
      { templateIds: reorderIds },
      "198.51.100.76"
    ),
    { params: Promise.resolve({ id: fixtures.product.id }) }
  )
  assert(reorderResponse.status === 200, "Admin should reorder templates")
  const reordered = (await reorderResponse.json()) as Array<{ id: string; sortOrder: number }>
  assert(
    reordered.map((template) => template.id).join(",") === reorderIds.join(","),
    "Reorder response should follow requested order"
  )
  assert(
    reordered.every((template, index) => template.sortOrder === index + 1),
    "Reorder response should update sortOrder"
  )

  const deleteResponse = await deleteTemplate(
    deleteRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates/${createdTemplate.id}`,
      "198.51.100.77"
    ),
    {
      params: Promise.resolve({
        id: fixtures.product.id,
        tid: createdTemplate.id,
      }),
    }
  )
  assert(deleteResponse.status === 200, "Admin should delete a stage template")

  const deletedResponse = await getTemplate(
    getRequest(
      `http://localhost:3000/api/admin/products/${fixtures.product.id}/templates/${createdTemplate.id}`,
      "198.51.100.78"
    ),
    {
      params: Promise.resolve({
        id: fixtures.product.id,
        tid: createdTemplate.id,
      }),
    }
  )
  assert(deletedResponse.status === 404, "Deleted template should not be found")

  logStep("template admin APIs enforce role, validation, product scoping, CRUD, and reorder")
}

async function verifyCacheAdminApi(fixtures: Awaited<ReturnType<typeof createFixtures>>) {
  const { GET: getCacheStats } = await import("../src/app/api/admin/cache/stats/route")
  const { POST: clearCache } = await import("../src/app/api/admin/cache/clear/route")

  setSmokeSession(fixtures.customer)
  const customerStatsResponse = await getCacheStats()
  assert(customerStatsResponse.status === 401, "Customer must not read cache stats")

  const customerClearResponse = await clearCache(
    jsonRequest("http://localhost:3000/api/admin/cache/clear", { pattern: "related:*" }, "198.51.100.80")
  )
  assert(customerClearResponse.status === 401, "Customer must not clear cache")

  setSmokeSession(fixtures.admin)
  const statsResponse = await getCacheStats()
  assert(statsResponse.status === 200, "Admin should read cache stats")
  const statsJson = await readJson(statsResponse)
  assert(statsJson.connected === true, "Cache stats should report Redis connection")

  const invalidClearResponse = await clearCache(
    jsonRequest(
      "http://localhost:3000/api/admin/cache/clear",
      { pattern: `related:${runId}:*` },
      "198.51.100.81"
    )
  )
  assert(invalidClearResponse.status === 400, "Cache clear should reject unsupported patterns")

  context.redisKey = `related:${runId}:smoke`
  await redis.set(context.redisKey, "admin-api-smoke")

  const clearResponse = await clearCache(
    jsonRequest("http://localhost:3000/api/admin/cache/clear", { pattern: "related:*" }, "198.51.100.82")
  )
  assert(clearResponse.status === 200, "Admin should clear allowed cache patterns")
  const clearJson = await readJson(clearResponse)
  assert(clearJson.success === true, "Cache clear should report success")
  assert(Number(clearJson.deleted) >= 1, "Cache clear should delete the smoke key")
  assert((await redis.get(context.redisKey)) === null, "Smoke Redis key should be removed")

  logStep("cache admin APIs enforce role, pattern validation, stats, and clear behavior")
}

async function main() {
  await cleanup()
  const fixtures = await createFixtures()
  logStep("created isolated admin, customer, products, and stage templates")

  await verifyProductAdminApi(fixtures)
  await verifyTemplateAdminApi(fixtures)
  await verifyCacheAdminApi(fixtures)
}

main()
  .then(async () => {
    await cleanup()
    await disconnect()
    console.log("Admin API smoke passed")
  })
  .catch(async (error) => {
    console.error("Admin API smoke failed")
    console.error(error)
    await cleanup()
    await disconnect()
    process.exit(1)
  })
