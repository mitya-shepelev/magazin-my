"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { useSession } from "next-auth/react"
import {
  getSocket,
  disconnectSocket,
  isConnected,
  type TypedSocket,
} from "@/lib/socket"

interface SocketContextType {
  socket: TypedSocket | null
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  reconnect: () => Promise<void>
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  reconnect: async () => {},
})

export function useSocketContext() {
  return useContext(SocketContext)
}

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession()
  const [socket, setSocket] = useState<TypedSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (connecting || connected) return

    setConnecting(true)
    setError(null)

    try {
      const sock = await getSocket()
      setSocket(sock)
      setConnected(true)

      // Listen for connection state changes
      sock.on("connect", () => {
        setConnected(true)
        setError(null)
      })

      sock.on("disconnect", () => {
        setConnected(false)
      })

      sock.on("connect_error", (err) => {
        setError(err.message)
        setConnected(false)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
      setConnected(false)
    } finally {
      setConnecting(false)
    }
  }, [connecting, connected])

  const reconnect = useCallback(async () => {
    disconnectSocket()
    setSocket(null)
    setConnected(false)
    await connect()
  }, [connect])

  // Connect when user is authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user && !connected && !connecting) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user]) // Remove 'connect' and volatile states from deps to prevent loops

  // Disconnect on logout
  useEffect(() => {
    if (status === "unauthenticated") {
      disconnectSocket()
      setSocket(null)
      setConnected(false)
    }
  }, [status])

  // Cleanup on window unload
  useEffect(() => {
    const handleUnload = () => {
      disconnectSocket()
    }

    window.addEventListener("beforeunload", handleUnload)
    return () => {
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected: connected,
        isConnecting: connecting,
        error,
        reconnect,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
