import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { normalizeDomain, recordLicenseEvent } from "@/lib/licenses"

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

async function auditLicenseActivation(params: {
  licenseId: string
  eventType: "ACTIVATION_SUCCESS" | "ACTIVATION_REJECTED"
  message: string
  domain?: string | null
  serverIp?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await recordLicenseEvent({
      licenseId: params.licenseId,
      eventType: params.eventType,
      actorType: "LICENSE_API",
      message: params.message,
      domain: params.domain,
      serverIp: params.serverIp,
      metadata: params.metadata,
    })
  } catch (error) {
    console.error("License audit event error:", error)
  }
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
      await auditLicenseActivation({
        licenseId: license.id,
        eventType: "ACTIVATION_REJECTED",
        message: "License activation rejected because license is not active",
        domain,
        serverIp,
        metadata: {
          status: license.status,
        },
      })

      return NextResponse.json(
        { valid: false, status: license.status, error: "License is not active" },
        { status: 403 }
      )
    }

    if (body.productId && body.productId !== license.productId) {
      await auditLicenseActivation({
        licenseId: license.id,
        eventType: "ACTIVATION_REJECTED",
        message: "License activation rejected because product does not match",
        domain,
        serverIp,
        metadata: {
          requestedProductId: body.productId,
          licenseProductId: license.productId,
        },
      })

      return NextResponse.json(
        { valid: false, error: "License does not belong to this product" },
        { status: 403 }
      )
    }

    if (license.domain && normalizeDomain(license.domain) !== domain) {
      await auditLicenseActivation({
        licenseId: license.id,
        eventType: "ACTIVATION_REJECTED",
        message: "License activation rejected because domain does not match",
        domain,
        serverIp,
        metadata: {
          boundDomain: license.domain,
        },
      })

      return NextResponse.json(
        { valid: false, error: "License is bound to another domain" },
        { status: 403 }
      )
    }

    if (license.serverIp && serverIp && license.serverIp !== serverIp) {
      await auditLicenseActivation({
        licenseId: license.id,
        eventType: "ACTIVATION_REJECTED",
        message: "License activation rejected because server IP does not match",
        domain,
        serverIp,
        metadata: {
          boundServerIp: license.serverIp,
        },
      })

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

    await auditLicenseActivation({
      licenseId: updatedLicense.id,
      eventType: "ACTIVATION_SUCCESS",
      message: isFirstActivation
        ? "License activated and bound to domain/IP"
        : "License activation check passed",
      domain: updatedLicense.domain,
      serverIp: updatedLicense.serverIp,
      metadata: {
        requestedVersion: body.version || null,
        productVersion: updatedLicense.product.version,
        firstActivation: isFirstActivation,
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
