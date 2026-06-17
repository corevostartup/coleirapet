import { randomUUID } from "node:crypto";
import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type UserType = "Tutor" | "vet";
type UserPlan = "free" | "pro";

type UserDoc = {
  uid?: string;
  userId?: string;
  UserID?: string;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string;
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  userType?: UserType;
  plan?: UserPlan;
  tutorCode?: string;
  searchName?: string;
};

export type UserProfile = {
  userId: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  userType: UserType;
  plan: UserPlan;
  tutorCode: string;
};

const CURRENT_USER_CACHE_TTL_MS = 45_000;
const currentUserProfileCache = new Map<string, { expiresAt: number; value: UserProfile }>();

function cloneUserProfile(profile: UserProfile): UserProfile {
  return { ...profile };
}

function readCachedUserProfile(uid: string): UserProfile | null {
  const hit = currentUserProfileCache.get(uid);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    currentUserProfileCache.delete(uid);
    return null;
  }
  return cloneUserProfile(hit.value);
}

function writeCachedUserProfile(uid: string, profile: UserProfile) {
  currentUserProfileCache.set(uid, {
    expiresAt: Date.now() + CURRENT_USER_CACHE_TTL_MS,
    value: cloneUserProfile(profile),
  });
}

export function invalidateCurrentUserProfileCache(uid?: string) {
  if (uid) {
    currentUserProfileCache.delete(uid);
    return;
  }
  currentUserProfileCache.clear();
}

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseTutorCode(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toUpperCase();
  if (!/^LYK-[A-Z0-9]{6}$/.test(normalized)) return "";
  return normalized;
}

function randomTutorCodeSuffix() {
  return randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

async function generateUniqueTutorCode(db: ReturnType<typeof getFirebaseAdminDb>) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const candidate = `LYK-${randomTutorCodeSuffix()}`;
    const duplicated = await db.collection(COLLECTION_USER).where("tutorCode", "==", candidate).limit(1).get();
    if (duplicated.empty) return candidate;
  }
  throw new Error("Nao foi possivel gerar tutorCode unico.");
}

export function normalizeNameForSearch(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseUserType(value: unknown): UserType {
  if (typeof value !== "string") return "Tutor";
  const normalized = value.trim().toLowerCase();
  return normalized === "vet" ? "vet" : "Tutor";
}

function parseUserPlan(value: unknown): UserPlan {
  if (typeof value !== "string") return "free";
  const normalized = value.trim().toLowerCase();
  return normalized === "pro" ? "pro" : "free";
}

function toUserProfile(uid: string, data: UserDoc): UserProfile {
  const createdAt = parseText(data.createdAt) || parseText(data.CreatedAt) || new Date().toISOString();
  return {
    userId: parseText(data.userId) || parseText(data.UserID) || uid,
    createdAt,
    name: parseText(data.name),
    email: parseText(data.email),
    phone: parseText(data.phone),
    birthDate: parseText(data.birthDate),
    userType: parseUserType(data.userType),
    plan: parseUserPlan(data.plan),
    tutorCode: parseTutorCode(data.tutorCode),
  };
}

type EnsureUserOptions = {
  fallbackName?: string;
  fallbackEmail?: string;
};

export async function getOrCreateCurrentUserProfile(uid: string, options?: EnsureUserOptions): Promise<UserProfile> {
  const cached = readCachedUserProfile(uid);
  if (cached) return cached;

  const db = getFirebaseAdminDb();
  const userRef = db.collection(COLLECTION_USER).doc(uid);
  const userSnap = await userRef.get();
  const nowIso = new Date().toISOString();

  if (!userSnap.exists) {
    const tutorCode = await generateUniqueTutorCode(db);
    const resolvedName = parseText(options?.fallbackName);
    const created: UserDoc = {
      uid,
      userId: uid,
      UserID: uid,
      createdAt: nowIso,
      CreatedAt: nowIso,
      updatedAt: nowIso,
      name: resolvedName,
      email: parseText(options?.fallbackEmail),
      phone: "",
      birthDate: "",
      userType: "Tutor",
      plan: "free",
      tutorCode,
      searchName: normalizeNameForSearch(resolvedName),
    };
    await userRef.set(created, { merge: true });
    const next = toUserProfile(uid, created);
    writeCachedUserProfile(uid, next);
    return next;
  }

  const raw = (userSnap.data() ?? {}) as UserDoc;
  const patch: Partial<UserDoc> = {};

  if (!parseText(raw.userId) && !parseText(raw.UserID)) {
    patch.userId = uid;
    patch.UserID = uid;
  } else {
    if (!parseText(raw.userId)) patch.userId = parseText(raw.UserID) || uid;
    if (!parseText(raw.UserID)) patch.UserID = parseText(raw.userId) || uid;
  }

  if (!parseText(raw.createdAt) && !parseText(raw.CreatedAt)) {
    patch.createdAt = nowIso;
    patch.CreatedAt = nowIso;
  } else {
    if (!parseText(raw.createdAt)) patch.createdAt = parseText(raw.CreatedAt) || nowIso;
    if (!parseText(raw.CreatedAt)) patch.CreatedAt = parseText(raw.createdAt) || nowIso;
  }

  if (!parseText(raw.name) && parseText(options?.fallbackName)) patch.name = parseText(options?.fallbackName);
  if (!parseText(raw.email) && parseText(options?.fallbackEmail)) patch.email = parseText(options?.fallbackEmail);
  const normalizedType = parseUserType(raw.userType);
  const normalizedPlan = parseUserPlan(raw.plan);
  if (!parseText(raw.userType)) {
    patch.userType = "Tutor";
  } else if (raw.userType !== normalizedType) {
    patch.userType = normalizedType;
  }
  if (!parseText(raw.plan)) {
    patch.plan = "free";
  } else if (raw.plan !== normalizedPlan) {
    patch.plan = normalizedPlan;
  }

  const tutorCode = parseTutorCode(raw.tutorCode);
  if (!tutorCode) {
    patch.tutorCode = await generateUniqueTutorCode(db);
  }

  const baseName = parseText((patch.name ?? raw.name) as unknown);
  const normalizedSearchName = normalizeNameForSearch(baseName);
  if (raw.searchName !== normalizedSearchName) {
    patch.searchName = normalizedSearchName;
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = nowIso;
    await userRef.set(patch, { merge: true });
  }

  const next = toUserProfile(uid, { ...raw, ...patch });
  writeCachedUserProfile(uid, next);
  return next;
}
