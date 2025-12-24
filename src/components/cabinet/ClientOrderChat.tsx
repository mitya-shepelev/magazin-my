"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Headphones,
} from "lucide-react"
import { toast } from "sonner"

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

export function ClientOrderChat({ orderId, messages, currentUserId }: ClientOrderChatProps) {
  const router = useRouter()
  const [messageText, setMessageText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    const content = messageText.trim()
    if (!content && files.length === 0) return

    setIsSending(true)

    try {
      // Upload files first
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

      // Send message
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content || "Файл",
          files: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null,
        }),
      })

      if (!res.ok) throw new Error("Failed to send")

      setMessageText("")
      setFiles([])
      router.refresh()
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

  const parseFiles = (filesJson: string | null): FileInfo[] => {
    if (!filesJson) return []
    try {
      return JSON.parse(filesJson)
    } catch {
      return []
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5" />
          Чат с поддержкой
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4" style={{ minHeight: "350px" }}>
            {messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Чат с поддержкой</p>
                <p className="text-sm mt-1">
                  Здесь вы можете задать вопрос или отправить необходимые данные
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isMe = message.user.id === currentUserId
                const messageFiles = parseFiles(message.files)

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {isMe ? "Вы" : "Специалист"}
                        </span>
                        {!isMe && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-orange-100 text-orange-700 border-orange-200"
                          >
                            Поддержка
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {/* Files */}
                      {messageFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {messageFiles.map((file, idx) => (
                            <a
                              key={idx}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs hover:underline ${
                                isMe ? "text-primary-foreground/80" : "text-primary"
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
                          isMe ? "text-primary-foreground/60" : "text-muted-foreground"
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
              onChange={(e) => setMessageText(e.target.value)}
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
