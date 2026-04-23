import { AUTH_SESSION_VALUES, type AuthSessionValue } from "./constants";

export function parseAuthSessionCookie(raw: string | undefined): AuthSessionValue | null {
  if (!raw) return null;
  return AUTH_SESSION_VALUES.includes(raw as AuthSessionValue) ? (raw as AuthSessionValue) : null;
}

export function parseAuthUserNameCookie(raw: string | undefined): string | null {
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw).trim();
    if (!decoded) return null;
    return decoded.slice(0, 80);
  } catch {
    return null;
  }
}

export function parseAuthUserPhotoCookie(raw: string | undefined): string | null {
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw).trim();
    if (!decoded) return null;

    const url = new URL(decoded);
    if (!["http:", "https:"].includes(url.protocol)) return null;

    return decoded.slice(0, 1024);
  } catch {
    return null;
  }
}

export function parseAuthUserUidCookie(raw: string | undefined): string | null {
  if (!raw) return null;

  try {
    const decoded = decodeURIComponent(raw).trim();
    if (!decoded) return null;
    if (decoded.length > 128) return null;
    if (!/^[A-Za-z0-9:_@.-]+$/.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function isProtectedAppPath(pathname: string) {
  if (pathname === "/") return true;
  return ["/health", "/location", "/dados", "/profile", "/vet"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
