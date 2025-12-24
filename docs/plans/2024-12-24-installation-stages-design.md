# Система поэтапной установки с чатом

## Обзор

Замена простой модели "оплатил → скачал" на систему поэтапной установки с сопровождением:
- Админ создаёт шаблоны этапов для каждого товара
- После оплаты этапы копируются в заказ
- Клиент видит прогресс установки и общается с админом через чат
- После завершения — период поддержки

## Ключевые решения

- **Гибридный подход:** этапы могут требовать действий от клиента или админа
- **Шаблоны + гибкость:** базовые этапы от товара, но можно изменить для конкретного заказа
- **Два уровня общения:** общий чат заказа + комментарии к конкретным этапам
- **Уведомления:** в интерфейсе + email через Unisender
- **Период поддержки:** настраивается для каждого товара отдельно

---

## Модель данных

### Новые модели Prisma

```prisma
// Шаблон этапа для товара
model StageTemplate {
  id          String   @id @default(cuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  title       String   // "Получение данных хостинга"
  description String   @db.Text // Что нужно сделать (markdown)
  type        String   // "CLIENT_ACTION" | "ADMIN_WORK" | "CONFIRMATION"
  sortOrder   Int      @default(0)

  createdAt   DateTime @default(now())
}

// Этап установки конкретного заказа
model InstallationStage {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  title       String
  description String   @db.Text
  type        String   // "CLIENT_ACTION" | "ADMIN_WORK" | "CONFIRMATION"
  status      String   @default("PENDING") // "PENDING" | "IN_PROGRESS" | "COMPLETED"
  sortOrder   Int      @default(0)

  completedAt DateTime?
  completedBy String?  // userId кто завершил

  comments    StageComment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Сообщения в общем чате заказа
model OrderMessage {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  content   String   @db.Text
  files     String?  @db.Text // JSON array файлов
  isRead    Boolean  @default(false)

  createdAt DateTime @default(now())
}

// Комментарии к этапу
model StageComment {
  id        String   @id @default(cuid())
  stageId   String
  stage     InstallationStage @relation(fields: [stageId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  content   String   @db.Text
  files     String?  @db.Text

  createdAt DateTime @default(now())
}
```

### Изменения в существующих моделях

```prisma
// В Product добавить:
supportDays    Int   @default(30)  // Дней поддержки после завершения
stageTemplates StageTemplate[]

// В Order добавить:
installationStatus String @default("NOT_STARTED")
  // "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SUPPORT"
supportEndsAt      DateTime?  // Когда заканчивается поддержка
stages             InstallationStage[]
messages           OrderMessage[]
```

---

## Жизненный цикл заказа

### После оплаты

1. Webhook получает подтверждение → `Order.status = "PAID"`, `Order.installationStatus = "NOT_STARTED"`
2. Система копирует `StageTemplate` товаров в `InstallationStage` для заказа
3. Отправляется email клиенту и админу

### Статусы этапа

| Статус | Значение | Кто меняет |
|--------|----------|------------|
| `PENDING` | Ожидает начала | — |
| `IN_PROGRESS` | В работе | Админ активирует |
| `COMPLETED` | Завершён | Админ или клиент (для подтверждения) |

### Статусы установки

| Статус | Когда |
|--------|-------|
| `NOT_STARTED` | Сразу после оплаты |
| `IN_PROGRESS` | Когда админ активирует первый этап |
| `COMPLETED` | Все этапы завершены |
| `SUPPORT` | Период поддержки |

### Типы этапов

| Тип | Описание |
|-----|----------|
| `CLIENT_ACTION` | Клиент должен что-то сделать/предоставить |
| `ADMIN_WORK` | Админ выполняет техническую работу |
| `CONFIRMATION` | Клиент проверяет и подтверждает |

### Автоматические переходы

- Последний этап `COMPLETED` → `Order.installationStatus = "COMPLETED"`, `supportEndsAt = now + product.supportDays`
- После `supportEndsAt` — чат становится только для чтения

---

## Интерфейс клиента

### Страница заказа `/cabinet/orders/[id]`

**Структура:**
1. Шапка с номером заказа, статусом, датой оплаты, списком товаров
2. Визуальный прогресс — горизонтальная линия с точками этапов
3. Текущий этап развёрнуто — описание, тип, комментарии
4. Общий чат заказа — внизу или сбоку

**Действия клиента:**
- На этапах `CONFIRMATION` — кнопка "Подтверждаю, всё работает"
- На этапах `CLIENT_ACTION` — возможность написать комментарий/прикрепить файл
- В общем чате — отправка сообщений и файлов

---

## Интерфейс админа

### Список заказов `/admin/orders`

- Фильтры: Все, Ожидают действий, В работе, На поддержке
- Колонки: номер, клиент, сумма, статус установки, прогресс этапов

### Страница заказа `/admin/orders/[id]`

- Данные клиента (имя, email, телефон)
- Кнопки: добавить этап, редактировать этапы
- Этапы с управлением статусом, редактированием описания, комментариями
- Общий чат

### Шаблоны этапов `/admin/products/[id]/stages`

- Настройка срока поддержки (дней)
- Список шаблонов с drag-and-drop сортировкой
- Создание, редактирование, удаление шаблонов

---

## Загрузка файлов

**Хранение:** `/uploads/messages/` (за пределами public)

**Структура JSON:**
```json
{
  "files": [
    {
      "id": "file_abc123",
      "name": "credentials.txt",
      "size": 1024,
      "type": "text/plain",
      "path": "/uploads/messages/order_xxx/file_abc123.txt"
    }
  ]
}
```

**Ограничения:**
- Максимум 5 файлов на сообщение
- Максимум 10 MB на файл
- Типы: изображения, PDF, TXT, архивы (zip, rar)

---

## Email-уведомления (Unisender)

### Клиенту

| Событие | Тема письма |
|---------|-------------|
| Заказ оплачен | "Заказ #xxx оплачен — начинаем установку" |
| Новый этап активирован | "Этап «название» требует вашего внимания" |
| Новое сообщение от админа | "Новое сообщение по заказу #xxx" |
| Установка завершена | "Установка завершена! Поддержка до дд.мм.гггг" |
| Поддержка заканчивается | "Поддержка по заказу #xxx заканчивается через 3 дня" |

### Админу

| Событие | Тема письма |
|---------|-------------|
| Новый оплаченный заказ | "Новый заказ #xxx от Имя Клиента" |
| Клиент завершил свой этап | "Клиент выполнил этап «название»" |
| Новое сообщение от клиента | "Сообщение от клиента по заказу #xxx" |
| Клиент подтвердил этап | "Клиент подтвердил этап «название»" |

---

## API endpoints

### Клиентские (Cabinet)

```
GET  /api/orders/[id]              — Получить заказ с этапами и сообщениями
POST /api/orders/[id]/messages     — Отправить сообщение в чат
POST /api/orders/[id]/upload       — Загрузить файл
POST /api/orders/[id]/stages/[stageId]/comments  — Комментарий к этапу
POST /api/orders/[id]/stages/[stageId]/confirm   — Подтвердить этап
GET  /api/files/[fileId]           — Скачать файл
```

### Админские

```
GET  /api/admin/orders             — Список заказов с фильтрами
GET  /api/admin/orders/[id]        — Детали заказа
POST /api/admin/orders/[id]/stages — Добавить этап
PUT  /api/admin/orders/[id]/stages/[stageId]  — Изменить этап
DELETE /api/admin/orders/[id]/stages/[stageId] — Удалить этап
POST /api/admin/orders/[id]/stages/[stageId]/status — Изменить статус
POST /api/admin/orders/[id]/messages — Отправить сообщение

# Шаблоны
GET  /api/admin/products/[id]/templates        — Получить шаблоны
POST /api/admin/products/[id]/templates        — Создать шаблон
PUT  /api/admin/products/[id]/templates/[tid]  — Изменить
DELETE /api/admin/products/[id]/templates/[tid] — Удалить
PUT  /api/admin/products/[id]/templates/reorder — Изменить порядок
```

---

## Структура файлов

### Новые файлы

```
src/
├── app/
│   ├── api/
│   │   ├── orders/[id]/
│   │   │   ├── route.ts
│   │   │   ├── messages/route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── stages/[stageId]/
│   │   │       ├── comments/route.ts
│   │   │       └── confirm/route.ts
│   │   ├── files/[fileId]/route.ts
│   │   └── admin/
│   │       ├── orders/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── messages/route.ts
│   │       │       └── stages/
│   │       │           ├── route.ts
│   │       │           └── [stageId]/
│   │       │               ├── route.ts
│   │       │               └── status/route.ts
│   │       └── products/[id]/templates/
│   │           ├── route.ts
│   │           ├── [tid]/route.ts
│   │           └── reorder/route.ts
│   ├── cabinet/orders/[id]/page.tsx
│   └── admin/
│       ├── orders/[id]/page.tsx
│       └── products/[id]/stages/page.tsx
├── components/
│   ├── orders/
│   │   ├── StageProgress.tsx
│   │   ├── StageCard.tsx
│   │   ├── StageComments.tsx
│   │   ├── OrderChat.tsx
│   │   ├── ChatMessage.tsx
│   │   └── FileUpload.tsx
│   └── admin/
│       ├── StageTemplateList.tsx
│       ├── StageTemplateForm.tsx
│       └── OrderStageManager.tsx
└── lib/
    ├── unisender.ts
    └── email-templates/
        ├── order-paid.tsx
        ├── stage-activated.tsx
        ├── new-message.tsx
        ├── installation-complete.tsx
        └── support-ending.tsx
```

### Изменения в существующих файлах

```
prisma/schema.prisma
src/app/api/payment/webhook/route.ts
src/app/cabinet/orders/page.tsx
src/app/admin/orders/page.tsx
src/app/admin/products/[id]/page.tsx
```
