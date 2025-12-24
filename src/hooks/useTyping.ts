"use client"

import { useCallback, useRef, useEffect } from "react"

interface UseTypingOptions {
  onStartTyping: () => void
  onStopTyping: () => void
  debounceMs?: number
}

/**
 * Hook to handle typing indicator with debounce
 * Sends typing:start on first keypress, typing:stop after debounce period
 */
export function useTyping({
  onStartTyping,
  onStopTyping,
  debounceMs = 2000,
}: UseTypingOptions) {
  const isTypingRef = useRef(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTyping = useCallback(() => {
    // Start typing if not already
    if (!isTypingRef.current) {
      isTypingRef.current = true
      onStartTyping()
    }

    // Reset debounce timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Stop typing after debounce
    timeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      onStopTyping()
    }, debounceMs)
  }, [onStartTyping, onStopTyping, debounceMs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (isTypingRef.current) {
        onStopTyping()
      }
    }
  }, [onStopTyping])

  return { handleTyping }
}
