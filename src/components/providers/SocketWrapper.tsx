"use client"

import { SocketProvider } from "@/providers/SocketProvider"
import type { ReactNode } from "react"

interface SocketWrapperProps {
  children: ReactNode
}

export function SocketWrapper({ children }: SocketWrapperProps) {
  return <SocketProvider>{children}</SocketProvider>
}
