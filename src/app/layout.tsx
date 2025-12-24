import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { db } from "@/lib/db"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
})

async function getSeoSettings() {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            "store_name",
            "seo_title",
            "seo_description",
            "seo_keywords",
            "seo_og_image",
          ],
        },
      },
    })

    const map: Record<string, string> = {}
    settings.forEach((s) => {
      map[s.key] = s.value
    })
    return map
  } catch {
    return {}
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings()

  const storeName = settings.store_name || "Digital Store"
  const title = settings.seo_title || `${storeName} - Магазин цифровых товаров`
  const description =
    settings.seo_description ||
    "Магазин веб-приложений и мобильных приложений. Покупайте и скачивайте цифровые продукты."
  const keywords = settings.seo_keywords
    ? settings.seo_keywords.split(",").map((k) => k.trim())
    : ["веб-приложения", "мобильные приложения", "цифровые товары", "магазин"]

  return {
    title: {
      default: title,
      template: `%s | ${storeName}`,
    },
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ru_RU",
      images: settings.seo_og_image ? [settings.seo_og_image] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings.seo_og_image ? [settings.seo_og_image] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
            <Toaster position="top-right" richColors />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
