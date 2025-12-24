import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SocketWrapper } from "@/components/providers/SocketWrapper"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login")
  }

  return (
    <SocketWrapper>
      <div className="flex min-h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </SocketWrapper>
  )
}
