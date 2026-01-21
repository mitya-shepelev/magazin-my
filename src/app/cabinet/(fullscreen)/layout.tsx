import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/shared/Header"
import { CabinetNav } from "@/components/cabinet/CabinetNav"
import { SocketWrapper } from "@/components/providers/SocketWrapper"

export default async function CabinetFullscreenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <SocketWrapper currentUserId={session.user.id}>
      <div className="flex min-h-screen flex-col">
        <Header />
        <CabinetNav />
        <main className="flex-1">
          <div className="container py-4">
            {children}
          </div>
        </main>
      </div>
    </SocketWrapper>
  )
}
