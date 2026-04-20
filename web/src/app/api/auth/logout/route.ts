import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE } from "@/lib/auth/constants";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return res;
}
