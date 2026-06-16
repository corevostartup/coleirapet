import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_ADMIN_LOGS, COLLECTION_PETS, COLLECTION_USER } from "@/lib/firebase/collections";
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
  createdAt?: string;
  updatedAt?: string;
  nfcId?: string;
  lastNfcAccessAt?: string;
};

type UserDoc = {
  userId?: string;
  UserID?: string;
  uid?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  userPhotoUrl?: string;
  picture?: string;
  defaultPetId?: string;
};

type AdminPetItem = {
  id: string;
  name: string;
  petIdentity: string;
  breed: string;
  image: string;
  sex: string;
  size: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  nfcStatus: "pareado" | "nao_pareado";
  nfcId: string;
};

type DeletePetPayload = {
  petId?: string;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseIsoDate(value: unknown) {
  const raw = parseText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function parsePhotoUrl(...values: unknown[]) {
  for (const value of values) {
    const url = parseText(value);
    if (!url) continue;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  }
  return "";
}

async function requireAuth() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

function userAliases(docId: string, data: UserDoc) {
  return Array.from(new Set([docId, parseText(data.userId), parseText(data.UserID), parseText(data.uid)].filter(Boolean)));
}

async function deleteCollectionTree(collectionRef: FirebaseFirestore.CollectionReference): Promise<void> {
  const snapshot = await collectionRef.get();
  for (const doc of snapshot.docs) {
    await deleteDocTree(doc.ref);
  }
}

async function deleteDocTree(docRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const subcollections = await docRef.listCollections();
  for (const subcollection of subcollections) {
    await deleteCollectionTree(subcollection);
  }
  await docRef.delete();
}

async function resolveUserDocRefByAnyId(userId: string) {
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

export async function GET() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const db = getFirebaseAdminDb();
  const [petsSnapshot, usersSnapshot] = await Promise.all([
    db.collection(COLLECTION_PETS).orderBy("createdAt", "desc").limit(800).get(),
    db.collection(COLLECTION_USER).limit(1200).get(),
  ]);

  const usersByAlias = new Map<
    string,
    {
      name: string;
      email: string;
      photoUrl: string;
    }
  >();

  for (const userDoc of usersSnapshot.docs) {
    const data = (userDoc.data() ?? {}) as UserDoc;
    const profile = {
      name: parseText(data.name, "Tutor sem nome"),
      email: parseText(data.email, "Sem email"),
      photoUrl: parsePhotoUrl(data.photoURL, data.userPhotoUrl, data.picture),
    };
    for (const alias of userAliases(userDoc.id, data)) {
      usersByAlias.set(alias, profile);
    }
  }

  const pets: AdminPetItem[] = petsSnapshot.docs.map((doc) => {
    const data = (doc.data() ?? {}) as PetDoc;
    const ownerId = parseText(data.ownerId);
    const owner = usersByAlias.get(ownerId);
    const nfcId = parseText(data.nfcId);

    return {
      id: doc.id,
      name: parseText(data.name, "Pet sem nome"),
      petIdentity: parseText(data.petIdentity, doc.id),
      breed: parseText(data.breed, "Nao informado"),
      image: getPetImageOrDefault(parseText(data.image)),
      sex: parseText(data.sex, "Nao informado"),
      size: parseText(data.size, "Nao informado"),
      ownerId,
      ownerName: owner?.name ?? "Tutor nao encontrado",
      ownerEmail: owner?.email ?? "Sem email",
      createdAt: parseIsoDate(data.createdAt) || parseIsoDate(data.updatedAt) || "",
      nfcStatus: nfcId ? "pareado" : "nao_pareado",
      nfcId,
    };
  });

  const total = pets.length;
  const withPhoto = pets.filter((pet) => pet.image && pet.image !== "/img/pet-default.png").length;
  const pairedNfc = pets.filter((pet) => pet.nfcStatus === "pareado").length;

  return NextResponse.json({
    pets,
    summary: {
      total,
      withPhoto,
      pairedNfc,
      withoutTutor: pets.filter((pet) => pet.ownerName === "Tutor nao encontrado").length,
    },
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: DeletePetPayload;
  try {
    body = (await request.json()) as DeletePetPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = parseText(body.petId);
  if (!petId) return NextResponse.json({ error: "petId obrigatorio" }, { status: 400 });

  const db = getFirebaseAdminDb();
  const petRef = db.collection(COLLECTION_PETS).doc(petId);
  const petSnap = await petRef.get();
  if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

  const petData = (petSnap.data() ?? {}) as PetDoc;
  const ownerId = parseText(petData.ownerId);
  const petName = parseText(petData.name, "Pet sem nome");

  await deleteDocTree(petRef);

  if (ownerId) {
    const ownerRef = await resolveUserDocRefByAnyId(ownerId);
    if (ownerRef) {
      const ownerSnap = await ownerRef.get();
      const ownerData = (ownerSnap.data() ?? {}) as UserDoc;
      const defaultPetId = parseText(ownerData.defaultPetId);
      if (defaultPetId === petId) {
        await ownerRef.set({ defaultPetId: "" }, { merge: true });
      }
    }
  }

  const nowIso = new Date().toISOString();
  const actorSnap = await db.collection(COLLECTION_USER).doc(auth.uid).get();
  const actorData = (actorSnap.data() ?? {}) as UserDoc;
  await db.collection(COLLECTION_ADMIN_LOGS).add({
    createdAt: nowIso,
    action: "pet_deleted",
    area: "admin_pets",
    message: `Exclusao de pet: ${petName}`,
    actorUid: auth.uid,
    actorName: parseText(actorData.name, "Administrador"),
    actorEmail: parseText(actorData.email),
    targetPetId: petId,
    targetPetName: petName,
    targetOwnerId: ownerId,
  });

  return NextResponse.json({ ok: true });
}
