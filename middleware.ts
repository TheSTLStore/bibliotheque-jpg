import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/", "/api/auth", "/favicon.ico", "/manifest.json", "/icons"];
const associationRoutes = /^\/public\/[\w-]+/;
const adminRoutes = /^\/admin|^\/api\/admin/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Association routes — no auth needed
  if (associationRoutes.test(pathname)) {
    return NextResponse.next();
  }

  // All other routes require session token
  const token = request.cookies.get("session_token")?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Admin routes require admin cookie
  if (adminRoutes.test(pathname)) {
    const adminToken = request.cookies.get("admin_token")?.value;
    if (!adminToken) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Acces admin requis" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/admin?login=true", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};