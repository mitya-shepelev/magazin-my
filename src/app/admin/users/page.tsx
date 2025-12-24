import { Metadata } from "next"
import { db } from "@/lib/db"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Calendar,
  ShoppingBag,
  Download,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Пользователи | Админ-панель",
  description: "Управление пользователями",
}

async function getUsers() {
  return db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { orders: true },
      },
      orders: {
        where: { status: "PAID" },
        select: { total: true },
      },
    },
  })
}

async function getUserStats() {
  const [total, admins, customers] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
  ])

  return { total, admins, customers }
}

export default async function UsersPage() {
  const [users, stats] = await Promise.all([
    getUsers(),
    getUserStats(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Пользователи
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление пользователями магазина
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Экспорт
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardDescription>Всего пользователей</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Зарегистрировано
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription>Администраторы</CardDescription>
            <CardTitle className="text-3xl text-primary">{stats.admins}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-primary">
              <Shield className="h-3 w-3" />
              С полным доступом
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Клиенты</CardDescription>
            <CardTitle className="text-3xl text-emerald-600">{stats.customers}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <UserCheck className="h-3 w-3" />
              Покупатели
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
          <CardDescription>
            Все зарегистрированные пользователи
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead>Заказы</TableHead>
                  <TableHead>Потрачено</TableHead>
                  <TableHead>Регистрация</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const totalSpent = user.orders.reduce((sum, order) => sum + order.total, 0)

                  return (
                    <TableRow key={user.id} className="hover:bg-secondary/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-semibold text-primary">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              ID: {user.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            user.role === "ADMIN"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-secondary text-secondary-foreground"
                          }
                        >
                          {user.role === "ADMIN" ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Админ
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3 mr-1" />
                              Клиент
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                          {user._count.orders}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {totalSpent > 0 ? (
                          <span className="price-tag">
                            {totalSpent.toLocaleString("ru-RU")} ₽
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(user.createdAt).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Пользователей пока нет</h3>
              <p className="text-muted-foreground">
                Здесь появятся зарегистрированные пользователи
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
