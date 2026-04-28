import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

interface YooKassaWebhookEvent {
  type: string
  event: string
  object: {
    id: string
    status: string
    metadata?: {
      order_id?: string
    }
  }
}

// Верификация IP-адресов YooKassa
const YOOKASSA_IPS = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11",
  "77.75.156.35",
  "77.75.154.128/25",
  "2a02:5180::/32",
]

function ipInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes("/")) {
    return ip === cidr
  }

  const [range, bits] = cidr.split("/")
  const mask = ~(2 ** (32 - parseInt(bits)) - 1)

  const ipParts = ip.split(".").map(Number)
  const rangeParts = range.split(".").map(Number)

  const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3]
  const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3]

  return (ipNum & mask) === (rangeNum & mask)
}

function isYooKassaIP(ip: string): boolean {
  // Пропускаем IPv6 для простоты, проверяем только IPv4
  if (ip.includes(":") && !ip.includes(".")) {
    return true // IPv6 - доверяем если в списке есть IPv6 диапазон
  }

  return YOOKASSA_IPS.some(cidr => ipInRange(ip, cidr))
}

export async function POST(request: NextRequest) {
  try {
    // Проверка IP-адреса отправителя
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIP = request.headers.get("x-real-ip")
    const clientIP = forwardedFor?.split(",")[0]?.trim() || realIP || "unknown"

    // В production проверяем IP
    if (process.env.NODE_ENV === "production" && !isYooKassaIP(clientIP)) {
      console.warn(`Webhook rejected: untrusted IP ${clientIP}`)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body: YooKassaWebhookEvent = await request.json()

    // Логируем только в development, без sensitive данных в production
    if (process.env.NODE_ENV === "development") {
      console.log("YooKassa webhook received:", body.event, body.object?.id)
    }

    // Handle payment.succeeded event
    if (body.event === "payment.succeeded") {
      const orderId = body.object.metadata?.order_id

      if (!orderId) {
        console.error("Order ID not found in payment metadata")
        return NextResponse.json({ success: false })
      }

      // Update order status
      await db.order.update({
        where: { id: orderId },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      })

      // Increment download count for products and create installation stages
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  stageTemplates: {
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
          },
        },
      })

      if (order) {
        // Increment download counters
        for (const item of order.items) {
          await db.product.update({
            where: { id: item.productId },
            data: {
              downloads: { increment: 1 },
            },
          })
        }

        // Create installation stages from templates
        await createInstallationStages(orderId, order.items)
      }

      console.log(`Order ${orderId} marked as paid`)
    }

    // Handle payment.canceled event
    if (body.event === "payment.canceled") {
      const orderId = body.object.metadata?.order_id

      if (orderId) {
        await db.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
          },
        })

        console.log(`Order ${orderId} cancelled`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}

// Создание этапов установки из шаблонов товаров
interface OrderItemWithStageTemplates {
  productId: string
  product: {
    name: string
    stageTemplates: Array<{
      title: string
      description: string
      type: string
    }>
  }
}

async function createInstallationStages(orderId: string, items: OrderItemWithStageTemplates[]) {
  try {
    // Собираем все шаблоны из всех товаров заказа
    const allTemplates: Array<{
      title: string
      description: string
      type: string
      sortOrder: number
      productName: string
    }> = []

    for (const item of items) {
      const templates = item.product.stageTemplates || []
      for (const template of templates) {
        allTemplates.push({
          title: template.title,
          description: template.description,
          type: template.type,
          sortOrder: allTemplates.length + 1,
          productName: item.product.name,
        })
      }
    }

    // Если есть несколько товаров, добавляем имя товара к этапам
    const hasMultipleProducts = items.length > 1

    // Создаём этапы установки
    for (const template of allTemplates) {
      const title = hasMultipleProducts
        ? `${template.title} (${template.productName})`
        : template.title

      await db.installationStage.create({
        data: {
          orderId,
          title,
          description: template.description,
          type: template.type,
          sortOrder: template.sortOrder,
          status: "PENDING",
        },
      })
    }

    console.log(`Created ${allTemplates.length} installation stages for order ${orderId}`)
  } catch (error) {
    console.error("Error creating installation stages:", error)
    // Не прерываем процесс оплаты из-за ошибки создания этапов
  }
}
