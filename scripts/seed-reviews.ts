import { db } from "../src/lib/db"

async function seedReviews() {
  console.log("Seeding reviews...")

  const reviews = [
    {
      name: "Александр Петров",
      company: "ООО ТехноСтарт",
      text: "Отличное решение для нашего бизнеса! Сэкономили 3 месяца разработки. Поддержка отвечает быстро и помогает с любыми вопросами.",
      rating: 5,
    },
    {
      name: "Мария Иванова",
      company: "Школа английского",
      text: "Купили онлайн-школу для курсов. Всё работает из коробки, документация понятная. Рекомендую!",
      rating: 5,
    },
    {
      name: "Дмитрий Козлов",
      company: "Фриланс",
      text: "Использую как основу для клиентских проектов. Качественный код, легко кастомизировать. Обновления приходят регулярно.",
      rating: 5,
    },
  ]

  for (const review of reviews) {
    await db.review.create({
      data: review,
    })
  }

  console.log(`Created ${reviews.length} reviews`)
}

seedReviews()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
