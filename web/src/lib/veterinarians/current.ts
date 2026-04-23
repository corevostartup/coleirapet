import { COLLECTION_VETERINARIANS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export type VeterinarianProfile = {
  userId: string;
  crmv: string;
  specialty: string;
  validationStatus: string;
  bio: string;
  createdAt: string;
};

type VeterinarianDoc = {
  userId?: string;
  crmv?: string;
  specialty?: string;
  validationStatus?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toVeterinarianProfile(uid: string, raw: VeterinarianDoc): VeterinarianProfile {
  return {
    userId: parseText(raw.userId) || uid,
    crmv: parseText(raw.crmv),
    specialty: parseText(raw.specialty),
    validationStatus: parseText(raw.validationStatus) || "Pendente",
    bio: parseText(raw.bio),
    createdAt: parseText(raw.createdAt) || new Date().toISOString(),
  };
}

export async function getCurrentVeterinarianProfile(uid: string): Promise<VeterinarianProfile | null> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_VETERINARIANS).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return toVeterinarianProfile(uid, (snap.data() ?? {}) as VeterinarianDoc);
}

export async function upsertCurrentVeterinarianProfile(
  uid: string,
  input: { crmv?: string; specialty?: string; bio?: string },
): Promise<VeterinarianProfile> {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_VETERINARIANS).doc(uid);
  const snap = await ref.get();
  const nowIso = new Date().toISOString();
  const current = (snap.data() ?? {}) as VeterinarianDoc;

  const updates: VeterinarianDoc = {
    userId: uid,
    updatedAt: nowIso,
  };
  if (!parseText(current.createdAt)) updates.createdAt = nowIso;
  if (!parseText(current.validationStatus)) updates.validationStatus = "Pendente";

  if (input.crmv !== undefined) updates.crmv = input.crmv;
  if (input.specialty !== undefined) updates.specialty = input.specialty;
  if (input.bio !== undefined) updates.bio = input.bio;

  await ref.set(updates, { merge: true });
  const refreshed = await ref.get();
  return toVeterinarianProfile(uid, (refreshed.data() ?? {}) as VeterinarianDoc);
}
