import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const JWT_SECRET = process.env.WS_JWT_SECRET || "development-secret"
const TOKEN_EXPIRY = 300 // 5 minutes

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const role = session.user.role as "CUSTOMER" | "ADMIN"

    // For customers, get their allowed orders
    let allowedOrders: string[] = []

    if (role === "CUSTOMER") {
      const orders = await db.order.findMany({
        where: {
          userId,
          status: "PAID",
        },
        select: { id: true },
      })
      allowedOrders = orders.map((o) => o.id)
    }

    // Generate short-lived JWT token
    const token = jwt.sign(
      {
        userId,
        role,
        allowedOrders,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    )

    return NextResponse.json({
      token,
      expiresIn: TOKEN_EXPIRY,
    })
  } catch (error) {
    console.error("WS token generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    )
  }
}
