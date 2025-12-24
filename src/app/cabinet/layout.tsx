import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Header } from "@/components/shared/Header"
import { Footer } from "@/components/shared/Footer"
import { CabinetNav } from "@/components/cabinet/CabinetNav"
import { SocketWrapper } from "@/components/providers/SocketWrapper"

export default async function CabinetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <SocketWrapper>
      <div className="flex min-h-screen flex-col">
        <Header />
        <CabinetNav />
        <main className="flex-1">
          <div className="container py-6">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </SocketWrapper>
  )
}
