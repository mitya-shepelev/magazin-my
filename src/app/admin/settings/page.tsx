import { Metadata } from "next"
import { db } from "@/lib/db"
import { SettingsForm } from "@/components/admin/SettingsForm"
import { Settings } from "lucide-react"

export const metadata: Metadata = {
  title: "Настройки | Админ-панель",
  description: "Настройки магазина",
}

async function getSettings() {
  const settings = await db.setting.findMany()
  const settingsMap: Record<string, string> = {}
  settings.forEach((s) => {
    settingsMap[s.key] = s.value
  })
  return settingsMap
}

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          Настройки
        </h1>
        <p className="text-muted-foreground mt-1">
          Управление параметрами магазина
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  )
}
