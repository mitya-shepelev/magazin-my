"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  MessageSquare,
  Send,
  Loader2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X,
  Headphones,
  Circle,
  Check,
  CheckCheck,
} from "lucide-react"
import { NotificationPermissionBanner } from "@/components/notifications/NotificationPermissionBanner"
import { toast } from "sonner"
import { useOrderChat } from "@/hooks/useOrderChat"
import { useTyping } from "@/hooks/useTyping"
import type { MessagePayload } from "@/lib/socket-types"

interface Message {
  id: string
  content: string
  files: string | null
  isRead: boolean
  status: string
  deliveredAt: Date | null
  readAt: Date | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    role: string
  }
}

interface ClientOrderChatProps {
  orderId: string
  messages: Message[]
  currentUserId: string
}

interface FileInfo {
  name: string
  url: string
  type: string
}

// Convert server message to socket payload format
function convertToPayload(msg: Message): MessagePayload {
  return {
    id: msg.id,
    orderId: "",
    userId: msg.user.id,
    content: msg.content,
    files: msg.files ? JSON.parse(msg.files) : [],
    isRead: msg.isRead,
    status: (msg.status || "SENT") as "SENT" | "DELIVERED" | "READ",
    deliveredAt: msg.deliveredAt ? new Date(msg.deliveredAt).toISOString() : null,
    readAt: msg.readAt ? new Date(msg.readAt).toISOString() : null,
    createdAt: new Date(msg.createdAt).toISOString(),
    user: msg.user,
  }
}

export function ClientOrderChat({ orderId, messages: initialMessages, currentUserId }: ClientOrderChatProps) {
  // Convert initial messages to payload format
  const initialPayloads = initialMessages.map(convertToPayload)

  const {
    messages,
    isTyping,
    onlineUsers,
    isConnected,
    startTyping,
    stopTyping,
  } = useOrderChat({ orderId, initialMessages: initialPayloads, currentUserId })

  const [messageText, setMessageText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Typing handler with debounce
  const { handleTyping } = useTyping({
    onStartTyping: startTyping,
    onStopTyping: stopTyping,
  })

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    const content = messageText.trim()
    if (!content && files.length === 0) return

    setIsSending(true)
    stopTyping()

    try {
      // Upload files first
      const uploadedFiles: FileInfo[] = []
      if (files.length > 0) {
        setIsUploading(true)
        for (const file of files) {
          const formData = new FormData()
          formData.append("file", file)

          const uploadRes = await fetch(`/api/orders/${orderId}/upload`, {
            method: "POST",
            body: formData,
          })

          if (!uploadRes.ok) throw new Error("Failed to upload")

          const uploadData = await uploadRes.json()
          uploadedFiles.push({
            name: file.name,
            url: uploadData.url,
            type: file.type,
          })
        }
        setIsUploading(false)
      }

      // Send message via REST API
      // Real-time delivery happens via WebSocket from server
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content || "Файл",
          files: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to send")
      }

      setMessageText("")
      setFiles([])
      // No router.refresh() needed - message arrives via WebSocket
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка отправки сообщения"
      toast.error(message)
    } finally {
      setIsSending(false)
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    const maxSize = 10 * 1024 * 1024 // 10MB

    const validFiles = selectedFiles.filter((file) => {
      if (file.size > maxSize) {
        toast.error(`Файл ${file.name} слишком большой (макс. 10MB)`)
        return false
      }
      return true
    })

    setFiles((prev) => [...prev, ...validFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value)
    handleTyping()
  }

  // Check if admin is online
  const isAdminOnline = onlineUsers.some((userId) => userId !== currentUserId)

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5" />
            Чат с поддержкой
          </div>
          <div className="flex items-center gap-2 text-sm font-normal">
            {isConnected ? (
              <>
                <Circle
                  className={`h-2 w-2 ${isAdminOnline ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`}
                />
                <span className="text-muted-foreground">
                  {isAdminOnline ? "Специалист онлайн" : "Специалист оффлайн"}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground text-xs">Подключение...</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0 min-h-0">
        {/* Notification permission banner */}
        <div className="px-6 pt-4 shrink-0">
          <NotificationPermissionBanner />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 bg-[#efeae2] dark:bg-zinc-900">
          <div className="space-y-2 py-3 px-4">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Чат с поддержкой</p>
                <p className="text-sm mt-1">
                  Здесь вы можете задать вопрос или отправить необходимые данные
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isMe = message.userId === currentUserId
                const prevMessage = messages[index - 1]
                const isFirstInGroup = !prevMessage || prevMessage.userId !== message.userId
                const showAvatar = isFirstInGroup && !isMe

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} ${!isFirstInGroup ? "mt-0.5" : "mt-2"}`}
                  >
                    {/* Avatar placeholder for alignment */}
                    {!isMe && (
                      <div className="w-8 shrink-0 mr-2">
                        {showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-medium">
                            С
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`relative max-w-[70%] rounded-lg px-3 py-1.5 ${
                        isMe
                          ? `bg-[#d9fdd3] dark:bg-emerald-800 text-gray-800 dark:text-gray-100 ${isFirstInGroup ? "rounded-tr-none" : ""}`
                          : `bg-white dark:bg-zinc-800 text-gray-800 dark:text-gray-100 shadow-sm dark:shadow-none ${isFirstInGroup ? "rounded-tl-none" : ""}`
                      }`}
                    >
                      <p className="text-[13px] leading-[19px] whitespace-pre-wrap">{message.content}</p>

                      {/* Files */}
                      {message.files.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {message.files.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                            >
                              {file.type.startsWith("image/") ? (
                                <ImageIcon className="h-3 w-3" />
                              ) : (
                                <FileText className="h-3 w-3" />
                              )}
                              {file.name}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Time and status - inline at bottom right */}
                      <span className="float-right ml-2 mt-1 flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                        {new Date(message.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isMe && (
                          message.status === "READ" ? (
                            <CheckCheck className="h-3 w-3 text-blue-500" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )
                        )}
                      </span>
                    </div>

                    {/* Avatar placeholder for alignment (my messages) */}
                    {isMe && (
                      <div className="w-8 shrink-0 ml-2">
                        {isFirstInGroup && (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                            Я
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">Специалист печатает</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* File previews */}
        {files.length > 0 && (
          <div className="px-6 py-2 border-t flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs"
              >
                {file.type.startsWith("image/") ? (
                  <ImageIcon className="h-3 w-3" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
              title="Прикрепить файл"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              placeholder="Написать сообщение..."
              value={messageText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              rows={1}
              className="resize-none min-h-[40px]"
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!messageText.trim() && files.length === 0) || isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isUploading && (
            <p className="text-xs text-muted-foreground mt-2">
              Загрузка файлов...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
