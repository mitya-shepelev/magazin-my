import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizeDomain } from "@/lib/licenses"

interface ActivateLicenseBody {
  licenseKey?: string
  productId?: string
  domain?: string
  serverIp?: string
  version?: string
}

function getRequestIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  return forwardedFor?.split(",")[0]?.trim() || realIp || null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ActivateLicenseBody
    const licenseKey = body.licenseKey?.trim()
    const domain = body.domain ? normalizeDomain(body.domain) : ""
    const serverIp = body.serverIp?.trim() || getRequestIp(request)

    if (!licenseKey || !domain) {
      return NextResponse.json(
        { valid: false, error: "licenseKey and domain are required" },
        { status: 400 }
      )
    }

    const license = await db.license.findUnique({
      where: { licenseKey },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            version: true,
          },
        },
      },
    })

    if (!license) {
      return NextResponse.json(
        { valid: false, error: "License not found" },
        { status: 404 }
      )
    }

    if (license.status !== "ACTIVE") {
      return NextResponse.json(
        { valid: false, status: license.status, error: "License is not active" },
        { status: 403 }
      )
    }

    if (body.productId && body.productId !== license.productId) {
      return NextResponse.json(
        { valid: false, error: "License does not belong to this product" },
        { status: 403 }
      )
    }

    if (license.domain && normalizeDomain(license.domain) !== domain) {
      return NextResponse.json(
        { valid: false, error: "License is bound to another domain" },
        { status: 403 }
      )
    }

    if (license.serverIp && serverIp && license.serverIp !== serverIp) {
      return NextResponse.json(
        { valid: false, error: "License is bound to another server IP" },
        { status: 403 }
      )
    }

    const isFirstActivation = !license.domain
    const updatedLicense = await db.license.update({
      where: { id: license.id },
      data: {
        domain: license.domain || domain,
        serverIp: license.serverIp || serverIp,
        activatedAt: license.activatedAt || new Date(),
        lastCheckAt: new Date(),
        activationCount: isFirstActivation
          ? { increment: 1 }
          : license.activationCount,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            version: true,
          },
        },
      },
    })

    return NextResponse.json({
      valid: true,
      status: updatedLicense.status,
      license: {
        product: updatedLicense.product,
        domain: updatedLicense.domain,
        serverIp: updatedLicense.serverIp,
        activationCount: updatedLicense.activationCount,
        maxActivations: updatedLicense.maxActivations,
        activatedAt: updatedLicense.activatedAt,
        lastCheckAt: updatedLicense.lastCheckAt,
      },
    })
  } catch (error) {
    console.error("License activation error:", error)
    return NextResponse.json(
      { valid: false, error: "License activation failed" },
      { status: 500 }
    )
  }
}
