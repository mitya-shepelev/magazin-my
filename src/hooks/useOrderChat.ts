"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSocketContext } from "@/providers/SocketProvider"
import type { MessagePayload, TypingPayload, PresencePayload, ReadPayload } from "@/lib/socket-types"

interface UseOrderChatOptions {
  orderId: string
  initialMessages?: MessagePayload[]
  currentUserId?: string // Needed to know which messages to mark as read
}

interface UseOrderChatReturn {
  messages: MessagePayload[]
  isTyping: boolean
  typingUserId: string | null
  onlineUsers: string[]
  isConnected: boolean
  addMessage: (message: MessagePayload) => void
  startTyping: () => void
  stopTyping: () => void
  markAsRead: (messageId: string) => void
  markMessagesAsRead: (messageIds: string[]) => Promise<void>
}

export function useOrderChat({
  orderId,
  initialMessages = [],
  currentUserId,
}: UseOrderChatOptions): UseOrderChatReturn {
  const { socket, isConnected } = useSocketContext()
  const [messages, setMessages] = useState<MessagePayload[]>(initialMessages)
  const [typingUserId, setTypingUserId] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const joinedRef = useRef(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const markedAsReadRef = useRef<Set<string>>(new Set())

  // Join room when connected
  useEffect(() => {
    if (!socket || !isConnected || joinedRef.current) return

    socket.emit("join:order", { orderId })
    joinedRef.current = true

    return () => {
      if (joinedRef.current) {
        socket.emit("leave:order", { orderId })
        joinedRef.current = false
      }
    }
  }, [socket, isConnected, orderId])

  // Listen for new messages
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (message: MessagePayload) => {
      if (message.orderId === orderId) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) {
            return prev
          }
          return [...prev, message]
        })
      }
    }

    socket.on("message:new", handleNewMessage)

    return () => {
      socket.off("message:new", handleNewMessage)
    }
  }, [socket, orderId])

  // Listen for typing events
  useEffect(() => {
    if (!socket) return

    const handleTyping = (data: TypingPayload) => {
      if (data.isTyping) {
        setTypingUserId(data.userId)
        // Clear typing indicator after 3 seconds
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUserId(null)
        }, 3000)
      } else {
        setTypingUserId(null)
      }
    }

    socket.on("typing", handleTyping)

    return () => {
      socket.off("typing", handleTyping)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [socket])

  // Listen for presence events
  useEffect(() => {
    if (!socket) return

    const handleOnline = (data: PresencePayload) => {
      if (data.orderId === orderId) {
        setOnlineUsers((prev) => {
          if (prev.includes(data.userId)) return prev
          return [...prev, data.userId]
        })
      }
    }

    const handleOffline = (data: PresencePayload) => {
      if (data.orderId === orderId) {
        setOnlineUsers((prev) => prev.filter((id) => id !== data.userId))
      }
    }

    socket.on("user:online", handleOnline)
    socket.on("user:offline", handleOffline)

    return () => {
      socket.off("user:online", handleOnline)
      socket.off("user:offline", handleOffline)
    }
  }, [socket, orderId])

  // Listen for read events
  useEffect(() => {
    if (!socket) return

    const handleRead = (data: ReadPayload) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (data.messageIds.includes(msg.id)) {
            return {
              ...msg,
              status: "READ" as const,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          }
          return msg
        })
      )
    }

    socket.on("message:read", handleRead)

    return () => {
      socket.off("message:read", handleRead)
    }
  }, [socket])

  // Mark unread messages as read when component mounts or new messages arrive
  useEffect(() => {
    if (!currentUserId) return

    // Find messages from other users that haven't been read yet
    const unreadMessageIds = messages
      .filter(
        (msg) =>
          msg.userId !== currentUserId &&
          msg.status !== "READ" &&
          !markedAsReadRef.current.has(msg.id)
      )
      .map((msg) => msg.id)

    if (unreadMessageIds.length > 0) {
      // Mark as read via API
      fetch(`/api/orders/${orderId}/messages/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unreadMessageIds }),
      }).then(() => {
        // Add to tracked set to avoid duplicate calls
        unreadMessageIds.forEach((id) => markedAsReadRef.current.add(id))
      }).catch(console.error)
    }
  }, [messages, currentUserId, orderId])

  // Add message to local state (for optimistic updates)
  const addMessage = useCallback((message: MessagePayload) => {
    setMessages((prev) => [...prev, message])
  }, [])

  // Typing indicators
  const startTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("typing:start", { orderId })
    }
  }, [socket, isConnected, orderId])

  const stopTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("typing:stop", { orderId })
    }
  }, [socket, isConnected, orderId])

  // Mark message as read (via WebSocket)
  const markAsRead = useCallback(
    (messageId: string) => {
      if (socket && isConnected) {
        socket.emit("message:read", { orderId, messageId })
      }
    },
    [socket, isConnected, orderId]
  )

  // Mark messages as read (via API)
  const markMessagesAsRead = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) return

      try {
        await fetch(`/api/orders/${orderId}/messages/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageIds }),
        })
        messageIds.forEach((id) => markedAsReadRef.current.add(id))
      } catch (error) {
        console.error("Failed to mark messages as read:", error)
      }
    },
    [orderId]
  )

  return {
    messages,
    isTyping: typingUserId !== null,
    typingUserId,
    onlineUsers,
    isConnected,
    addMessage,
    startTyping,
    stopTyping,
    markAsRead,
    markMessagesAsRead,
  }
}
