# Project Overview: magazin-my

**magazin-my** is a full-stack e-commerce application designed for selling digital goods (software, scripts, etc.). It features a modern user interface, real-time chat support, and a comprehensive admin dashboard.

## Architecture & Tech Stack

The project is a monorepo-style structure containing the main Next.js application and a separate WebSocket server.

- **Frontend & API:** [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** [Prisma](https://www.prisma.io/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) with [Shadcn UI](https://ui.shadcn.com/) components
- **Real-time:** Socket.io (Standalone server in `ws-server/`) with Redis adapter
- **Authentication:** NextAuth.js
- **Infrastructure:** Docker & Docker Compose (for services)

## Key Directories

- `src/app`: Next.js App Router pages and layouts.
  - `(auth)`: Authentication pages (login, register).
  - `(shop)`: Public store pages (catalog, product, cart).
  - `admin`: Admin dashboard pages.
  - `cabinet`: User dashboard pages.
- `src/components`: Reusable UI components.
- `src/lib`: Utility functions, database clients, and service logic.
- `prisma`: Database schema (`schema.prisma`) and migrations.
- `ws-server`: Separate Node.js application for handling WebSocket connections.
- `scripts`: Utility scripts (seeding, admin creation).
- `public`: Static assets.

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- PostgreSQL
- Redis (optional, required for WS scaling)
- Docker (optional, for running services)

### Installation

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
    *Note: A `postinstall` script automatically runs `prisma generate`.*

2.  **Environment Setup:**
    - Ensure `.env` is configured with `DATABASE_URL`, `NEXTAUTH_SECRET`, `REDIS_HOST`, etc.

3.  **Database Setup:**
    ```bash
    npm run db:migrate  # Apply migrations
    npm run db:seed     # Create default admin user
    ```

### Running the Application

**1. Main Application (Next.js):**
```bash
npm run dev
```
Runs on `http://localhost:3000`.

**2. WebSocket Server:**
*Local:*
```bash
cd ws-server
npm install
npm run dev
```
*Docker:*
```bash
cd ws-server
docker-compose up -d
```
Runs on port `3001` (or `3004` depending on configuration).

## Development Conventions

- **Database Changes:** Always modify `prisma/schema.prisma` and run `npm run db:migrate` to update the schema. Do not manually modify the database.
- **Type Safety:** Use generated Prisma types for DB entities. Ensure `prisma generate` is run after schema changes.
- **Components:** Prefer using existing Shadcn UI components in `src/components/ui`.
- **Icons:** Uses `lucide-react`.
- **State Management:** Uses React Server Components for data fetching where possible. Client-side state uses React hooks (`useState`, `useContext`).

## Common Tasks

- **Create Admin User:**
  ```bash
  npm run db:seed
  # Or with arguments:
  npx tsx scripts/create-admin.ts <email> <password> <name>
  ```

- **Prisma Studio (DB GUI):**
  ```bash
  npm run db:studio
  ```

- **Linting:**
  ```bash
  npm run lint
  ```
