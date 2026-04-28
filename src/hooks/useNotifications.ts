"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSocketContext } from "@/providers/SocketProvider"
import type { MessagePayload } from "@/lib/socket-types"

interface UnreadData {
  total: number
  byOrder: Record<string, number>
}

interface UseNotificationsOptions {
  currentUserId?: string
  enableSound?: boolean
  enableBrowserNotifications?: boolean
}

interface UseNotificationsReturn {
  unreadCount: number
  unreadByOrder: Record<string, number>
  hasPermission: boolean
  requestPermission: () => Promise<boolean>
  playSound: () => void
  refreshUnread: () => Promise<void>
}

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = "/sounds/notification.mp3"

export function useNotifications({
  currentUserId,
  enableSound = true,
  enableBrowserNotifications = true,
}: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { socket, isConnected } = useSocketContext()
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadByOrder, setUnreadByOrder] = useState<Record<string, number>>({})
  const [hasPermission, setHasPermission] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined" && enableSound) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL)
      audioRef.current.volume = 0.5
    }
  }, [enableSound])

  // Check notification permission on mount
  useEffect(() => {
    const permissionCheck = window.setTimeout(() => {
      if ("Notification" in window) {
        setHasPermission(Notification.permission === "granted")
      }
    }, 0)

    return () => window.clearTimeout(permissionCheck)
  }, [])

  // Fetch initial unread count
  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread")
      if (res.ok) {
        const data: UnreadData = await res.json()
        setUnreadCount(data.total)
        setUnreadByOrder(data.byOrder)
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error)
    }
  }, [])

  useEffect(() => {
    const unreadRefresh = window.setTimeout(() => {
      void refreshUnread()
    }, 0)

    return () => window.clearTimeout(unreadRefresh)
  }, [refreshUnread])

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current && enableSound) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors
      })
    }
  }, [enableSound])

  // Request browser notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false
    }

    if (Notification.permission === "granted") {
      setHasPermission(true)
      return true
    }

    if (Notification.permission === "denied") {
      return false
    }

    const permission = await Notification.requestPermission()
    const granted = permission === "granted"
    setHasPermission(granted)
    return granted
  }, [])

  // Show browser notification
  const showBrowserNotification = useCallback(
    (title: string, body: string, orderId?: string) => {
      if (!hasPermission || !enableBrowserNotifications) return

      const notification = new Notification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: orderId || "general",
        requireInteraction: false,
      })

      notification.onclick = () => {
        window.focus()
        if (orderId) {
          // Navigate to order
          window.location.href = `/cabinet/orders/${orderId}`
        }
        notification.close()
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000)
    },
    [hasPermission, enableBrowserNotifications]
  )

  // Listen for new messages
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleNewMessage = (message: MessagePayload) => {
      // Only notify for messages from others
      if (message.userId === currentUserId) return

      // Update unread count
      setUnreadCount((prev) => prev + 1)
      setUnreadByOrder((prev) => ({
        ...prev,
        [message.orderId]: (prev[message.orderId] || 0) + 1,
      }))

      // Play sound
      playSound()

      // Show browser notification if page is not focused
      if (document.hidden) {
        const senderName = message.user.name || "Новое сообщение"
        showBrowserNotification(
          senderName,
          message.content.substring(0, 100),
          message.orderId
        )
      }
    }

    socket.on("message:new", handleNewMessage)

    return () => {
      socket.off("message:new", handleNewMessage)
    }
  }, [socket, isConnected, currentUserId, playSound, showBrowserNotification])

  // Listen for read events (to decrease count)
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleRead = (data: { messageIds: string[]; readBy: string }) => {
      // If someone else read our messages, decrease count
      if (data.readBy !== currentUserId) {
        // Refresh to get accurate count
        refreshUnread()
      }
    }

    socket.on("message:read", handleRead)

    return () => {
      socket.off("message:read", handleRead)
    }
  }, [socket, isConnected, currentUserId, refreshUnread])

  return {
    unreadCount,
    unreadByOrder,
    hasPermission,
    requestPermission,
    playSound,
    refreshUnread,
  }
}
