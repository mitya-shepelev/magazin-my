"use client"

import { useEffect, useState } from "react"
import { useSocketContext } from "@/providers/SocketProvider"
import type { PresencePayload } from "@/lib/socket-types"

interface OnlineOrder {
  orderId: string
  userId: string
}

/**
 * Hook for admin to track online users across all orders
 * Listens to admin:orders room for presence updates
 */
export function usePresence() {
  const { socket, isConnected } = useSocketContext()
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([])

  useEffect(() => {
    if (!socket || !isConnected) return

    const handleOnline = (data: PresencePayload) => {
      setOnlineOrders((prev) => {
        // Avoid duplicates
        if (prev.some((o) => o.orderId === data.orderId && o.userId === data.userId)) {
          return prev
        }
        return [...prev, { orderId: data.orderId, userId: data.userId }]
      })
    }

    const handleOffline = (data: PresencePayload) => {
      setOnlineOrders((prev) =>
        prev.filter(
          (o) => !(o.orderId === data.orderId && o.userId === data.userId)
        )
      )
    }

    socket.on("user:online", handleOnline)
    socket.on("user:offline", handleOffline)

    return () => {
      socket.off("user:online", handleOnline)
      socket.off("user:offline", handleOffline)
    }
  }, [socket, isConnected])

  /**
   * Check if any user is online in a specific order
   */
  const isOrderOnline = (orderId: string): boolean => {
    return onlineOrders.some((o) => o.orderId === orderId)
  }

  /**
   * Get online users for a specific order
   */
  const getOnlineUsers = (orderId: string): string[] => {
    return onlineOrders
      .filter((o) => o.orderId === orderId)
      .map((o) => o.userId)
  }

  return {
    onlineOrders,
    isOrderOnline,
    getOnlineUsers,
  }
}
