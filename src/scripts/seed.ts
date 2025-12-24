import { db } from "@/lib/db"
import { hash } from "bcryptjs"

async function main() {
  console.log("Seeding database...")

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
    update: {},
    create: {
      name: "Магазин кожевника",
      slug: "magazin-kozhevnika",
      shortDesc: "Магазин для продажи товаров из натуральной кожи",
      description: "Полнофункциональный интернет-магазин для продажи изделий из кожи. Включает каталог товаров, корзину, оплату, личный кабинет покупателя.",
      price: 38000,
      oldPrice: 87000,
      images: JSON.stringify(["/images/products/leather-shop.jpg"]),
      downloadFile: "/downloads/leather-shop.zip",
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
    update: {},
    create: {
      name: "Онлайн школа",
      slug: "onlajn-shkola",
      shortDesc: "Онлайн школа для продажи видео курсов",
      description: "Платформа для онлайн-обучения с поддержкой видео-курсов, тестов, сертификатов и системы оплаты.",
      price: 27000,
      oldPrice: 59000,
      images: JSON.stringify(["/images/products/online-school.jpg"]),
      downloadFile: "/downloads/online-school.zip",
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
