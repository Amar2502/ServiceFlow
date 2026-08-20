import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy handler (`src/proxy.ts`).
 *
 * Routing Rules:
 * 1. Authenticated user (`sf_session` or `token` cookie present):
 *    - Accessing guest routes (`/`, `/login`, `/register`) -> Redirect directly to `/dashboard`.
 * 2. Unauthenticated user:
 *    - Accessing protected routes (`/dashboard/*`) -> Redirect to `/login`.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get("sf_session")?.value;
  const tokenCookie = request.cookies.get("token")?.value;

  const isAuthenticated = Boolean(sessionCookie || tokenCookie);

  const isGuestRoute =
    pathname === "/" || pathname === "/login" || pathname === "/register";
  const isProtectedRoute = pathname.startsWith("/dashboard");

  // If user is authenticated and attempts to visit homepage, login, or register page
  if (isAuthenticated && isGuestRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is NOT authenticated and attempts to access protected dashboard routes
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/dashboard/:path*",
  ],
};
