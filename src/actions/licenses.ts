"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateLicenseKey, normalizeDomain } from "@/lib/licenses"

const LICENSE_STATUSES = new Set(["ACTIVE", "SUSPENDED", "REVOKED"])

async function requireAdmin() {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required")
  }

  return session
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

async function revalidateLicenseViews(orderId?: string) {
  revalidatePath("/admin/licenses")
  revalidatePath("/cabinet/downloads")

  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath(`/cabinet/orders/${orderId}`)
  }
}

export async function updateLicenseBinding(formData: FormData) {
  await requireAdmin()

  const licenseId = readString(formData, "licenseId")
  const domain = normalizeDomain(readString(formData, "domain"))
  const serverIp = readString(formData, "serverIp")

  if (!licenseId) {
    throw new Error("License id is required")
  }

  const now = new Date()
  const isBound = Boolean(domain || serverIp)
  const license = await db.license.update({
    where: { id: licenseId },
    data: {
      domain: domain || null,
      serverIp: serverIp || null,
      activatedAt: isBound ? now : null,
      lastCheckAt: isBound ? now : null,
      activationCount: isBound ? 1 : 0,
    },
    select: { orderId: true },
  })

  await revalidateLicenseViews(license.orderId)
}

export async function resetLicenseBinding(formData: FormData) {
  await requireAdmin()

  const licenseId = readString(formData, "licenseId")

  if (!licenseId) {
    throw new Error("License id is required")
  }

  const license = await db.license.update({
    where: { id: licenseId },
    data: {
      domain: null,
      serverIp: null,
      activatedAt: null,
      lastCheckAt: null,
      activationCount: 0,
    },
    select: { orderId: true },
  })

  await revalidateLicenseViews(license.orderId)
}

export async function reissueLicenseKey(formData: FormData) {
  await requireAdmin()

  const licenseId = readString(formData, "licenseId")

  if (!licenseId) {
    throw new Error("License id is required")
  }

  const license = await db.license.update({
    where: { id: licenseId },
    data: {
      licenseKey: generateLicenseKey(),
      status: "ACTIVE",
      domain: null,
      serverIp: null,
      activatedAt: null,
      lastCheckAt: null,
      activationCount: 0,
    },
    select: { orderId: true },
  })

  await revalidateLicenseViews(license.orderId)
}

export async function updateLicenseStatus(formData: FormData) {
  await requireAdmin()

  const licenseId = readString(formData, "licenseId")
  const status = readString(formData, "status").toUpperCase()

  if (!licenseId) {
    throw new Error("License id is required")
  }

  if (!LICENSE_STATUSES.has(status)) {
    throw new Error("Invalid license status")
  }

  const license = await db.license.update({
    where: { id: licenseId },
    data: { status },
    select: { orderId: true },
  })

  await revalidateLicenseViews(license.orderId)
}
