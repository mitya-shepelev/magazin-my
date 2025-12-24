import { v4 as uuidv4 } from "uuid"

const YOOKASSA_API_URL = "https://api.yookassa.ru/v3"

interface CreatePaymentParams {
  amount: number
  description: string
  orderId: string
  returnUrl: string
  customerEmail: string
}

interface YooKassaPayment {
  id: string
  status: string
  confirmation?: {
    type: string
    confirmation_url: string
  }
}

export async function createPayment({
  amount,
  description,
  orderId,
  returnUrl,
  customerEmail,
}: CreatePaymentParams): Promise<YooKassaPayment> {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY

  if (!shopId || !secretKey) {
    throw new Error("YooKassa credentials not configured")
  }

  const idempotenceKey = uuidv4()
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")

  const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${auth}`,
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: amount.toFixed(2),
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: returnUrl,
      },
      description,
      metadata: {
        order_id: orderId,
      },
      receipt: {
        customer: {
          email: customerEmail,
        },
        items: [
          {
            description: description.slice(0, 128),
            quantity: "1",
            amount: {
              value: amount.toFixed(2),
              currency: "RUB",
            },
            vat_code: 1, // НДС не облагается
            payment_mode: "full_payment",
            payment_subject: "service",
          },
        ],
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error("YooKassa error:", error)
    throw new Error("Failed to create payment")
  }

  return response.json()
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY

  if (!shopId || !secretKey) {
    throw new Error("YooKassa credentials not configured")
  }

  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")

  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    headers: {
      "Authorization": `Basic ${auth}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to get payment")
  }

  return response.json()
}
