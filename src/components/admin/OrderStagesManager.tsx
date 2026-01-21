"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
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
  Play,
  Check,
  MessageSquare,
  Send,
  Loader2,
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

interface OrderStagesManagerProps {
  orderId: string
  stages: Stage[]
  orderStatus: string
  installationStatus: string
}

const STAGE_TYPES = {
  CLIENT_ACTION: { label: "Действие клиента", icon: User, color: "bg-blue-500" },
  ADMIN_WORK: { label: "Работа админа", icon: Settings, color: "bg-orange-500" },
  CONFIRMATION: { label: "Подтверждение", icon: CheckCircle, color: "bg-green-500" },
}

const STATUS_CONFIG = {
  PENDING: { label: "Ожидает", className: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "В работе", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Завершён", className: "bg-green-100 text-green-700" },
}

export function OrderStagesManager({
  orderId,
  stages,
  orderStatus,
  installationStatus,
}: OrderStagesManagerProps) {
  const router = useRouter()
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [loadingStages, setLoadingStages] = useState<Set<string>>(new Set())
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

  const handleStatusChange = async (stageId: string, newStatus: string) => {
    setLoadingStages((prev) => new Set(prev).add(stageId))

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/stages/${stageId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error("Failed to update status")

      toast.success("Статус обновлён")
      router.refresh()
    } catch (error) {
      toast.error("Ошибка обновления статуса")
    } finally {
      setLoadingStages((prev) => {
        const next = new Set(prev)
        next.delete(stageId)
        return next
      })
    }
  }

  const handleSendComment = async (stageId: string) => {
    const content = commentText[stageId]?.trim()
    if (!content) return

    setSendingComment(stageId)

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/stages/${stageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) throw new Error("Failed to send comment")

      setCommentText((prev) => ({ ...prev, [stageId]: "" }))
      toast.success("Комментарий отправлен")
      router.refresh()
    } catch (error) {
      toast.error("Ошибка отправки комментария")
    } finally {
      setSendingComment(null)
    }
  }

  if (orderStatus !== "PAID") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Этапы установки</CardTitle>
          <CardDescription>
            Этапы будут доступны после оплаты заказа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Заказ ещё не оплачен</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (stages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Этапы установки</CardTitle>
          <CardDescription>
            Для этого заказа нет этапов установки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Товар не требует установки</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const completedCount = stages.filter((s) => s.status === "COMPLETED").length
  const progress = Math.round((completedCount / stages.length) * 100)

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Этапы установки</span>
          <Badge variant="outline">{completedCount}/{stages.length}</Badge>
        </CardTitle>
        <CardDescription>
          Прогресс: {progress}%
        </CardDescription>
        {/* Progress bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[600px] px-6 pb-6">
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const typeInfo = STAGE_TYPES[stage.type as keyof typeof STAGE_TYPES]
              const statusInfo = STATUS_CONFIG[stage.status as keyof typeof STATUS_CONFIG]
              const Icon = typeInfo?.icon || Settings
              const isExpanded = expandedStages.has(stage.id)
              const isLoading = loadingStages.has(stage.id)

              return (
                <Collapsible
                  key={stage.id}
                  open={isExpanded}
                  onOpenChange={() => toggleStage(stage.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{stage.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`${typeInfo?.color} text-white text-xs`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {typeInfo?.label}
                            </Badge>
                            <Badge className={statusInfo?.className}>
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

                        {/* Status actions */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          {stage.status === "PENDING" && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(stage.id, "IN_PROGRESS")}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4 mr-2" />
                              )}
                              Начать
                            </Button>
                          )}
                          {stage.status === "IN_PROGRESS" && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(stage.id, "COMPLETED")}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Завершить
                            </Button>
                          )}
                          {stage.status === "COMPLETED" && stage.completedAt && (
                            <span className="text-sm text-muted-foreground">
                              Завершён {new Date(stage.completedAt).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>

                        {/* Comments */}
                        {stage.comments.length > 0 && (
                          <div className="space-y-3 pt-2 border-t">
                            <h4 className="text-sm font-medium">Комментарии</h4>
                            {stage.comments.map((comment) => (
                              <div
                                key={comment.id}
                                className={`p-3 rounded-lg ${
                                  comment.user.role === "ADMIN"
                                    ? "bg-primary/10 ml-4"
                                    : "bg-muted mr-4"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">
                                    {comment.user.name || "Пользователь"}
                                  </span>
                                  {comment.user.role === "ADMIN" && (
                                    <Badge variant="outline" className="text-xs">
                                      Админ
                                    </Badge>
                                  )}
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

                        {/* Add comment */}
                        <div className="flex gap-2 pt-2">
                          <Textarea
                            placeholder="Написать комментарий к этапу..."
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
