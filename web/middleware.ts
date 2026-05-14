import { NextResponse, type NextRequest } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { isProtectedAppPath, parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseAuthSessionCookie(request.cookies.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(request.cookies.get(AUTH_USER_UID_COOKIE)?.value);
  const hasValidSession = Boolean(session && uid && !(session === "dev" && !isDevAuthBypassEnabled()));

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasValidSession ? "/home" : "/login", request.url));
  }

  if (pathname === "/login" || pathname === "/criar-conta" || pathname === "/verify") {
    if ((session && !uid) || (session === "dev" && !isDevAuthBypassEnabled())) {
      const res = NextResponse.next();
      res.cookies.delete(AUTH_SESSION_COOKIE);
      res.cookies.delete(AUTH_USER_UID_COOKIE);
      return res;
    }
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return NextResponse.next();
  }

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next();
  }

  if (!session || !uid) {
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
