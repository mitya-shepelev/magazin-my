import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./db"

const nextAuth = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as { role: string }).role
        token.name = user.name
      }

      // Handle session update (when update() is called from client)
      if (trigger === "update" && session?.name) {
        token.name = session.name
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.name = token.name as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})

export const { handlers, signIn, signOut } = nextAuth

function isSmokeAuthDisabled() {
  return process.env.NODE_ENV !== "production" && process.env.INTERNAL_SMOKE_AUTH_DISABLED === "1"
}

function getSmokeTestSession() {
  if (process.env.NODE_ENV === "production") {
    return null
  }

  const userId = process.env.INTERNAL_SMOKE_AUTH_USER_ID
  const role = process.env.INTERNAL_SMOKE_AUTH_ROLE

  if (!userId || !role) {
    return null
  }

  return {
    user: {
      id: userId,
      role,
      email: process.env.INTERNAL_SMOKE_AUTH_EMAIL || "smoke@example.com",
      name: process.env.INTERNAL_SMOKE_AUTH_NAME || "Smoke User",
      image: null,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  }
}

export async function auth() {
  if (isSmokeAuthDisabled()) {
    return null
  }

  return getSmokeTestSession() ?? nextAuth.auth()
}
