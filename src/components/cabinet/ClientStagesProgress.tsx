"use client"

import { useState } from "react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  User,
  Settings,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Check,
  MessageSquare,
  Send,
  Loader2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"

interface StageComment {
  id: string
  content: string
  files: string | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    role: string
  }
}

interface Stage {
  id: string
  title: string
  description: string
  type: string
  status: string
  sortOrder: number
  completedAt: Date | null
  completedBy: string | null
  comments: StageComment[]
}

interface ClientStagesProgressProps {
  orderId: string
  stages: Stage[]
  currentUserId: string
}

const STAGE_TYPES = {
  CLIENT_ACTION: { label: "Требуется ваше действие", icon: User, color: "bg-blue-500" },
  ADMIN_WORK: { label: "Выполняется специалистом", icon: Settings, color: "bg-orange-500" },
  CONFIRMATION: { label: "Требуется подтверждение", icon: CheckCircle, color: "bg-green-500" },
}

const STATUS_CONFIG = {
  PENDING: { label: "Ожидает", icon: Clock, className: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "В работе", icon: Settings, className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Завершён", icon: CheckCircle, className: "bg-green-100 text-green-700" },
}

export function ClientStagesProgress({
  orderId,
  stages,
  currentUserId,
}: ClientStagesProgressProps) {
  const router = useRouter()
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => {
    // Auto-expand first in-progress or pending stage
    const activeStage = stages.find((s) => s.status === "IN_PROGRESS" || s.status === "PENDING")
    return activeStage ? new Set([activeStage.id]) : new Set()
  })
  const [confirmingStage, setConfirmingStage] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [sendingComment, setSendingComment] = useState<string | null>(null)

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) {
        next.delete(stageId)
      } else {
        next.add(stageId)
      }
      return next
    })
  }

  const handleConfirmStage = async (stageId: string) => {
    setConfirmingStage(stageId)

    try {
      const res = await fetch(`/api/orders/${orderId}/stages/${stageId}/confirm`, {
        method: "POST",
      })

      if (!res.ok) throw new Error("Failed to confirm")

      toast.success("Этап подтверждён!")
      router.refresh()
    } catch (error) {
      toast.error("Ошибка подтверждения")
    } finally {
      setConfirmingStage(null)
    }
  }

  const handleSendComment = async (stageId: string) => {
    const content = commentText[stageId]?.trim()
    if (!content) return

    setSendingComment(stageId)

    try {
      const res = await fetch(`/api/orders/${orderId}/stages/${stageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) throw new Error("Failed to send")

      setCommentText((prev) => ({ ...prev, [stageId]: "" }))
      toast.success("Комментарий отправлен")
      router.refresh()
    } catch (error) {
      toast.error("Ошибка отправки")
    } finally {
      setSendingComment(null)
    }
  }

  if (stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Этапы установки</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Этот товар не требует установки</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Этапы установки
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[500px] px-6 pb-6">
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const typeInfo = STAGE_TYPES[stage.type as keyof typeof STAGE_TYPES]
              const statusInfo = STATUS_CONFIG[stage.status as keyof typeof STATUS_CONFIG]
              const Icon = typeInfo?.icon || Settings
              const StatusIcon = statusInfo?.icon || Clock
              const isExpanded = expandedStages.has(stage.id)
              const isClientAction = stage.type === "CLIENT_ACTION" || stage.type === "CONFIRMATION"
              const needsAction = isClientAction && stage.status === "IN_PROGRESS"

              return (
                <Collapsible
                  key={stage.id}
                  open={isExpanded}
                  onOpenChange={() => toggleStage(stage.id)}
                >
                  <div
                    className={`border rounded-lg overflow-hidden transition-all ${
                      needsAction ? "border-primary ring-2 ring-primary/20" : ""
                    } ${stage.status === "COMPLETED" ? "opacity-75" : ""}`}
                  >
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                        {/* Step number with status indicator */}
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                            stage.status === "COMPLETED"
                              ? "bg-green-100 text-green-600"
                              : stage.status === "IN_PROGRESS"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {stage.status === "COMPLETED" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <span className="font-semibold">{index + 1}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{stage.title}</span>
                            {needsAction && (
                              <Badge className="bg-primary text-primary-foreground text-xs animate-pulse">
                                Требуется действие
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`${typeInfo?.color} text-white text-xs`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {typeInfo?.label}
                            </Badge>
                            <Badge variant="outline" className={statusInfo?.className}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo?.label}
                            </Badge>
                          </div>
                        </div>

                        {stage.comments.length > 0 && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-xs">{stage.comments.length}</span>
                          </div>
                        )}

                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4 border-t">
                        {/* Description */}
                        <div className="pt-4 prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>{stage.description}</ReactMarkdown>
                        </div>

                        {/* Action button for CONFIRMATION type */}
                        {stage.type === "CONFIRMATION" && stage.status === "IN_PROGRESS" && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-800 mb-3">
                              Пожалуйста, проверьте результат и подтвердите, что всё работает корректно.
                            </p>
                            <Button
                              onClick={() => handleConfirmStage(stage.id)}
                              disabled={confirmingStage === stage.id}
                              className="gap-2"
                            >
                              {confirmingStage === stage.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Подтверждаю, всё работает
                            </Button>
                          </div>
                        )}

                        {/* Completed info */}
                        {stage.status === "COMPLETED" && stage.completedAt && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Завершён {new Date(stage.completedAt).toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}

                        {/* Comments */}
                        {stage.comments.length > 0 && (
                          <div className="space-y-3 pt-2 border-t">
                            <h4 className="text-sm font-medium">Комментарии</h4>
                            {stage.comments.map((comment) => (
                              <div
                                key={comment.id}
                                className={`p-3 rounded-lg ${
                                  comment.user.role === "ADMIN"
                                    ? "bg-muted mr-4"
                                    : "bg-primary/10 ml-4"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {comment.user.role === "ADMIN" ? "Специалист" : "Вы"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(comment.createdAt).toLocaleTimeString("ru-RU", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add comment (only for active stages) */}
                        {stage.status !== "COMPLETED" && (
                          <div className="flex gap-2 pt-2">
                            <Textarea
                              placeholder="Задать вопрос или оставить комментарий..."
                              value={commentText[stage.id] || ""}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [stage.id]: e.target.value,
                                }))
                              }
                              rows={2}
                              className="resize-none"
                            />
                            <Button
                              size="icon"
                              onClick={() => handleSendComment(stage.id)}
                              disabled={!commentText[stage.id]?.trim() || sendingComment === stage.id}
                            >
                              {sendingComment === stage.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
