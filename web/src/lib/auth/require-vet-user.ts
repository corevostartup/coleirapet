import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_USER_UID_COOKIE } from "./constants";
import { parseAuthUserUidCookie } from "./session";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

/** Garante que o usuario logado eh veterinario para acessar a area medica. */
export async function requireVetUser() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!uid) redirect("/");

  const user = await getOrCreateCurrentUserProfile(uid);
  if (user.userType !== "vet") redirect("/");
  return user;
}
