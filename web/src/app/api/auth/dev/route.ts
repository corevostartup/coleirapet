import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_SESSION_MAX_AGE_SEC } from "@/lib/auth/constants";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";

export async function POST() {
  if (!isDevAuthBypassEnabled()) {
    return NextResponse.json({ error: "Dev auth desativado" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_SESSION_COOKIE, "dev", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
  });
  return res;
}
