import { AUTH_SESSION_VALUES, type AuthSessionValue } from "./constants";

export function parseAuthSessionCookie(raw: string | undefined): AuthSessionValue | null {
  if (!raw) return null;
  return AUTH_SESSION_VALUES.includes(raw as AuthSessionValue) ? (raw as AuthSessionValue) : null;
}

export function isProtectedAppPath(pathname: string) {
  if (pathname === "/") return true;
  return ["/health", "/location", "/dados", "/profile"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
