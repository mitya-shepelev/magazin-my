import "dotenv/config"
import { spawnSync } from "node:child_process"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("DATABASE_URL is required in .env")
  process.exit(1)
}

const url = new URL(databaseUrl)
const composeArgs = process.argv.slice(2)

if (composeArgs.length === 0) {
  console.error("Usage: npm run docker:local -- <compose args>")
  process.exit(1)
}

const env = {
  ...process.env,
  POSTGRES_DB: url.pathname.slice(1),
  POSTGRES_USER: decodeURIComponent(url.username),
  POSTGRES_PASSWORD: decodeURIComponent(url.password),
  POSTGRES_PORT: url.port || "5432",
  REDIS_PORT: process.env.REDIS_PORT || "6379",
}

const result = spawnSync(
  "docker",
  ["compose", "-f", "docker-compose.local.yml", ...composeArgs],
  {
    env,
    stdio: "inherit",
  }
)

process.exit(result.status ?? 1)
