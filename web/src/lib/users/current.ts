import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type UserType = "Tutor" | "vet";

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
};

export type UserProfile = {
  userId: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  userType: UserType;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseUserType(value: unknown): UserType {
  if (typeof value !== "string") return "Tutor";
  const normalized = value.trim().toLowerCase();
  return normalized === "vet" ? "vet" : "Tutor";
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
  };
}

type EnsureUserOptions = {
  fallbackName?: string;
  fallbackEmail?: string;
};

export async function getOrCreateCurrentUserProfile(uid: string, options?: EnsureUserOptions): Promise<UserProfile> {
  const db = getFirebaseAdminDb();
  const userRef = db.collection(COLLECTION_USER).doc(uid);
  const userSnap = await userRef.get();
  const nowIso = new Date().toISOString();

  if (!userSnap.exists) {
    const created: UserDoc = {
      uid,
      userId: uid,
      UserID: uid,
      createdAt: nowIso,
      CreatedAt: nowIso,
      updatedAt: nowIso,
      name: parseText(options?.fallbackName),
      email: parseText(options?.fallbackEmail),
      phone: "",
      birthDate: "",
      userType: "Tutor",
    };
    await userRef.set(created, { merge: true });
    return toUserProfile(uid, created);
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
  if (!parseText(raw.userType)) {
    patch.userType = "Tutor";
  } else if (raw.userType !== normalizedType) {
    patch.userType = normalizedType;
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = nowIso;
    await userRef.set(patch, { merge: true });
  }

  return toUserProfile(uid, { ...raw, ...patch });
}
