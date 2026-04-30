import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, HelpCircle, Calendar, ShoppingBag } from "lucide-react"
import { ClientStagesProgress } from "@/components/cabinet/ClientStagesProgress"
import { ClientOrderChat } from "@/components/cabinet/ClientOrderChat"

async function getOrder(id: string, userId: string) {
  return db.order.findFirst({
    where: { id, userId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
      },
      stages: {
        orderBy: { sortOrder: "asc" },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: { id: true, name: true, role: true },
              },
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
  })
}

const installationStatusConfig = {
  NOT_STARTED: { label: "Не начата", className: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "В процессе", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Завершена", className: "bg-green-100 text-green-700" },
  SUPPORT: { label: "Поддержка", className: "bg-purple-100 text-purple-700" },
}

interface ClientOrderPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientOrderPage({ params }: ClientOrderPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const { id } = await params
  const order = await getOrder(id, session.user.id)

  if (!order) {
    notFound()
  }

  if (order.status !== "PAID") {
    redirect("/cabinet/orders")
  }

  const installStatus = installationStatusConfig[order.installationStatus as keyof typeof installationStatusConfig] || installationStatusConfig.NOT_STARTED
  const completedStages = order.stages.filter((s) => s.status === "COMPLETED").length
  const progress = order.stages.length > 0 ? Math.round((completedStages / order.stages.length) * 100) : 0

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/cabinet/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold">Заказ #{order.orderNumber}</h1>
            <Badge className={installStatus.className}>{installStatus.label}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {new Date(order.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Main content - Stages and Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[600px] mb-4">
        {/* Stages */}
        <ClientStagesProgress
          orderId={order.id}
          stages={order.stages}
          currentUserId={session.user.id}
        />

        {/* Chat */}
        <ClientOrderChat
          orderId={order.id}
          messages={order.messages}
          currentUserId={session.user.id}
        />
      </div>

      {/* Bottom row - Compact info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Progress */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12 -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    strokeWidth="4"
                    fill="none"
                    className="stroke-muted"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${progress * 1.26} 126`}
                    className="stroke-primary transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {progress}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Прогресс</p>
                <p className="font-medium">
                  {completedStages} из {order.stages.length}
                </p>
                <p className="text-xs text-muted-foreground">этапов</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order item */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {(() => {
                const firstItem = order.items[0]
                const images = firstItem?.product?.images ? JSON.parse(firstItem.product.images) : []
                return images[0] ? (
                  <Image
                    src={images[0]}
                    alt={firstItem.productName}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                  </div>
                )
              })()}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Товар</p>
                <Link
                  href={`/product/${order.items[0]?.product?.slug}`}
                  className="font-medium truncate block hover:underline"
                >
                  {order.items[0]?.productName}
                </Link>
                <p className="text-sm font-semibold text-primary">
                  {order.total.toLocaleString("ru-RU")} ₽
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order date */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Дата заказа</p>
                <p className="font-medium">
                  {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support period */}
        {order.supportEndsAt ? (
          <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Поддержка до</p>
                  <p className="font-medium text-purple-900 dark:text-purple-100">
                    {new Date(order.supportEndsAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Поддержка</p>
                  <p className="font-medium text-muted-foreground">Не включена</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
