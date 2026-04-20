import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_SESSION_COOKIE } from "./constants";
import { isDevAuthBypassEnabled } from "./dev-bypass";
import { parseAuthSessionCookie } from "./session";

/** Garante sessão antes de renderizar telas principais (complementa o middleware). */
export async function requireSession() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  if (!session) redirect("/login");
  if (session === "dev" && !isDevAuthBypassEnabled()) redirect("/login");
}
