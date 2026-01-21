"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface NotificationBadgeProps {
  count: number
  className?: string
  showZero?: boolean
  max?: number
}

export function NotificationBadge({
  count,
  className,
  showZero = false,
  max = 99,
}: NotificationBadgeProps) {
  if (count === 0 && !showZero) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <Badge
      variant="destructive"
      className={cn(
        "absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-xs font-bold rounded-full animate-in zoom-in-50 duration-200",
        className
      )}
    >
      {displayCount}
    </Badge>
  )
}
