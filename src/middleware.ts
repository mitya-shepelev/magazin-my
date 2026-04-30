import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isSecureRequest =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https"

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: isSecureRequest,
  })

  const isLoggedIn = !!token
  const isAdmin = token?.role === "ADMIN"

  // Защита админ-панели
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  // Защита личного кабинета
  if (pathname.startsWith("/cabinet")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  // Редирект авторизованных пользователей со страницы логина
  if (pathname === "/login" || pathname === "/register") {
    if (isLoggedIn) {
      // Админов редиректим в админ-панель, остальных на главную
      const redirectUrl = isAdmin ? "/admin" : "/"
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/cabinet/:path*", "/login", "/register"],
}
