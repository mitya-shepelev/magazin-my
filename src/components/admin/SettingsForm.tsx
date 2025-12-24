"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { saveSettingsAction } from "@/actions/settings"
import {
  Store,
  CreditCard,
  Mail,
  Search,
  Share2,
  FileText,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react"

interface SettingsFormProps {
  initialSettings: Record<string, string>
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    try {
      await saveSettingsAction(formData)
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit}>
      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1 glass">
          <TabsTrigger value="store" className="gap-2 py-3">
            <Store className="h-4 w-4" />
            <span className="hidden sm:inline">Магазин</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2 py-3">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Оплата</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 py-3">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email</span>
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2 py-3">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">SEO</span>
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2 py-3">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Соцсети</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2 py-3">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Юр. инфо</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Основные настройки
              </CardTitle>
              <CardDescription>
                Название, описание и контакты магазина
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="store_name">Название магазина</Label>
                  <Input
                    id="store_name"
                    name="store_name"
                    defaultValue={initialSettings.store_name || "Digital Store"}
                    placeholder="Мой магазин"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_email">Email магазина</Label>
                  <Input
                    id="store_email"
                    name="store_email"
                    type="email"
                    defaultValue={initialSettings.store_email || ""}
                    placeholder="shop@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_description">Описание</Label>
                <Textarea
                  id="store_description"
                  name="store_description"
                  defaultValue={initialSettings.store_description || ""}
                  placeholder="Краткое описание магазина для посетителей"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="store_phone">Телефон</Label>
                  <Input
                    id="store_phone"
                    name="store_phone"
                    defaultValue={initialSettings.store_phone || ""}
                    placeholder="+7 (999) 123-45-67"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_address">Адрес</Label>
                  <Input
                    id="store_address"
                    name="store_address"
                    defaultValue={initialSettings.store_address || ""}
                    placeholder="г. Москва, ул. Примерная, 1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_logo">URL логотипа</Label>
                <Input
                  id="store_logo"
                  name="store_logo"
                  defaultValue={initialSettings.store_logo || ""}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Настройки оплаты
              </CardTitle>
              <CardDescription>
                Интеграция с платёжной системой YooKassa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Безопасность
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Секретные ключи хранятся в зашифрованном виде
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {showSecrets ? "Скрыть" : "Показать"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="yookassa_shop_id">Shop ID</Label>
                  <Input
                    id="yookassa_shop_id"
                    name="yookassa_shop_id"
                    defaultValue={initialSettings.yookassa_shop_id || ""}
                    placeholder="123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yookassa_secret_key">Секретный ключ</Label>
                  <Input
                    id="yookassa_secret_key"
                    name="yookassa_secret_key"
                    type={showSecrets ? "text" : "password"}
                    defaultValue={initialSettings.yookassa_secret_key || ""}
                    placeholder="live_xxxxx или test_xxxxx"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yookassa_return_url">URL возврата после оплаты</Label>
                <Input
                  id="yookassa_return_url"
                  name="yookassa_return_url"
                  defaultValue={initialSettings.yookassa_return_url || ""}
                  placeholder="https://yoursite.com/payment/success"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Валюта</Label>
                <Input
                  id="currency"
                  name="currency"
                  defaultValue={initialSettings.currency || "RUB"}
                  placeholder="RUB"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Настройки Email
              </CardTitle>
              <CardDescription>
                SMTP для отправки уведомлений о заказах
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP сервер</Label>
                  <Input
                    id="smtp_host"
                    name="smtp_host"
                    defaultValue={initialSettings.smtp_host || ""}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Порт</Label>
                  <Input
                    id="smtp_port"
                    name="smtp_port"
                    defaultValue={initialSettings.smtp_port || "587"}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Логин</Label>
                  <Input
                    id="smtp_user"
                    name="smtp_user"
                    defaultValue={initialSettings.smtp_user || ""}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Пароль</Label>
                  <Input
                    id="smtp_password"
                    name="smtp_password"
                    type={showSecrets ? "text" : "password"}
                    defaultValue={initialSettings.smtp_password || ""}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_name">Имя отправителя</Label>
                  <Input
                    id="smtp_from_name"
                    name="smtp_from_name"
                    defaultValue={initialSettings.smtp_from_name || ""}
                    placeholder="Digital Store"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from_email">Email отправителя</Label>
                  <Input
                    id="smtp_from_email"
                    name="smtp_from_email"
                    type="email"
                    defaultValue={initialSettings.smtp_from_email || ""}
                    placeholder="noreply@example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                SEO настройки
              </CardTitle>
              <CardDescription>
                Мета-теги по умолчанию для поисковых систем
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="seo_title">Title по умолчанию</Label>
                <Input
                  id="seo_title"
                  name="seo_title"
                  defaultValue={initialSettings.seo_title || ""}
                  placeholder="Digital Store — Магазин готовых веб-решений"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_description">Description по умолчанию</Label>
                <Textarea
                  id="seo_description"
                  name="seo_description"
                  defaultValue={initialSettings.seo_description || ""}
                  placeholder="Покупайте готовые веб-приложения и мобильные приложения. Исходный код, документация, поддержка."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seo_keywords">Keywords</Label>
                <Input
                  id="seo_keywords"
                  name="seo_keywords"
                  defaultValue={initialSettings.seo_keywords || ""}
                  placeholder="веб-приложения, мобильные приложения, готовые решения"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="seo_og_image">OG Image URL</Label>
                  <Input
                    id="seo_og_image"
                    name="seo_og_image"
                    defaultValue={initialSettings.seo_og_image || ""}
                    placeholder="https://example.com/og-image.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="google_analytics">Google Analytics ID</Label>
                  <Input
                    id="google_analytics"
                    name="google_analytics"
                    defaultValue={initialSettings.google_analytics || ""}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yandex_metrika">Yandex Metrika ID</Label>
                <Input
                  id="yandex_metrika"
                  name="yandex_metrika"
                  defaultValue={initialSettings.yandex_metrika || ""}
                  placeholder="12345678"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Settings */}
        <TabsContent value="social">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Социальные сети
              </CardTitle>
              <CardDescription>
                Ссылки на социальные сети и мессенджеры
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="social_telegram">Telegram</Label>
                  <Input
                    id="social_telegram"
                    name="social_telegram"
                    defaultValue={initialSettings.social_telegram || ""}
                    placeholder="https://t.me/yourstore"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_whatsapp">WhatsApp</Label>
                  <Input
                    id="social_whatsapp"
                    name="social_whatsapp"
                    defaultValue={initialSettings.social_whatsapp || ""}
                    placeholder="https://wa.me/79991234567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="social_vk">ВКонтакте</Label>
                  <Input
                    id="social_vk"
                    name="social_vk"
                    defaultValue={initialSettings.social_vk || ""}
                    placeholder="https://vk.com/yourstore"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_youtube">YouTube</Label>
                  <Input
                    id="social_youtube"
                    name="social_youtube"
                    defaultValue={initialSettings.social_youtube || ""}
                    placeholder="https://youtube.com/@yourstore"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="social_github">GitHub</Label>
                  <Input
                    id="social_github"
                    name="social_github"
                    defaultValue={initialSettings.social_github || ""}
                    placeholder="https://github.com/yourstore"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="social_discord">Discord</Label>
                  <Input
                    id="social_discord"
                    name="social_discord"
                    defaultValue={initialSettings.social_discord || ""}
                    placeholder="https://discord.gg/yourserver"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Settings */}
        <TabsContent value="legal">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Юридическая информация
              </CardTitle>
              <CardDescription>
                Реквизиты и правовые документы
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="legal_company_name">Название компании</Label>
                <Input
                  id="legal_company_name"
                  name="legal_company_name"
                  defaultValue={initialSettings.legal_company_name || ""}
                  placeholder="ООО «Мой магазин» или ИП Иванов И.И."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="legal_inn">ИНН</Label>
                  <Input
                    id="legal_inn"
                    name="legal_inn"
                    defaultValue={initialSettings.legal_inn || ""}
                    placeholder="1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_ogrn">ОГРН / ОГРНИП</Label>
                  <Input
                    id="legal_ogrn"
                    name="legal_ogrn"
                    defaultValue={initialSettings.legal_ogrn || ""}
                    placeholder="1234567890123"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="legal_address">Юридический адрес</Label>
                <Textarea
                  id="legal_address"
                  name="legal_address"
                  defaultValue={initialSettings.legal_address || ""}
                  placeholder="123456, г. Москва, ул. Примерная, д. 1, офис 100"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="legal_terms_url">Ссылка на оферту</Label>
                  <Input
                    id="legal_terms_url"
                    name="legal_terms_url"
                    defaultValue={initialSettings.legal_terms_url || ""}
                    placeholder="/terms"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_privacy_url">Политика конфиденциальности</Label>
                  <Input
                    id="legal_privacy_url"
                    name="legal_privacy_url"
                    defaultValue={initialSettings.legal_privacy_url || ""}
                    placeholder="/privacy"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить настройки
          </Button>
        </div>
      </Tabs>
    </form>
  )
}
