"use client"

import { createContext, useContext, ReactNode } from "react"
import { useNotifications } from "@/hooks/useNotifications"

interface NotificationContextValue {
  unreadCount: number
  unreadByOrder: Record<string, number>
  hasPermission: boolean
  requestPermission: () => Promise<boolean>
  playSound: () => void
  refreshUnread: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

interface NotificationProviderProps {
  children: ReactNode
  currentUserId?: string
}

export function NotificationProvider({
  children,
  currentUserId,
}: NotificationProviderProps) {
  const notifications = useNotifications({
    currentUserId,
    enableSound: true,
    enableBrowserNotifications: true,
  })

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    )
  }
  return context
}
