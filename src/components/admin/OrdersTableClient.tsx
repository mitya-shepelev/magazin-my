"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Circle,
} from "lucide-react"
import { usePresence } from "@/hooks/usePresence"
import { useSocket } from "@/hooks/useSocket"

interface OrderItem {
  id: string
  productName: string
  product: {
    name: string
    slug: string
  } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  customerEmail: string
  createdAt: Date
  userId: string | null
  user: {
    name: string | null
    email: string | null
  } | null
  items: OrderItem[]
}

interface OrdersTableClientProps {
  orders: Order[]
}

const statusConfig = {
  PENDING: {
    label: "Ожидает",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  PAID: {
    label: "Оплачен",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  CANCELLED: {
    label: "Отменён",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  REFUNDED: {
    label: "Возврат",
    icon: RefreshCw,
    className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  },
}

export function OrdersTableClient({ orders }: OrdersTableClientProps) {
  const { isOrderOnline } = usePresence()
  const { isConnected } = useSocket()

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Номер</TableHead>
          <TableHead>Клиент</TableHead>
          <TableHead>Товары</TableHead>
          <TableHead>Сумма</TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>Дата</TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
          const StatusIcon = status.icon
          const isOnline = isConnected && isOrderOnline(order.id)

          return (
            <TableRow key={order.id} className="hover:bg-secondary/50">
              <TableCell className="font-mono font-medium">
                <div className="flex items-center gap-2">
                  {isConnected && order.status === "PAID" && (
                    <span title={isOnline ? "Клиент онлайн" : "Клиент оффлайн"}>
                      <Circle
                        className={`h-2 w-2 transition-colors ${
                          isOnline
                            ? "fill-green-500 text-green-500"
                            : "fill-gray-300 text-gray-300"
                        }`}
                      />
                    </span>
                  )}
                  #{order.orderNumber}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{order.user?.name || "—"}</p>
                    {isOnline && (
                      <span className="text-xs text-green-600 font-medium">онлайн</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {order.customerEmail}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {order.items.slice(0, 2).map((item) => (
                    <p key={item.id} className="text-sm">
                      {item.productName}
                    </p>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{order.items.length - 2} ещё
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-semibold">
                {order.total.toLocaleString("ru-RU")} ₽
              </TableCell>
              <TableCell>
                <Badge className={status.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(order.createdAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/admin/orders/${order.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
