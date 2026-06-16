import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS, COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getPetImageOrDefault } from "@/lib/pets/image";

type UserPlan = "free" | "pro";
type UserType = "Tutor" | "vet";

type UserDoc = {
  userId?: string;
  UserID?: string;
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  photoURL?: string;
  userPhotoUrl?: string;
  picture?: string;
  userType?: string;
  plan?: string;
  createdAt?: string;
  CreatedAt?: string;
};

type PetDoc = {
  ownerId?: string;
  name?: string;
  petIdentity?: string;
  breed?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
  nfcId?: string;
  lastNfcAccessAt?: string;
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

function parseUserPlan(value: unknown): UserPlan {
  if (typeof value !== "string") return "free";
  return value.trim().toLowerCase() === "pro" ? "pro" : "free";
}

function parseUserType(value: unknown): UserType {
  if (typeof value !== "string") return "Tutor";
  return value.trim().toLowerCase() === "vet" ? "vet" : "Tutor";
}

async function requireAuth() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

async function resolveUserDocRef(userId: string) {
  const db = getFirebaseAdminDb();
  const directRef = db.collection(COLLECTION_USER).doc(userId);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directRef;

  const byUserId = await db.collection(COLLECTION_USER).where("userId", "==", userId).limit(1).get();
  if (!byUserId.empty) return byUserId.docs[0].ref;

  const byLegacyUserId = await db.collection(COLLECTION_USER).where("UserID", "==", userId).limit(1).get();
  if (!byLegacyUserId.empty) return byLegacyUserId.docs[0].ref;

  const byUid = await db.collection(COLLECTION_USER).where("uid", "==", userId).limit(1).get();
  if (!byUid.empty) return byUid.docs[0].ref;

  return null;
}

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const userId = parseText(url.searchParams.get("userId"));
  if (!userId) return NextResponse.json({ error: "userId obrigatorio" }, { status: 400 });

  const db = getFirebaseAdminDb();
  const userRef = await resolveUserDocRef(userId);
  if (!userRef) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });

  const userSnap = await userRef.get();
  if (!userSnap.exists) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  const data = (userSnap.data() ?? {}) as UserDoc;

  const canonicalUserId = parseText(data.userId) || parseText(data.UserID) || parseText(data.uid) || userRef.id;
  const ownerIds = Array.from(new Set([canonicalUserId, userRef.id, parseText(data.uid), parseText(data.UserID), parseText(data.userId)].filter(Boolean)));

  const petSnapshots = await Promise.all(ownerIds.map((ownerId) => db.collection(COLLECTION_PETS).where("ownerId", "==", ownerId).limit(120).get()));
  const petMap = new Map<string, ReturnType<typeof mapPetDoc>>();

  for (const snapshot of petSnapshots) {
    for (const petDoc of snapshot.docs) {
      petMap.set(petDoc.id, mapPetDoc(petDoc.id, (petDoc.data() ?? {}) as PetDoc));
    }
  }

  const pets = Array.from(petMap.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({
    user: {
      id: canonicalUserId,
      docId: userRef.id,
      name: parseText(data.name, "Sem nome"),
      email: parseText(data.email, "Sem email"),
      phone: parseText(data.phone),
      birthDate: parseText(data.birthDate),
      plan: parseUserPlan(data.plan),
      userType: parseUserType(data.userType),
      createdAt: parseText(data.createdAt) || parseText(data.CreatedAt),
      photoUrl: parsePhotoUrl(data.photoURL, data.userPhotoUrl, data.picture),
    },
    pets,
  });
}

function mapPetDoc(id: string, data: PetDoc) {
  return {
    id,
    name: parseText(data.name, "Pet sem nome"),
    petIdentity: parseText(data.petIdentity, id),
    breed: parseText(data.breed, "Nao informado"),
    image: getPetImageOrDefault(parseText(data.image)),
    ownerId: parseText(data.ownerId),
    nfcId: parseText(data.nfcId),
    lastNfcAccessAt: parseText(data.lastNfcAccessAt),
    createdAt: parseText(data.createdAt) || parseText(data.updatedAt) || new Date(0).toISOString(),
  };
}
