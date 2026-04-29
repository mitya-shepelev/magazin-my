import { randomUUID } from "crypto"
import { env } from "@/lib/env"

export type PaymentProvider = "mock" | "rollypay"

export interface CreateCheckoutPaymentParams {
  amount: number
  orderId: string
  orderNumber: string
  description: string
  successUrl: string
  failUrl: string
  customerEmail: string
  customerId: string
}

export interface CheckoutPayment {
  id: string
  provider: PaymentProvider
  status: string
  paymentUrl: string
}

interface RollyPayPaymentResponse {
  payment_id?: string
  status?: string
  pay_url?: string
}

export function getPaymentProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER
}

export async function createCheckoutPayment(
  params: CreateCheckoutPaymentParams
): Promise<CheckoutPayment> {
  const provider = getPaymentProvider()

  if (provider === "mock") {
    return createMockPayment(params)
  }

  return createRollyPayPayment(params)
}

function createMockPayment(params: CreateCheckoutPaymentParams): CheckoutPayment {
  const appUrl = env.NEXT_PUBLIC_APP_URL
  const paymentUrl = new URL("/api/payment/mock/success", appUrl)
  paymentUrl.searchParams.set("orderId", params.orderId)

  return {
    id: `mock_${params.orderId}`,
    provider: "mock",
    status: "created",
    paymentUrl: paymentUrl.toString(),
  }
}

async function createRollyPayPayment(
  params: CreateCheckoutPaymentParams
): Promise<CheckoutPayment> {
  const apiKey = env.ROLLYPAY_API_KEY
  const apiUrl = env.ROLLYPAY_API_URL
  const currency = env.PAYMENT_CURRENCY

  if (!apiKey) {
    throw new Error("RollyPay API key is not configured")
  }

  const response = await fetch(`${apiUrl}/api/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      "X-Nonce": randomUUID(),
    },
    body: JSON.stringify({
      amount: params.amount.toFixed(2),
      payment_currency: currency,
      order_id: params.orderId,
      description: params.description,
      customer_id: params.customerId,
      success_redirect_url: params.successUrl,
      fail_redirect_url: params.failUrl,
      metadata: {
        order_number: params.orderNumber,
        customer_email: params.customerEmail,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("RollyPay payment creation failed:", response.status, errorText)
    throw new Error("Failed to create RollyPay payment")
  }

  const payment = (await response.json()) as RollyPayPaymentResponse

  if (!payment.payment_id || !payment.pay_url) {
    throw new Error("RollyPay response does not include payment_id or pay_url")
  }

  return {
    id: payment.payment_id,
    provider: "rollypay",
    status: payment.status || "created",
    paymentUrl: payment.pay_url,
  }
}
