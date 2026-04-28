import { randomBytes } from "crypto"
import { db } from "@/lib/db"

export function generateLicenseKey() {
  const body = randomBytes(16).toString("hex").toUpperCase()
  const groups = body.match(/.{1,4}/g) || []
  return `MY-${groups.join("-")}`
}

export function normalizeDomain(value: string) {
  const raw = value.trim().toLowerCase()

  if (!raw) {
    return ""
  }

  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`)
    return url.hostname.replace(/^www\./, "")
  } catch {
    return raw
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
  }
}

export async function createLicenseForOrderItem(params: {
  orderId: string
  orderItemId: string
  productId: string
  userId: string
}) {
  const existingLicense = await db.license.findUnique({
    where: { orderItemId: params.orderItemId },
  })

  if (existingLicense) {
    return existingLicense
  }

  return db.license.create({
    data: {
      licenseKey: generateLicenseKey(),
      orderId: params.orderId,
      orderItemId: params.orderItemId,
      productId: params.productId,
      userId: params.userId,
    },
  })
}
