"use client"

import { SocketProvider } from "@/providers/SocketProvider"
import { NotificationProvider } from "@/providers/NotificationProvider"
import type { ReactNode } from "react"

interface SocketWrapperProps {
  children: ReactNode
  currentUserId?: string
}

export function SocketWrapper({ children, currentUserId }: SocketWrapperProps) {
  return (
    <SocketProvider>
      <NotificationProvider currentUserId={currentUserId}>
        {children}
      </NotificationProvider>
    </SocketProvider>
  )
}
