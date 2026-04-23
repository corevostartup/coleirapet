import { randomUUID } from "node:crypto";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import { COLLECTION_PETS, COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { pet as mockPet } from "@/lib/mock";

type PetDoc = {
  ownerId?: string;
  /** Segredo para URL pública de contato em situação de pet perdido (quem escaneia a tag). */
  finderShareToken?: string;
  name?: string;
  breed?: string;
  image?: string;
  age?: number;
  weightKg?: number;
  sex?: string;
  size?: string;
  emergencyContact?: string;
  color?: string;
  microchipId?: string;
  notes?: string;
  publicFields?: {
    name?: boolean;
    breed?: boolean;
    color?: boolean;
    emergencyContact?: boolean;
    microchipId?: boolean;
    notes?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

type UserDoc = {
  defaultPetId?: string;
};

export type PetProfile = {
  id: string;
  name: string;
  breed: string;
  image: string;
  age: number | null;
  weightKg: number | null;
  sex: string | null;
  size: string | null;
  emergencyContact: string | null;
  color: string | null;
  microchipId: string | null;
  notes: string | null;
  publicFields: {
    name: boolean;
    breed: boolean;
    color: boolean;
    emergencyContact: boolean;
    microchipId: boolean;
    notes: boolean;
  };
  finderShareToken: string;
};

function parseNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parsePublicFields(value: unknown) {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    name: data.name !== false,
    breed: data.breed === true,
    color: data.color === true,
    emergencyContact: data.emergencyContact !== false,
    microchipId: data.microchipId === true,
    notes: data.notes === true,
  };
}

function toPetProfile(petId: string, data: PetDoc): PetProfile {
  return {
    id: petId,
    name: parseString(data.name) ?? mockPet.name,
    breed: parseString(data.breed) ?? mockPet.breed,
    image: parseString(data.image) ?? mockPet.image,
    age: parseNumber(data.age),
    weightKg: parseNumber(data.weightKg),
    sex: parseString(data.sex),
    size: parseString(data.size),
    emergencyContact: parseString(data.emergencyContact),
    color: parseString(data.color),
    microchipId: parseString(data.microchipId),
    notes: parseString(data.notes),
    publicFields: parsePublicFields(data.publicFields),
    finderShareToken: parseString(data.finderShareToken) ?? "",
  };
}

async function ensureFinderShareToken<T extends PetDoc>(
  petRef: DocumentReference,
  data: T,
): Promise<T & { finderShareToken: string }> {
  const existing = parseString(data.finderShareToken);
  if (existing) return { ...data, finderShareToken: existing };
  const token = randomUUID();
  const nowIso = new Date().toISOString();
  await petRef.set({ finderShareToken: token, updatedAt: nowIso }, { merge: true });
  return { ...data, finderShareToken: token };
}

function defaultPetDoc(ownerId: string) {
  const nowIso = new Date().toISOString();
  return {
    ownerId,
    name: mockPet.name,
    breed: mockPet.breed,
    image: mockPet.image,
    age: mockPet.age,
    weightKg: mockPet.weightKg,
    sex: mockPet.sex,
    size: mockPet.size,
    emergencyContact: "(11) 98888-1234",
    color: "Dourado",
    microchipId: "",
    notes: "",
    publicFields: {
      name: true,
      breed: false,
      color: false,
      emergencyContact: true,
      microchipId: false,
      notes: false,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

const LEGACY_PETS_SUBCOLLECTION = "pets";

/**
 * Migra User/{uid}/pets → Pets/{petId} (com ownerId) e subcoleção vaccines.
 * Idempotente: pode ser chamada várias vezes.
 */
async function migrateLegacyPetsSubcollection(db: Firestore, uid: string): Promise<void> {
  const userRef = db.collection(COLLECTION_USER).doc(uid);
  const peek = await userRef.collection(LEGACY_PETS_SUBCOLLECTION).limit(1).get();
  if (peek.empty) return;

  const petsRoot = db.collection(COLLECTION_PETS);
  const legacySnap = await userRef.collection(LEGACY_PETS_SUBCOLLECTION).get();

  for (const legacyDoc of legacySnap.docs) {
    const petId = legacyDoc.id;
    const legacyData = legacyDoc.data() ?? {};
    const merged: Record<string, unknown> = {
      ...legacyData,
      ownerId: uid,
      updatedAt: legacyData.updatedAt ?? new Date().toISOString(),
    };
    await petsRoot.doc(petId).set(merged, { merge: true });

    const legacyVaccines = await legacyDoc.ref.collection("vaccines").get();
    if (!legacyVaccines.empty) {
      let batch = db.batch();
      let count = 0;
      for (const vDoc of legacyVaccines.docs) {
        batch.set(petsRoot.doc(petId).collection("vaccines").doc(vDoc.id), vDoc.data(), { merge: true });
        count++;
        if (count >= 400) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();

      let delBatch = db.batch();
      let delCount = 0;
      for (const vDoc of legacyVaccines.docs) {
        delBatch.delete(vDoc.ref);
        delCount++;
        if (delCount >= 400) {
          await delBatch.commit();
          delBatch = db.batch();
          delCount = 0;
        }
      }
      if (delCount > 0) await delBatch.commit();
    }

    await legacyDoc.ref.delete();
  }
}

async function finalizePetProfile(petRef: DocumentReference, petId: string, raw: PetDoc) {
  const withToken = await ensureFinderShareToken(petRef, raw);
  return { petRef, pet: toPetProfile(petId, withToken) };
}

export async function getOrCreateCurrentPet(uid: string) {
  const db = getFirebaseAdminDb();
  await migrateLegacyPetsSubcollection(db, uid);

  const userRef = db.collection(COLLECTION_USER).doc(uid);
  const userSnap = await userRef.get();
  const userData = (userSnap.data() ?? {}) as { defaultPetId?: string };

  const petsRoot = db.collection(COLLECTION_PETS);

  const candidatePetId = typeof userData.defaultPetId === "string" ? userData.defaultPetId.trim() : "";
  if (candidatePetId) {
    const petRef = petsRoot.doc(candidatePetId);
    const petSnap = await petRef.get();
    const data = petSnap.data() as PetDoc | undefined;
    if (petSnap.exists && data?.ownerId === uid) {
      return finalizePetProfile(petRef, petSnap.id, data);
    }
  }

  const owned = await petsRoot.where("ownerId", "==", uid).limit(1).get();
  if (!owned.empty) {
    const doc = owned.docs[0];
    await userRef.set({ defaultPetId: doc.id }, { merge: true });
    return finalizePetProfile(doc.ref, doc.id, doc.data() as PetDoc);
  }

  const created = await petsRoot.add(defaultPetDoc(uid));
  await userRef.set({ defaultPetId: created.id }, { merge: true });
  const createdSnap = await created.get();
  return finalizePetProfile(created, createdSnap.id, createdSnap.data() as PetDoc);
}

export async function listOwnedPets(uid: string) {
  const db = getFirebaseAdminDb();
  await migrateLegacyPetsSubcollection(db, uid);

  const userRef = db.collection(COLLECTION_USER).doc(uid);
  const userSnap = await userRef.get();
  const userData = (userSnap.data() ?? {}) as UserDoc;

  const owned = await db.collection(COLLECTION_PETS).where("ownerId", "==", uid).get();
  if (owned.empty) {
    const created = await getOrCreateCurrentPet(uid);
    return {
      currentPetId: created.pet.id,
      pets: [created.pet],
    };
  }

  const pets = await Promise.all(
    owned.docs.map(async (doc) => {
      const normalized = await ensureFinderShareToken(doc.ref, doc.data() as PetDoc);
      return toPetProfile(doc.id, normalized);
    }),
  );

  const defaultPetId = typeof userData.defaultPetId === "string" ? userData.defaultPetId.trim() : "";
  const currentPetId = pets.some((item) => item.id === defaultPetId) ? defaultPetId : pets[0]?.id ?? "";

  if (currentPetId && currentPetId !== defaultPetId) {
    await userRef.set({ defaultPetId: currentPetId }, { merge: true });
  }

  return { currentPetId, pets };
}

export async function setCurrentPet(uid: string, petId: string) {
  const db = getFirebaseAdminDb();
  const normalizedPetId = petId.trim();
  if (!normalizedPetId) return null;

  const petRef = db.collection(COLLECTION_PETS).doc(normalizedPetId);
  const petSnap = await petRef.get();
  const petData = petSnap.data() as PetDoc | undefined;
  if (!petSnap.exists || petData?.ownerId !== uid) return null;

  await db.collection(COLLECTION_USER).doc(uid).set({ defaultPetId: normalizedPetId }, { merge: true });
  const normalized = await ensureFinderShareToken(petRef, petData);
  return toPetProfile(normalizedPetId, normalized);
}
