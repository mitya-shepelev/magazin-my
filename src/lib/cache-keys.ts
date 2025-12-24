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
  ORDER: (orderId: string) => `order:${orderId}`,
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
