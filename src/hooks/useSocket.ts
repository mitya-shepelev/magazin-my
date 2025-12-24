"use client"

import { useSocketContext } from "@/providers/SocketProvider"

/**
 * Hook to access socket connection state
 */
export function useSocket() {
  const context = useSocketContext()

  return {
    socket: context.socket,
    isConnected: context.isConnected,
    isConnecting: context.isConnecting,
    error: context.error,
    reconnect: context.reconnect,
  }
}
