"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  Circle,
} from "lucide-react"
import { toast } from "sonner"
import { useOrderChat } from "@/hooks/useOrderChat"
import { useTyping } from "@/hooks/useTyping"
import type { MessagePayload } from "@/lib/socket-types"

interface Message {
  id: string
  content: string
  files: string | null
  isRead: boolean
  createdAt: Date
  user: {
    id: string
    name: string | null
    role: string
  }
}

interface OrderChatProps {
  orderId: string
  messages: Message[]
  currentUserId: string
  clientName?: string
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
    createdAt: new Date(msg.createdAt).toISOString(),
    user: msg.user,
  }
}

export function OrderChat({ orderId, messages: initialMessages, currentUserId, clientName }: OrderChatProps) {
  // Convert initial messages to payload format
  const initialPayloads = initialMessages.map(convertToPayload)

  const {
    messages,
    isTyping,
    onlineUsers,
    isConnected,
    startTyping,
    stopTyping,
  } = useOrderChat({ orderId, initialMessages: initialPayloads })

  const [messageText, setMessageText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Typing handler with debounce
  const { handleTyping } = useTyping({
    onStartTyping: startTyping,
    onStopTyping: stopTyping,
  })

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    const content = messageText.trim()
    if (!content && files.length === 0) return

    setIsSending(true)
    stopTyping()

    try {
      // Upload files first if any
      let uploadedFiles: FileInfo[] = []
      if (files.length > 0) {
        setIsUploading(true)
        for (const file of files) {
          const formData = new FormData()
          formData.append("file", file)

          const uploadRes = await fetch(`/api/orders/${orderId}/upload`, {
            method: "POST",
            body: formData,
          })

          if (!uploadRes.ok) throw new Error("Failed to upload file")

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
      const res = await fetch(`/api/admin/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content || "Файл",
          files: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null,
        }),
      })

      if (!res.ok) throw new Error("Failed to send message")

      setMessageText("")
      setFiles([])
      // No router.refresh() needed - message arrives via WebSocket
    } catch (error) {
      toast.error("Ошибка отправки сообщения")
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

  // Check if client is online
  const isClientOnline = onlineUsers.some((userId) => userId !== currentUserId)

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Чат с клиентом
          </div>
          <div className="flex items-center gap-2 text-sm font-normal">
            {isConnected ? (
              <>
                <Circle
                  className={`h-2 w-2 ${isClientOnline ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`}
                />
                <span className="text-muted-foreground">
                  {isClientOnline ? `${clientName || "Клиент"} онлайн` : "Клиент оффлайн"}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground text-xs">Подключение...</span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4" style={{ minHeight: "400px" }}>
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Сообщений пока нет</p>
                <p className="text-sm">Напишите клиенту первое сообщение</p>
              </div>
            ) : (
              messages.map((message) => {
                const isAdmin = message.user.role === "ADMIN"

                return (
                  <div
                    key={message.id}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.user.name || "Пользователь"}
                        </span>
                        {isAdmin && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-white/20 border-white/30"
                          >
                            Админ
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {/* Files */}
                      {message.files.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.files.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs hover:underline ${
                                isAdmin ? "text-primary-foreground/80" : "text-primary"
                              }`}
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

                      <span
                        className={`text-xs mt-1 block ${
                          isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{clientName || "Клиент"} печатает</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}
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
