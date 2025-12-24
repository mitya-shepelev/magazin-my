"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2, Loader2 } from "lucide-react"
import { deleteCategory } from "@/actions/categories"
import { toast } from "sonner"

interface DeleteCategoryButtonProps {
  id: string
  name: string
  hasProducts: boolean
}

export function DeleteCategoryButton({ id, name, hasProducts }: DeleteCategoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleDelete() {
    setIsLoading(true)
    const result = await deleteCategory(id)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Категория удалена")
      setIsOpen(false)
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Удалить категорию?</DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите удалить категорию &ldquo;{name}&rdquo;?
            {hasProducts && (
              <span className="block mt-2 text-destructive">
                Внимание: в этой категории есть товары!
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading || hasProducts}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Удаление...
              </>
            ) : (
              "Удалить"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
