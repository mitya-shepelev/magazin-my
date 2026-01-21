"use client"

import { io, Socket } from "socket.io-client"
import type { ClientToServerEvents, ServerToClientEvents } from "./socket-types"

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"

let socket: TypedSocket | null = null
let connectionPromise: Promise<TypedSocket> | null = null
let currentToken: string | null = null

/**
 * Get fresh token from API
 */
async function getToken(): Promise<string> {
  const response = await fetch("/api/auth/ws-token", {
    method: "POST",
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error("Failed to get WebSocket token")
  }

  const { token } = await response.json()
  currentToken = token
  return token
}

/**
 * Get or create socket connection
 * Uses singleton pattern to ensure single connection per client
 */
export async function getSocket(): Promise<TypedSocket> {
  // Return existing connected socket
  if (socket?.connected) {
    return socket
  }

  // Return pending connection
  if (connectionPromise) {
    return connectionPromise
  }

  // Create new connection
  connectionPromise = createConnection()
  return connectionPromise
}

async function createConnection(retryCount = 0): Promise<TypedSocket> {
  try {
    // Get fresh WebSocket token
    const token = await getToken()

    // Create socket connection
    socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    }) as TypedSocket

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"))
      }, 10000)

      socket!.on("connect", () => {
        clearTimeout(timeout)
        console.log("[Socket] Connected:", socket!.id)
        resolve()
      })

      socket!.on("connect_error", (error) => {
        clearTimeout(timeout)
        console.error("[Socket] Connection error:", error.message)
        reject(error)
      })
    })

    // Setup reconnection handlers
    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason)
      if (reason === "io server disconnect") {
        // Server disconnected, need to reconnect manually
        connectionPromise = null
      }
    })

    // Handle token expiration - get new token and reconnect
    socket.on("connect_error", async (error) => {
      if (error.message === "Token expired" || error.message === "Invalid token") {
        console.log("[Socket] Token expired, refreshing...")
        connectionPromise = null
        socket?.disconnect()
        socket = null
        // Will reconnect with fresh token on next getSocket() call
      }
    })

    socket.on("error", (data) => {
      console.error("[Socket] Error:", data.message)
    })

    return socket
  } catch (error) {
    connectionPromise = null

    // Retry once with fresh token if token-related error
    if (retryCount === 0 && error instanceof Error &&
        (error.message.includes("Token") || error.message.includes("token"))) {
      console.log("[Socket] Retrying with fresh token...")
      return createConnection(1)
    }

    throw error
  }
}

/**
 * Disconnect socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
    connectionPromise = null
  }
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false
}

/**
 * Get current socket instance (may be null)
 */
export function getSocketInstance(): TypedSocket | null {
  return socket
}
