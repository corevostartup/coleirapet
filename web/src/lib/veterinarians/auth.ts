import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE, AUTH_USER_NAME_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserNameCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import { getCurrentVeterinarianProfile } from "@/lib/veterinarians/current";

export type VeterinarianIdentity = {
  uid: string;
  name: string;
  crmv: string;
  specialty: string;
};

export type VetAuthContext = VeterinarianIdentity & {
  /** Alias legado usado nas rotas vet existentes. */
  vetName: string;
};

async function resolveDisplayName(uid: string, profileName: string, fallbackName?: string) {
  const fromProfile = profileName.trim();
  if (fromProfile) return fromProfile.slice(0, 80);

  const fromCookie = fallbackName?.trim();
  if (fromCookie) return fromCookie.slice(0, 80);

  try {
    const authUser = await getFirebaseAdminAuth().getUser(uid);
    const fromAuth = authUser.displayName?.trim();
    if (fromAuth) return fromAuth.slice(0, 80);
  } catch {
    // ignora falha de lookup no Firebase Auth
  }

  return "Veterinario";
}

export async function resolveVeterinarianIdentity(
  uid: string,
  options?: { fallbackName?: string },
): Promise<VeterinarianIdentity> {
  const user = await getOrCreateCurrentUserProfile(uid, {
    fallbackName: options?.fallbackName,
  });
  const vetProfile = await getCurrentVeterinarianProfile(uid);
  const name = await resolveDisplayName(uid, user.name, options?.fallbackName);

  return {
    uid,
    name,
    crmv: (vetProfile?.crmv?.trim() || "").slice(0, 40),
    specialty: (vetProfile?.specialty?.trim() || "").slice(0, 80),
  };
}

export async function requireVetAuthContext(): Promise<VetAuthContext | null> {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  const fallbackName = parseAuthUserNameCookie(jar.get(AUTH_USER_NAME_COOKIE)?.value) ?? undefined;
  if (!session || !uid) return null;

  const user = await getOrCreateCurrentUserProfile(uid, { fallbackName });
  if (user.userType !== "vet") return null;

  const identity = await resolveVeterinarianIdentity(uid, { fallbackName });
  return { ...identity, vetName: identity.name };
}

export function veterinarianFromAuth(auth: VetAuthContext) {
  return {
    name: auth.name,
    crmv: auth.crmv || "Nao informado",
    specialty: auth.specialty,
  };
}

export function createPrescribedByCache(auth: VetAuthContext) {
  const cache = new Map<string, { name: string; crmv: string }>();
  cache.set(auth.uid, { name: auth.name, crmv: auth.crmv || "Nao informado" });
  return cache;
}

type PrescribedBySource = {
  prescribedByName?: string;
  prescribedByCrmv?: string;
  createdByUid?: string;
  recordedByUid?: string;
};

export async function enrichPrescribedBy(
  data: PrescribedBySource,
  auth: VetAuthContext,
  cache: Map<string, { name: string; crmv: string }>,
) {
  const storedName = typeof data.prescribedByName === "string" ? data.prescribedByName.trim() : "";
  const storedCrmv = typeof data.prescribedByCrmv === "string" ? data.prescribedByCrmv.trim() : "";
  if (storedName && storedCrmv && storedCrmv !== "Nao informado") {
    return { prescribedByName: storedName, prescribedByCrmv: storedCrmv };
  }

  const authorUid =
    (typeof data.createdByUid === "string" && data.createdByUid.trim()) ||
    (typeof data.recordedByUid === "string" && data.recordedByUid.trim()) ||
    auth.uid;

  if (!cache.has(authorUid)) {
    const identity = await resolveVeterinarianIdentity(authorUid);
    cache.set(authorUid, {
      name: identity.name,
      crmv: identity.crmv || "Nao informado",
    });
  }

  const resolved = cache.get(authorUid)!;
  return {
    prescribedByName: storedName || resolved.name,
    prescribedByCrmv: storedCrmv && storedCrmv !== "Nao informado" ? storedCrmv : resolved.crmv,
  };
}

export function prescribedByForWrite(auth: VetAuthContext) {
  return {
    prescribedByName: auth.vetName.slice(0, 80),
    prescribedByCrmv: (auth.crmv || "Nao informado").slice(0, 40),
  };
}
