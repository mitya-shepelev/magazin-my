import "dotenv/config"
import bcrypt from "bcryptjs"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client.js"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const email = process.argv[2] || "admin@example.com"
  const password = process.argv[3] || "admin123"
  const name = process.argv[4] || "Администратор"

  const hashedPassword = await bcrypt.hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      name,
    },
    create: {
      email,
      password: hashedPassword,
      role: "ADMIN",
      name,
    },
  })

  console.log("Администратор создан:")
  console.log(`  Email: ${admin.email}`)
  console.log(`  Password: ${password}`)
  console.log(`  Name: ${admin.name}`)
  console.log(`  Role: ${admin.role}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
