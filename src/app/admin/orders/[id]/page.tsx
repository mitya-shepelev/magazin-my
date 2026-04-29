import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Globe,
  History,
  KeyRound,
  Package,
  RotateCcw,
  Server,
  ShieldCheck,
  User,
} from "lucide-react"
import { OrderStagesManager } from "@/components/admin/OrderStagesManager"
import { OrderChat } from "@/components/admin/OrderChat"
import { resetLicenseBinding, updateLicenseBinding } from "@/actions/licenses"

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
      licenses: {
        orderBy: { createdAt: "asc" },
        include: {
          product: {
            select: { name: true },
          },
          events: {
            orderBy: { createdAt: "desc" },
            take: 3,
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

const licenseStatusConfig = {
  ACTIVE: { label: "Активна", className: "bg-green-100 text-green-700" },
  SUSPENDED: { label: "Приостановлена", className: "bg-yellow-100 text-yellow-700" },
  REVOKED: { label: "Отозвана", className: "bg-red-100 text-red-700" },
}

const licenseEventConfig = {
  ACTIVATION_SUCCESS: "Активация прошла",
  ACTIVATION_REJECTED: "Активация отклонена",
  BINDING_UPDATED: "Привязка изменена",
  BINDING_RESET: "Привязка сброшена",
  STATUS_CHANGED: "Статус изменён",
  KEY_REISSUED: "Ключ перевыпущен",
}

function licenseEventLabel(eventType: string) {
  return licenseEventConfig[eventType as keyof typeof licenseEventConfig] || eventType
}

function formatDate(value: Date | null) {
  if (!value) {
    return "—"
  }

  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
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
                  <Image
                    src={images[0]}
                    alt={firstItem.productName}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
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

      {order.licenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Лицензии заказа
            </CardTitle>
            <CardDescription>
              Админ может вручную привязать домен/IP или сбросить привязку перед повторной установкой
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {order.licenses.map((license) => {
              const licenseStatus = licenseStatusConfig[license.status as keyof typeof licenseStatusConfig] || licenseStatusConfig.ACTIVE

              return (
                <div key={license.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{license.product.name}</p>
                      <p className="font-mono text-xs text-muted-foreground break-all">
                        {license.licenseKey}
                      </p>
                    </div>
                    <Badge className={licenseStatus.className}>{licenseStatus.label}</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Домен</p>
                      <p>{license.domain || "Не привязан"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">IP сервера</p>
                      <p>{license.serverIp || "Не привязан"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Активации</p>
                      <p>{license.activationCount}/{license.maxActivations}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Последняя проверка</p>
                      <p>{formatDate(license.lastCheckAt)}</p>
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/40 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Последние события</p>
                    {license.events.length > 0 ? (
                      <div className="space-y-2">
                        {license.events.map((event) => (
                          <div key={event.id} className="text-sm">
                            <div className="flex items-center gap-2">
                              <History className="h-3 w-3 text-muted-foreground" />
                              <span>{licenseEventLabel(event.eventType)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(event.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Событий пока нет</p>
                    )}
                  </div>

                  <form action={updateLicenseBinding} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                    <input type="hidden" name="licenseId" value={license.id} />
                    <label className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        name="domain"
                        defaultValue={license.domain || ""}
                        placeholder="domain.com"
                        className="pl-9"
                      />
                    </label>
                    <label className="relative">
                      <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        name="serverIp"
                        defaultValue={license.serverIp || ""}
                        placeholder="IP сервера"
                        className="pl-9"
                      />
                    </label>
                    <Button type="submit" variant="outline" className="gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Сохранить
                    </Button>
                  </form>

                  <form action={resetLicenseBinding}>
                    <input type="hidden" name="licenseId" value={license.id} />
                    <Button type="submit" variant="ghost" size="sm" className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Сбросить привязку
                    </Button>
                  </form>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

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
