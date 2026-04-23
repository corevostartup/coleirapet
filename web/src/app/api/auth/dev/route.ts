import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SEC,
  AUTH_USER_NAME_COOKIE,
  AUTH_USER_PHOTO_COOKIE,
  AUTH_USER_UID_COOKIE,
} from "@/lib/auth/constants";
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
  res.cookies.set(AUTH_USER_NAME_COOKIE, encodeURIComponent("Desenvolvedor(a)"), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
  });
  res.cookies.set(
    AUTH_USER_PHOTO_COOKIE,
    encodeURIComponent("https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=700&q=80"),
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    },
  );
  res.cookies.set(AUTH_USER_UID_COOKIE, encodeURIComponent("dev-user"), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_SESSION_MAX_AGE_SEC,
  });
  return res;
}
