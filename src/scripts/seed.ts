import "dotenv/config"
import { db } from "@/lib/db"
import { hash } from "bcryptjs"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const leatherImage = "/images/products/leather-shop.svg"
const schoolImage = "/images/products/online-school.svg"
const leatherDownload = "/downloads/leather-shop.zip"
const schoolDownload = "/downloads/online-school.zip"

async function ensureDemoAssets() {
  const imageDir = path.join(process.cwd(), "public", "images", "products")
  const downloadsDir = path.join(process.cwd(), "downloads")

  await mkdir(imageDir, { recursive: true })
  await mkdir(downloadsDir, { recursive: true })

  await writeFile(
    path.join(imageDir, "leather-shop.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" width="1184" height="864" viewBox="0 0 1184 864">
  <rect width="1184" height="864" fill="#111827"/>
  <rect x="96" y="96" width="992" height="672" rx="48" fill="#f59e0b"/>
  <rect x="160" y="168" width="864" height="120" rx="24" fill="#1f2937"/>
  <rect x="160" y="344" width="280" height="280" rx="32" fill="#78350f"/>
  <rect x="488" y="344" width="280" height="280" rx="32" fill="#92400e"/>
  <rect x="816" y="344" width="208" height="280" rx="32" fill="#451a03"/>
  <text x="592" y="240" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#f9fafb">Leather Shop</text>
</svg>`,
    "utf8"
  )

  await writeFile(
    path.join(imageDir, "online-school.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" width="1184" height="864" viewBox="0 0 1184 864">
  <rect width="1184" height="864" fill="#0f172a"/>
  <rect x="112" y="112" width="960" height="640" rx="48" fill="#2563eb"/>
  <rect x="184" y="184" width="440" height="344" rx="32" fill="#dbeafe"/>
  <rect x="680" y="184" width="320" height="72" rx="20" fill="#bfdbfe"/>
  <rect x="680" y="304" width="320" height="72" rx="20" fill="#93c5fd"/>
  <rect x="680" y="424" width="320" height="72" rx="20" fill="#60a5fa"/>
  <text x="592" y="640" text-anchor="middle" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="#f8fafc">Online School</text>
</svg>`,
    "utf8"
  )

  await writeFile(
    path.join(downloadsDir, "leather-shop.zip"),
    "Demo archive placeholder for Leather Shop. Replace this file in production.\n",
    "utf8"
  )
  await writeFile(
    path.join(downloadsDir, "online-school.zip"),
    "Demo archive placeholder for Online School. Replace this file in production.\n",
    "utf8"
  )
}

async function main() {
  console.log("Seeding database...")
  await ensureDemoAssets()

  // Создаём админа
  const adminPassword = await hash("admin123", 12)
  const admin = await db.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: adminPassword,
      name: "Администратор",
      role: "ADMIN",
    },
  })
  console.log("Created admin:", admin.email)

  // Создаём тестового пользователя
  const userPassword = await hash("user123", 12)
  const user = await db.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      password: userPassword,
      name: "Тестовый пользователь",
      role: "CUSTOMER",
    },
  })
  console.log("Created user:", user.email)

  // Создаём категории
  const webCategory = await db.category.upsert({
    where: { slug: "veb-prilozheniya" },
    update: {},
    create: {
      name: "Веб приложения",
      slug: "veb-prilozheniya",
      description: "Готовые веб-приложения для вашего бизнеса",
      sortOrder: 1,
      isActive: true,
    },
  })
  console.log("Created category:", webCategory.name)

  const mobileCategory = await db.category.upsert({
    where: { slug: "mobilnye-prilozheniya" },
    update: {},
    create: {
      name: "Мобильные приложения",
      slug: "mobilnye-prilozheniya",
      description: "Мобильные приложения для iOS и Android",
      sortOrder: 2,
      isActive: true,
    },
  })
  console.log("Created category:", mobileCategory.name)

  // Создаём товары
  const product1 = await db.product.upsert({
    where: { slug: "magazin-kozhevnika" },
    update: {
      images: JSON.stringify([leatherImage]),
      downloadFile: leatherDownload,
    },
    create: {
      name: "Магазин кожевника",
      slug: "magazin-kozhevnika",
      shortDesc: "Магазин для продажи товаров из натуральной кожи",
      description: "Полнофункциональный интернет-магазин для продажи изделий из кожи. Включает каталог товаров, корзину, оплату, личный кабинет покупателя.",
      price: 38000,
      oldPrice: 87000,
      images: JSON.stringify([leatherImage]),
      downloadFile: leatherDownload,
      demoUrl: "https://demo.example.com/leather",
      version: "1.0.0",
      categoryId: webCategory.id,
      productType: "WEB_APP",
      features: JSON.stringify(["Каталог товаров", "Корзина", "Онлайн оплата", "Личный кабинет"]),
      isActive: true,
      isFeatured: true,
      supportDays: 30,
    },
  })
  console.log("Created product:", product1.name)

  const product2 = await db.product.upsert({
    where: { slug: "onlajn-shkola" },
    update: {
      images: JSON.stringify([schoolImage]),
      downloadFile: schoolDownload,
    },
    create: {
      name: "Онлайн школа",
      slug: "onlajn-shkola",
      shortDesc: "Онлайн школа для продажи видео курсов",
      description: "Платформа для онлайн-обучения с поддержкой видео-курсов, тестов, сертификатов и системы оплаты.",
      price: 27000,
      oldPrice: 59000,
      images: JSON.stringify([schoolImage]),
      downloadFile: schoolDownload,
      demoUrl: "https://demo.example.com/school",
      version: "2.0.0",
      categoryId: webCategory.id,
      productType: "WEB_APP",
      features: JSON.stringify(["Видео-курсы", "Тесты", "Сертификаты", "Оплата"]),
      isActive: true,
      isFeatured: true,
      supportDays: 45,
    },
  })
  console.log("Created product:", product2.name)

  // Создаём шаблоны этапов для товаров
  // Удаляем старые шаблоны если есть
  await db.stageTemplate.deleteMany({ where: { productId: product1.id } })
  await db.stageTemplate.deleteMany({ where: { productId: product2.id } })

  const stageTemplates1 = [
    {
      productId: product1.id,
      title: "Предоставление данных хостинга",
      description: `## Что нужно сделать

Для установки приложения нам необходимы данные доступа к вашему хостингу:

- **FTP/SFTP доступ:** хост, порт, логин, пароль
- **База данных MySQL:** хост, имя БД, логин, пароль
- **Панель управления:** ссылка и данные входа (если есть)

### Важно
Данные можно отправить в чат ниже. Все данные конфиденциальны и используются только для установки.`,
      type: "CLIENT_ACTION",
      sortOrder: 1,
    },
    {
      productId: product1.id,
      title: "Установка на сервер",
      description: `## Установка приложения

На этом этапе мы:
- Загружаем файлы на ваш хостинг
- Создаём и настраиваем базу данных
- Конфигурируем приложение

Обычно занимает 1-2 рабочих дня.`,
      type: "ADMIN_WORK",
      sortOrder: 2,
    },
    {
      productId: product1.id,
      title: "Настройка домена и SSL",
      description: `## Настройка домена

- Привязываем ваш домен к приложению
- Устанавливаем SSL сертификат (HTTPS)
- Настраиваем редиректы`,
      type: "ADMIN_WORK",
      sortOrder: 3,
    },
    {
      productId: product1.id,
      title: "Проверка работоспособности",
      description: `## Проверьте работу приложения

Пожалуйста, проверьте:
- [ ] Сайт открывается по вашему домену
- [ ] Работает регистрация и вход
- [ ] Каталог товаров отображается корректно
- [ ] Корзина работает
- [ ] Оплата проходит (тестовый режим)

Если всё работает — нажмите кнопку **"Подтверждаю"** ниже.
Если есть проблемы — напишите в чат.`,
      type: "CONFIRMATION",
      sortOrder: 4,
    },
  ]

  for (const template of stageTemplates1) {
    await db.stageTemplate.create({ data: template })
  }
  console.log("Created stage templates for:", product1.name)

  const stageTemplates2 = [
    {
      productId: product2.id,
      title: "Предоставление данных хостинга",
      description: `## Что нужно сделать

Для установки платформы нам нужны:

- **VPS/Сервер:** SSH доступ (IP, порт, логин, пароль или ключ)
- **Домен:** должен быть направлен на сервер
- **Требования:** минимум 2GB RAM, Ubuntu 20.04+

Отправьте данные в чат ниже.`,
      type: "CLIENT_ACTION",
      sortOrder: 1,
    },
    {
      productId: product2.id,
      title: "Установка и настройка сервера",
      description: `## Установка платформы

Мы выполним:
- Установку Node.js, Nginx, PostgreSQL
- Деплой приложения
- Настройку автозапуска и мониторинга

Занимает 2-3 рабочих дня.`,
      type: "ADMIN_WORK",
      sortOrder: 2,
    },
    {
      productId: product2.id,
      title: "Настройка платёжной системы",
      description: `## Подключение оплаты

Для приёма платежей нужны данные от платёжной системы:

- **ЮKassa:** shopId и секретный ключ
- Или **Stripe:** publishable key и secret key

Отправьте данные в чат.`,
      type: "CLIENT_ACTION",
      sortOrder: 3,
    },
    {
      productId: product2.id,
      title: "Интеграция платежей",
      description: `## Настройка оплаты

- Подключаем платёжную систему
- Настраиваем webhook для уведомлений
- Тестируем платежи`,
      type: "ADMIN_WORK",
      sortOrder: 4,
    },
    {
      productId: product2.id,
      title: "Финальная проверка",
      description: `## Проверьте платформу

- [ ] Сайт открывается
- [ ] Регистрация преподавателей и студентов работает
- [ ] Можно создать курс и добавить уроки
- [ ] Оплата курса проходит
- [ ] Видео воспроизводится

Подтвердите, если всё работает.`,
      type: "CONFIRMATION",
      sortOrder: 5,
    },
  ]

  for (const template of stageTemplates2) {
    await db.stageTemplate.create({ data: template })
  }
  console.log("Created stage templates for:", product2.name)

  // Создаём отзывы
  const existingReviews = await db.review.count()
  if (existingReviews === 0) {
    const reviews = [
      {
        name: "Алексей Смирнов",
        company: "ООО «Кожевник»",
        text: "Отличный магазин! Установили за 2 дня, всё работает идеально. Поддержка отвечает быстро.",
        rating: 5,
      },
      {
        name: "Мария Иванова",
        company: "Школа английского",
        text: "Платформа для онлайн-школы превзошла ожидания. Ученики довольны, оплата работает стабильно.",
        rating: 5,
      },
      {
        name: "Дмитрий Козлов",
        company: "ИП Козлов",
        text: "Хороший продукт за свои деньги. Были небольшие вопросы при установке, но поддержка помогла.",
        rating: 4,
      },
    ]

    for (const review of reviews) {
      await db.review.create({ data: review })
    }
    console.log("Created reviews:", reviews.length)
  }

  console.log("Seeding completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
