"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { generateLicenseKey, normalizeDomain, recordLicenseEvent } from "@/lib/licenses"

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
  const session = await requireAdmin()

  const licenseId = readString(formData, "licenseId")
  const domain = normalizeDomain(readString(formData, "domain"))
  const serverIp = readString(formData, "serverIp")

  if (!licenseId) {
    throw new Error("License id is required")
  }

  const previousLicense = await db.license.findUnique({
    where: { id: licenseId },
    select: {
      domain: true,
      serverIp: true,
    },
  })

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

  await recordLicenseEvent({
    licenseId,
    eventType: "BINDING_UPDATED",
    actorType: "ADMIN",
    actorId: session.user.id,
    message: "Admin updated license domain/IP binding",
    domain: domain || null,
    serverIp: serverIp || null,
    metadata: {
      previousDomain: previousLicense?.domain || null,
      previousServerIp: previousLicense?.serverIp || null,
    },
  })

  await revalidateLicenseViews(license.orderId)
}

export async function resetLicenseBinding(formData: FormData) {
  const session = await requireAdmin()

  const licenseId = readString(formData, "licenseId")

  if (!licenseId) {
    throw new Error("License id is required")
  }

  const previousLicense = await db.license.findUnique({
    where: { id: licenseId },
    select: {
      domain: true,
      serverIp: true,
      activationCount: true,
    },
  })

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

  await recordLicenseEvent({
    licenseId,
    eventType: "BINDING_RESET",
    actorType: "ADMIN",
    actorId: session.user.id,
    message: "Admin reset license domain/IP binding",
    domain: previousLicense?.domain || null,
    serverIp: previousLicense?.serverIp || null,
    metadata: {
      previousActivationCount: previousLicense?.activationCount || 0,
    },
  })

  await revalidateLicenseViews(license.orderId)
}

export async function reissueLicenseKey(formData: FormData) {
  const session = await requireAdmin()

  const licenseId = readString(formData, "licenseId")

  if (!licenseId) {
    throw new Error("License id is required")
  }

  const previousLicense = await db.license.findUnique({
    where: { id: licenseId },
    select: {
      licenseKey: true,
      domain: true,
      serverIp: true,
    },
  })

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

  await recordLicenseEvent({
    licenseId,
    eventType: "KEY_REISSUED",
    actorType: "ADMIN",
    actorId: session.user.id,
    message: "Admin reissued license key and reset binding",
    domain: previousLicense?.domain || null,
    serverIp: previousLicense?.serverIp || null,
    metadata: {
      previousKeySuffix: previousLicense?.licenseKey.slice(-4) || null,
    },
  })

  await revalidateLicenseViews(license.orderId)
}

export async function updateLicenseStatus(formData: FormData) {
  const session = await requireAdmin()

  const licenseId = readString(formData, "licenseId")
  const status = readString(formData, "status").toUpperCase()

  if (!licenseId) {
    throw new Error("License id is required")
  }

  if (!LICENSE_STATUSES.has(status)) {
    throw new Error("Invalid license status")
  }

  const previousLicense = await db.license.findUnique({
    where: { id: licenseId },
    select: {
      status: true,
      domain: true,
      serverIp: true,
    },
  })

  const license = await db.license.update({
    where: { id: licenseId },
    data: { status },
    select: { orderId: true },
  })

  await recordLicenseEvent({
    licenseId,
    eventType: "STATUS_CHANGED",
    actorType: "ADMIN",
    actorId: session.user.id,
    message: `Admin changed license status to ${status}`,
    domain: previousLicense?.domain || null,
    serverIp: previousLicense?.serverIp || null,
    metadata: {
      previousStatus: previousLicense?.status || null,
      nextStatus: status,
    },
  })

  await revalidateLicenseViews(license.orderId)
}
