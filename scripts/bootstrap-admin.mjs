import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import { Pool } from "pg"

const databaseUrl = process.env.DATABASE_URL
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME?.trim() || "Administrator"
const shouldUpdatePassword = process.env.ADMIN_BOOTSTRAP_UPDATE_PASSWORD === "true"

if (!email && !password) {
  console.log("[admin-bootstrap] ADMIN_EMAIL and ADMIN_PASSWORD are not set; skipping.")
  process.exit(0)
}

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set together")
}

const pool = new Pool({ connectionString: databaseUrl })

try {
  const existing = await pool.query('SELECT "id", "role" FROM "User" WHERE "email" = $1', [
    email,
  ])

  if (existing.rowCount && !shouldUpdatePassword) {
    await pool.query(
      `
      UPDATE "User"
      SET "name" = $2, "role" = 'ADMIN', "updatedAt" = NOW()
      WHERE "email" = $1
      `,
      [email, name]
    )

    console.log(
      `[admin-bootstrap] Admin already exists: ${email}. Role/name ensured; password unchanged.`
    )
    console.log(
      "[admin-bootstrap] Set ADMIN_BOOTSTRAP_UPDATE_PASSWORD=true to rotate the password."
    )
  } else {
    const hashedPassword = await bcrypt.hash(password, 12)

    if (existing.rowCount) {
      await pool.query(
        `
        UPDATE "User"
        SET "password" = $2, "name" = $3, "role" = 'ADMIN', "updatedAt" = NOW()
        WHERE "email" = $1
        `,
        [email, hashedPassword, name]
      )

      console.log(`[admin-bootstrap] Admin password rotated: ${email}`)
    } else {
      await pool.query(
        `
        INSERT INTO "User" ("id", "email", "password", "name", "role", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, 'ADMIN', NOW(), NOW())
        `,
        [randomUUID(), email, hashedPassword, name]
      )

      console.log(`[admin-bootstrap] Admin created: ${email}`)
    }
  }
} finally {
  await pool.end()
}
