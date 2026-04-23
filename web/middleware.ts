import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth/constants";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { isProtectedAppPath, parseAuthSessionCookie } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseAuthSessionCookie(request.cookies.get(AUTH_SESSION_COOKIE)?.value);

  if (pathname === "/") {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    if (session === "dev" && !isDevAuthBypassEnabled()) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete(AUTH_SESSION_COOKIE);
      return res;
    }
    return NextResponse.redirect(new URL("/home", request.url));
  }

  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session === "dev" && !isDevAuthBypassEnabled()) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(AUTH_SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
