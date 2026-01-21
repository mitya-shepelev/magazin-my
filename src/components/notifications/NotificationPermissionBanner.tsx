"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, X } from "lucide-react"
import { useNotificationContext } from "@/providers/NotificationProvider"

export function NotificationPermissionBanner() {
  const { hasPermission, requestPermission } = useNotificationContext()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported(typeof window !== "undefined" && "Notification" in window)
  }, [])

  // Don't show if already has permission, dismissed, or not supported
  if (hasPermission || isDismissed || !isSupported) {
    return null
  }

  // Don't show if permission was denied (can't ask again)
  if (typeof window !== "undefined" && Notification.permission === "denied") {
    return null
  }

  const handleEnable = async () => {
    const granted = await requestPermission()
    if (!granted) {
      setIsDismissed(true)
    }
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-blue-900 dark:text-blue-100">
            Включите уведомления
          </h4>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Получайте мгновенные уведомления о новых сообщениях, даже когда вкладка неактивна
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleEnable}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Bell className="h-4 w-4 mr-2" />
              Включить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            >
              Позже
            </Button>
          </div>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
