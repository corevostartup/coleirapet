import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS, COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getPetImageOrDefault } from "@/lib/pets/image";

type PetDoc = {
  ownerId?: string;
  name?: string;
  petIdentity?: string;
  breed?: string;
  image?: string;
  sex?: string;
  size?: string;
  weightKg?: number | string;
  birthDate?: string;
  nfcId?: string;
  lastNfcAccessAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type UserDoc = {
  userId?: string;
  UserID?: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  plan?: string;
  userType?: string;
  createdAt?: string;
  CreatedAt?: string;
  photoURL?: string;
  userPhotoUrl?: string;
  picture?: string;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parsePhotoUrl(...values: unknown[]) {
  for (const value of values) {
    const url = parseText(value);
    if (!url) continue;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  }
  return "";
}

function parseIsoDate(value: unknown) {
  const raw = parseText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function parsePlan(value: unknown) {
  return parseText(value).toLowerCase() === "pro" ? "pro" : "free";
}

function parseUserType(value: unknown) {
  return parseText(value).toLowerCase() === "vet" ? "vet" : "Tutor";
}

function parseWeight(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return "";
    return normalized;
  }
  return "";
}

function userAliases(docId: string, data: UserDoc) {
  return Array.from(new Set([docId, parseText(data.userId), parseText(data.UserID), parseText(data.uid)].filter(Boolean)));
}

async function requireAuth() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const petId = parseText(url.searchParams.get("petId"));
  if (!petId) return NextResponse.json({ error: "petId obrigatorio" }, { status: 400 });

  const db = getFirebaseAdminDb();
  const petRef = db.collection(COLLECTION_PETS).doc(petId);
  const petSnap = await petRef.get();
  if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

  const petData = (petSnap.data() ?? {}) as PetDoc;
  const ownerId = parseText(petData.ownerId);

  const usersSnapshot = await db.collection(COLLECTION_USER).limit(1500).get();
  const usersByAlias = new Map<string, { docId: string; data: UserDoc }>();
  for (const userDoc of usersSnapshot.docs) {
    const userData = (userDoc.data() ?? {}) as UserDoc;
    for (const alias of userAliases(userDoc.id, userData)) {
      usersByAlias.set(alias, { docId: userDoc.id, data: userData });
    }
  }

  const ownerResolved = ownerId ? usersByAlias.get(ownerId) : undefined;
  const ownerDoc = ownerResolved?.data;

  return NextResponse.json({
    pet: {
      id: petSnap.id,
      name: parseText(petData.name, "Pet sem nome"),
      petIdentity: parseText(petData.petIdentity, petSnap.id),
      breed: parseText(petData.breed, "Nao informado"),
      image: getPetImageOrDefault(parseText(petData.image)),
      sex: parseText(petData.sex, "Nao informado"),
      size: parseText(petData.size, "Nao informado"),
      weightKg: parseWeight(petData.weightKg),
      birthDate: parseIsoDate(petData.birthDate),
      nfcId: parseText(petData.nfcId),
      lastNfcAccessAt: parseText(petData.lastNfcAccessAt),
      ownerId,
      createdAt: parseIsoDate(petData.createdAt) || parseIsoDate(petData.updatedAt),
    },
    owner: ownerDoc
      ? {
          id: parseText(ownerDoc.userId) || parseText(ownerDoc.UserID) || parseText(ownerDoc.uid) || ownerResolved?.docId || ownerId,
          docId: ownerResolved?.docId || "",
          name: parseText(ownerDoc.name, "Tutor sem nome"),
          email: parseText(ownerDoc.email, "Sem email"),
          phone: parseText(ownerDoc.phone),
          birthDate: parseIsoDate(ownerDoc.birthDate),
          plan: parsePlan(ownerDoc.plan),
          userType: parseUserType(ownerDoc.userType),
          createdAt: parseIsoDate(ownerDoc.createdAt) || parseIsoDate(ownerDoc.CreatedAt),
          photoUrl: parsePhotoUrl(ownerDoc.photoURL, ownerDoc.userPhotoUrl, ownerDoc.picture),
        }
      : null,
  });
}
