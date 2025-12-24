"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  User,
  Settings,
  CheckCircle,
  Save,
} from "lucide-react"
import { toast } from "sonner"

interface StageTemplate {
  id: string
  title: string
  description: string
  type: string
  sortOrder: number
}

interface StageTemplateManagerProps {
  productId: string
  productName: string
  supportDays: number
  initialTemplates: StageTemplate[]
}

const STAGE_TYPES = {
  CLIENT_ACTION: { label: "Действие клиента", icon: User, color: "bg-blue-500" },
  ADMIN_WORK: { label: "Работа админа", icon: Settings, color: "bg-orange-500" },
  CONFIRMATION: { label: "Подтверждение", icon: CheckCircle, color: "bg-green-500" },
}

export function StageTemplateManager({
  productId,
  productName,
  supportDays: initialSupportDays,
  initialTemplates,
}: StageTemplateManagerProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<StageTemplate[]>(initialTemplates)
  const [supportDays, setSupportDays] = useState(initialSupportDays)
  const [isLoading, setIsLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<StageTemplate | null>(null)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "CLIENT_ACTION",
  })

  const resetForm = () => {
    setFormData({ title: "", description: "", type: "CLIENT_ACTION" })
    setEditingTemplate(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (template: StageTemplate) => {
    setEditingTemplate(template)
    setFormData({
      title: template.title,
      description: template.description,
      type: template.type,
    })
    setDialogOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Заполните все поля")
      return
    }

    setIsLoading(true)

    try {
      if (editingTemplate) {
        // Update existing
        const res = await fetch(
          `/api/admin/products/${productId}/templates/${editingTemplate.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        )

        if (!res.ok) throw new Error("Failed to update")

        const updated = await res.json()
        setTemplates((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        )
        toast.success("Этап обновлён")
      } else {
        // Create new
        const res = await fetch(`/api/admin/products/${productId}/templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        if (!res.ok) throw new Error("Failed to create")

        const created = await res.json()
        setTemplates((prev) => [...prev, created])
        toast.success("Этап создан")
      }

      setDialogOpen(false)
      resetForm()
    } catch (error) {
      toast.error("Ошибка сохранения")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!deletingTemplateId) return

    setIsLoading(true)

    try {
      const res = await fetch(
        `/api/admin/products/${productId}/templates/${deletingTemplateId}`,
        { method: "DELETE" }
      )

      if (!res.ok) throw new Error("Failed to delete")

      setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplateId))
      toast.success("Этап удалён")
      setDeleteDialogOpen(false)
      setDeletingTemplateId(null)
    } catch (error) {
      toast.error("Ошибка удаления")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newTemplates = [...templates]
    const [draggedItem] = newTemplates.splice(draggedIndex, 1)
    newTemplates.splice(index, 0, draggedItem)

    setTemplates(newTemplates)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return

    setDraggedIndex(null)

    // Save new order
    try {
      const res = await fetch(
        `/api/admin/products/${productId}/templates/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateIds: templates.map((t) => t.id) }),
        }
      )

      if (!res.ok) throw new Error("Failed to reorder")

      toast.success("Порядок сохранён")
    } catch (error) {
      toast.error("Ошибка сохранения порядка")
      // Reload to get correct order
      router.refresh()
    }
  }

  const handleSaveSupportDays = async () => {
    setIsLoading(true)

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportDays }),
      })

      if (!res.ok) throw new Error("Failed to update")

      toast.success("Срок поддержки сохранён")
    } catch (error) {
      toast.error("Ошибка сохранения")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Support days setting */}
      <Card>
        <CardHeader>
          <CardTitle>Срок поддержки</CardTitle>
          <CardDescription>
            Количество дней поддержки после завершения установки
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={supportDays}
                onChange={(e) => setSupportDays(parseInt(e.target.value) || 0)}
                className="w-24"
                min={0}
              />
              <span className="text-muted-foreground">дней</span>
            </div>
            <Button
              onClick={handleSaveSupportDays}
              disabled={isLoading || supportDays === initialSupportDays}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stage templates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Шаблоны этапов</CardTitle>
            <CardDescription>
              Эти этапы будут созданы для каждого заказа после оплаты
            </CardDescription>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить этап
          </Button>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Этапов пока нет</p>
              <p className="text-sm">
                Добавьте этапы установки для этого товара
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template, index) => {
                const typeInfo = STAGE_TYPES[template.type as keyof typeof STAGE_TYPES]
                const Icon = typeInfo?.icon || Settings

                return (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-4 bg-muted/50 rounded-lg border cursor-move transition-all ${
                      draggedIndex === index ? "opacity-50 scale-95" : ""
                    }`}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />

                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">
                          {template.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`${typeInfo?.color} text-white text-xs`}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {typeInfo?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {template.description.replace(/[#*`]/g, "").slice(0, 100)}...
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingTemplateId(template.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Редактировать этап" : "Новый этап"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Измените данные этапа установки"
                : "Добавьте новый этап установки для товара"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название этапа</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Например: Предоставление данных хостинга"
              />
            </div>

            <div className="space-y-2">
              <Label>Тип этапа</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_TYPES).map(([value, { label, icon: Icon }]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                • Действие клиента — клиент должен что-то сделать
                <br />
                • Работа админа — вы выполняете техническую работу
                <br />• Подтверждение — клиент проверяет и подтверждает результат
              </p>
            </div>

            <div className="space-y-2">
              <Label>Описание (Markdown)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Опишите что нужно сделать на этом этапе..."
                rows={10}
              />
              <p className="text-xs text-muted-foreground">
                Поддерживается Markdown: ## заголовки, **жирный**, - списки
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isLoading}>
              {isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить этап?</AlertDialogTitle>
            <AlertDialogDescription>
              Этап будет удалён из шаблона. Это не затронет уже созданные заказы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
