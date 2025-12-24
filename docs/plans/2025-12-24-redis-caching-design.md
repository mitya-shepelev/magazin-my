# Redis Caching Design

**Дата:** 2025-12-24
**Цель:** Подключить Redis для кеширования данных, улучшить скорость загрузки и пользовательский опыт

## Решения

- **Redis-клиент:** ioredis
- **Стратегия инвалидации:** Гибридная (TTL + явная инвалидация при изменениях)
- **Подключение:** localhost:6379, пароль: 1234 (ServBay)

## Что кешируем

| Тип данных | TTL | Инвалидация |
|------------|-----|-------------|
| Настройки сайта | 10 мин | При изменении в админке |
| Категории | 5 мин | При CRUD категорий |
| Список товаров | 3 мин | При CRUD товаров |
| Детали товара | 3 мин | При обновлении товара |
| Данные пользователя | 24 часа | При обновлении профиля |
| Этапы заказа | 1 мин | При изменении статуса |
| Сообщения чата | 1 мин | При отправке сообщения |

## Архитектура

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Клиент    │────▶│  Next.js    │────▶│    Redis    │
│  (браузер)  │     │   Server    │     │   (кеш)     │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                   │
                           │ cache miss        │
                           ▼                   │
                    ┌─────────────┐            │
                    │ PostgreSQL  │◀───────────┘
                    │    (БД)     │   cache set
                    └─────────────┘
```

## Новые файлы

### `src/lib/redis.ts`

```typescript
import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

function createRedisClient() {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
  })
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
```

### `src/lib/cache-keys.ts`

```typescript
export const CACHE_KEYS = {
  // Публичные данные
  CATEGORIES: 'categories:all',
  PRODUCTS_LIST: 'products:list',
  PRODUCT: (slug: string) => `product:${slug}`,
  CATEGORY_PRODUCTS: (slug: string) => `category:${slug}:products`,
  SETTINGS: 'settings:site',

  // Пользователи
  USER: (userId: string) => `user:${userId}`,

  // Заказы
  ORDER_STAGES: (orderId: string) => `order:${orderId}:stages`,
  ORDER_MESSAGES: (orderId: string) => `order:${orderId}:messages`,
}

export const CACHE_TTL = {
  SETTINGS: 600,      // 10 минут
  CATEGORIES: 300,    // 5 минут
  PRODUCTS: 180,      // 3 минуты
  USER: 86400,        // 24 часа
  ORDER_DATA: 60,     // 1 минута
}
```

### `src/lib/cache.ts`

```typescript
import { redis } from './redis'

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  try {
    // Пробуем получить из кеша
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    console.error('Redis get error:', error)
    // При ошибке Redis — идём в БД
  }

  // Cache miss — выполняем запрос
  const data = await fetcher()

  try {
    // Сохраняем в кеш
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.error('Redis set error:', error)
  }

  return data
}

export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (error) {
    console.error('Redis invalidate error:', error)
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.error('Redis invalidate pattern error:', error)
  }
}
```

## Изменения в существующих файлах

### `src/actions/products.ts`

После `createProduct`, `updateProduct`, `deleteProduct`:
```typescript
import { invalidate } from '@/lib/cache'
import { CACHE_KEYS } from '@/lib/cache-keys'

// В конце каждой функции:
await invalidate(CACHE_KEYS.PRODUCTS_LIST)
await invalidate(CACHE_KEYS.PRODUCT(slug))
await invalidatePattern('category:*:products')
```

### `src/actions/categories.ts`

После CRUD операций:
```typescript
await invalidate(CACHE_KEYS.CATEGORIES)
await invalidate(CACHE_KEYS.PRODUCTS_LIST)
```

### `src/actions/settings.ts`

После обновления настроек:
```typescript
await invalidate(CACHE_KEYS.SETTINGS)
```

### `src/app/(shop)/catalog/page.tsx`

```typescript
import { cached } from '@/lib/cache'
import { CACHE_KEYS, CACHE_TTL } from '@/lib/cache-keys'

const products = await cached(
  CACHE_KEYS.PRODUCTS_LIST,
  () => db.product.findMany({ where: { isActive: true }, include: { category: true } }),
  CACHE_TTL.PRODUCTS
)
```

### `src/app/(shop)/product/[slug]/page.tsx`

```typescript
const product = await cached(
  CACHE_KEYS.PRODUCT(slug),
  () => db.product.findUnique({ where: { slug }, include: { category: true, seo: true } }),
  CACHE_TTL.PRODUCTS
)
```

### `src/app/cabinet/orders/[id]/page.tsx`

```typescript
// Для этапов и сообщений — короткий TTL
const stages = await cached(
  CACHE_KEYS.ORDER_STAGES(orderId),
  () => db.orderStage.findMany({ where: { orderId }, orderBy: { sortOrder: 'asc' } }),
  CACHE_TTL.ORDER_DATA
)
```

### API routes для чата

`src/app/api/orders/[id]/messages/route.ts`:
```typescript
// После POST (отправка сообщения):
await invalidate(CACHE_KEYS.ORDER_MESSAGES(orderId))
```

`src/app/api/orders/[id]/stages/route.ts`:
```typescript
// После PATCH (обновление статуса):
await invalidate(CACHE_KEYS.ORDER_STAGES(orderId))
```

## Переменные окружения

Добавить в `.env`:
```bash
# Redis (ServBay)
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="1234"
```

## Зависимости

```bash
npm install ioredis
```

## Порядок реализации

1. Установить ioredis
2. Добавить переменные в .env
3. Создать src/lib/redis.ts, cache.ts, cache-keys.ts
4. Добавить кеширование в страницы каталога/товаров
5. Добавить инвалидацию в actions (products, categories, settings)
6. Добавить кеширование этапов/сообщений заказов
7. Добавить инвалидацию в API routes чата
8. Тестирование

## Важно для чата

- TTL 60 секунд — страховка, основная актуальность через инвалидацию
- При отправке сообщения — мгновенный сброс кеша
- При обновлении статуса этапа — мгновенный сброс кеша
- Клиент получает свежие данные при следующем запросе
