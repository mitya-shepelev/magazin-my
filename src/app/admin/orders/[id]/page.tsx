import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { ArrowLeft, User, Calendar, Package, CreditCard } from "lucide-react"
import { OrderStagesManager } from "@/components/admin/OrderStagesManager"
import { OrderChat } from "@/components/admin/OrderChat"

async function getOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
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

const statusConfig = {
  PENDING: { label: "Ожидает оплаты", className: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Оплачен", className: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Отменён", className: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Возврат", className: "bg-gray-100 text-gray-700" },
}

const installationStatusConfig = {
  NOT_STARTED: { label: "Не начата", className: "bg-gray-100 text-gray-700" },
  IN_PROGRESS: { label: "В процессе", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Завершена", className: "bg-green-100 text-green-700" },
  SUPPORT: { label: "Поддержка", className: "bg-purple-100 text-purple-700" },
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const [order, session] = await Promise.all([
    getOrder(id),
    auth()
  ])

  if (!order) {
    notFound()
  }

  const paymentStatus = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
  const installStatus = installationStatusConfig[order.installationStatus as keyof typeof installationStatusConfig] || installationStatusConfig.NOT_STARTED

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Заказ #{order.orderNumber}</h1>
            <Badge className={paymentStatus.className}>{paymentStatus.label}</Badge>
            {order.status === "PAID" && (
              <Badge className={installStatus.className}>{installStatus.label}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Top row - Order info (compact) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Customer info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Клиент</p>
                <p className="font-medium truncate">{order.user?.name || order.customerName || "—"}</p>
                <p className="text-sm text-muted-foreground truncate">{order.customerEmail}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order items */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {(() => {
                const firstItem = order.items[0]
                const images = firstItem?.product?.images ? JSON.parse(firstItem.product.images) : []
                return images[0] ? (
                  <img src={images[0]} alt={firstItem.productName} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )
              })()}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Товар</p>
                <p className="font-medium truncate">{order.items[0]?.productName}</p>
                <p className="text-sm font-semibold">{order.total.toLocaleString("ru-RU")} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment info */}
        {order.paymentId && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Оплата</p>
                  <p className="font-mono text-sm truncate">{order.paymentId.slice(0, 12)}...</p>
                  {order.paidAt && (
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.paidAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support period */}
        {order.supportEndsAt && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Поддержка до</p>
                  <p className="font-medium">
                    {new Date(order.supportEndsAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main content - Stages and Chat (wide) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stages */}
        <OrderStagesManager
          orderId={order.id}
          stages={order.stages}
          orderStatus={order.status}
          installationStatus={order.installationStatus}
        />

        {/* Chat */}
        <OrderChat
          orderId={order.id}
          messages={order.messages}
          currentUserId={session?.user?.id || ""}
          clientName={order.user?.name || undefined}
        />
      </div>
    </div>
  )
}
