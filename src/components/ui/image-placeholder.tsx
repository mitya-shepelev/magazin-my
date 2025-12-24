import { Globe, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImagePlaceholderProps {
  type?: "WEB_APP" | "MOBILE_APP"
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ImagePlaceholder({
  type = "WEB_APP",
  className,
  size = "md"
}: ImagePlaceholderProps) {
  const iconSizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-24 w-24"
  }

  const Icon = type === "MOBILE_APP" ? Smartphone : Globe

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col items-center justify-center gap-2",
        "bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100",
        "dark:from-slate-800 dark:via-slate-900 dark:to-slate-800",
        className
      )}
    >
      <div className="p-4 rounded-full bg-white/60 dark:bg-black/20 backdrop-blur-sm">
        <Icon className={cn(iconSizes[size], "text-slate-400 dark:text-slate-500")} />
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
        {type === "MOBILE_APP" ? "Мобильное приложение" : "Веб-приложение"}
      </span>
    </div>
  )
}
