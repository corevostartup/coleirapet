import { randomUUID } from "node:crypto";
import type { DocumentReference, Firestore } from "firebase-admin/firestore";
import {
  COLLECTION_PETS,
  COLLECTION_USER,
  SUBCOLLECTION_VACCINES,
  SUBCOLLECTION_VACCINES_LEGACY,
} from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getPetImageOrDefault } from "@/lib/pets/image";
import { isLegacyUiDemoPetName } from "@/lib/pets/legacy-ui-demo-pets";

/** Quando o documento nao tem nome (legado ou apagado). */
const PET_DISPLAY_NAME_FALLBACK = "Não informado";

type PetDoc = {
  ownerId?: string;
  petIdentity?: string;
  nfcId?: string;
  nfcPairedAt?: string;
  nfcPin?: string;
  /** Segredo para URL pública de contato em situação de pet perdido (quem escaneia a tag). */
  finderShareToken?: string;
  /** Endereço público estável para exibir somente dados públicos do pet. */
  publicPageSlug?: string;
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
  lastNfcAccessAt?: string;
  lastNfcAccessLat?: number;
  lastNfcAccessLng?: number;
  lastNfcAccessAddress?: string;
  lastNfcAccessAccuracyM?: number;
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

/** Ids de pets de demonstração antigos; não devem aparecer nem ser defaultPetId. */
const DEMO_PET_ID_BLOCKLIST = new Set(["demo-max", "demo-nina", "demo-thor"]);

function isDemoPetId(petId: string) {
  const id = petId.trim();
  if (DEMO_PET_ID_BLOCKLIST.has(id)) return true;
  if (id.toLowerCase().startsWith("demo-")) return true;
  return false;
}

/** Pets de demo antigos: ids reservados ou um dos 3 nomes forçados pela UI. */
function isDemoPetDocContent(data: PetDoc, docId: string) {
  if (isDemoPetId(docId)) return true;
  return isLegacyUiDemoPetName(typeof data.name === "string" ? data.name : "");
}

export type PetProfile = {
  id: string;
  petIdentity: string;
  nfcId: string | null;
  nfcPairedAt: string | null;
  nfcPin: string | null;
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
  lastNfcAccessAt: string | null;
  lastNfcAccessLat: number | null;
  lastNfcAccessLng: number | null;
  lastNfcAccessAddress: string | null;
  lastNfcAccessAccuracyM: number | null;
  publicFields: {
    name: boolean;
    breed: boolean;
    color: boolean;
    emergencyContact: boolean;
    microchipId: boolean;
    notes: boolean;
  };
  finderShareToken: string;
  publicPageSlug: string;
  publicPagePath: string;
};

const CURRENT_PET_CACHE_TTL_MS = 45_000;
const currentPetCache = new Map<string, { expiresAt: number; value: PetProfile }>();

function clonePetProfile(pet: PetProfile): PetProfile {
  return {
    ...pet,
    publicFields: { ...pet.publicFields },
  };
}

function readCachedCurrentPet(uid: string): PetProfile | null {
  const hit = currentPetCache.get(uid);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    currentPetCache.delete(uid);
    return null;
  }
  return clonePetProfile(hit.value);
}

function writeCachedCurrentPet(uid: string, pet: PetProfile) {
  currentPetCache.set(uid, {
    expiresAt: Date.now() + CURRENT_PET_CACHE_TTL_MS,
    value: clonePetProfile(pet),
  });
}

export function invalidateCurrentPetCache(uid?: string) {
  if (uid) {
    currentPetCache.delete(uid);
    return;
  }
  currentPetCache.clear();
}

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

function parsePublicPageSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^[a-z0-9-]{8,64}$/.test(trimmed)) return null;
  return trimmed;
}

function generatePublicPageSlug() {
  return `pet-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

function parsePetIdentity(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(trimmed)) return null;
  return trimmed;
}

function generatePetIdentity() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomUUID().replace(/-/g, "");
  let out = "";
  for (let i = 0; i < 8; i++) {
    const hexPair = bytes.slice(i * 2, i * 2 + 2);
    const value = Number.parseInt(hexPair, 16);
    out += alphabet[value % alphabet.length];
  }
  return out;
}

function toPetProfile(petId: string, data: PetDoc): PetProfile {
  const publicPageSlug = parsePublicPageSlug(data.publicPageSlug) ?? generatePublicPageSlug();
  return {
    id: petId,
    petIdentity: parsePetIdentity(data.petIdentity) ?? generatePetIdentity(),
    nfcId: parseString(data.nfcId),
    nfcPairedAt: parseString(data.nfcPairedAt),
    nfcPin: parseNfcPin(data.nfcPin),
    name: parseString(data.name) ?? PET_DISPLAY_NAME_FALLBACK,
    breed: parseString(data.breed) ?? "",
    image: getPetImageOrDefault(parseString(data.image)),
    age: parseNumber(data.age),
    weightKg: parseNumber(data.weightKg),
    sex: parseString(data.sex),
    size: parseString(data.size),
    emergencyContact: parseString(data.emergencyContact),
    color: parseString(data.color),
    microchipId: parseString(data.microchipId),
    notes: parseString(data.notes),
    lastNfcAccessAt: parseString(data.lastNfcAccessAt),
    lastNfcAccessLat: parseNumber(data.lastNfcAccessLat),
    lastNfcAccessLng: parseNumber(data.lastNfcAccessLng),
    lastNfcAccessAddress: parseString(data.lastNfcAccessAddress),
    lastNfcAccessAccuracyM: parseNumber(data.lastNfcAccessAccuracyM),
    publicFields: parsePublicFields(data.publicFields),
    finderShareToken: parseString(data.finderShareToken) ?? "",
    publicPageSlug,
    publicPagePath: `/pet/${publicPageSlug}`,
  };
}

function parseNfcPin(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!/^\d{4}$/.test(normalized) && !/^\d{6}$/.test(normalized)) return null;
  return normalized;
}

function generateNfcPin() {
  const n = Math.floor(Math.random() * 10000);
  return String(n).padStart(4, "0");
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

async function ensurePublicPageSlug<T extends PetDoc>(
  petRef: DocumentReference,
  data: T,
): Promise<T & { publicPageSlug: string }> {
  const existing = parsePublicPageSlug(data.publicPageSlug);
  if (existing) return { ...data, publicPageSlug: existing };
  const publicPageSlug = generatePublicPageSlug();
  const nowIso = new Date().toISOString();
  await petRef.set({ publicPageSlug, updatedAt: nowIso }, { merge: true });
  return { ...data, publicPageSlug };
}

async function ensurePetIdentity<T extends PetDoc>(
  petRef: DocumentReference,
  data: T,
): Promise<T & { petIdentity: string }> {
  const existing = parsePetIdentity(data.petIdentity);
  if (existing) return { ...data, petIdentity: existing };

  const db = getFirebaseAdminDb();
  let petIdentity = "";
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = generatePetIdentity();
    const duplicated = await db.collection(COLLECTION_PETS).where("petIdentity", "==", candidate).limit(1).get();
    if (duplicated.empty) {
      petIdentity = candidate;
      break;
    }
  }
  if (!petIdentity) {
    throw new Error("Nao foi possivel gerar identidade unica para o pet.");
  }

  const nowIso = new Date().toISOString();
  await petRef.set({ petIdentity, updatedAt: nowIso }, { merge: true });
  return { ...data, petIdentity };
}

export async function regenerateNfcPinForCurrentPet(uid: string): Promise<{ petRef: DocumentReference; petId: string; nfcPin: string }> {
  const { petRef, pet } = await getOrCreateCurrentPet(uid);
  const nfcPin = generateNfcPin();
  const nowIso = new Date().toISOString();
  await petRef.set({ nfcPin, updatedAt: nowIso }, { merge: true });
  invalidateCurrentPetCache(uid);
  return { petRef, petId: pet.id, nfcPin };
}

/** PIN armazenado no Firestore, se existir e for valido (nao gera novo ao ler). */
export async function getCurrentPetStoredNfcPin(uid: string): Promise<{ petId: string; nfcPin: string }> {
  const { pet } = await getOrCreateCurrentPet(uid);
  const nfcPin = parseNfcPin(pet.nfcPin ?? "") ?? "";
  return { petId: pet.id, nfcPin };
}

function defaultPetDoc(ownerId: string) {
  const nowIso = new Date().toISOString();
  return {
    ownerId,
    petIdentity: generatePetIdentity(),
    nfcId: "",
    nfcPairedAt: "",
    publicPageSlug: generatePublicPageSlug(),
    name: "Nao informado",
    breed: "",
    image: "",
    emergencyContact: "",
    color: "",
    microchipId: "",
    notes: "",
    publicFields: {
      name: true,
      breed: false,
      color: false,
      emergencyContact: false,
      microchipId: false,
      notes: false,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

const LEGACY_PETS_SUBCOLLECTION = "pets";

/**
 * Migra User/{uid}/pets → Pets/{petId} (com ownerId) e subcoleções de vacinas.
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

    const legacyVaccinesByName = await Promise.all([
      legacyDoc.ref.collection(SUBCOLLECTION_VACCINES).get(),
      legacyDoc.ref.collection(SUBCOLLECTION_VACCINES_LEGACY).get(),
    ]);
    const legacyVaccines = legacyVaccinesByName.flatMap((snapshot) => snapshot.docs);
    if (legacyVaccines.length > 0) {
      let batch = db.batch();
      let count = 0;
      for (const vDoc of legacyVaccines) {
        batch.set(petsRoot.doc(petId).collection(SUBCOLLECTION_VACCINES).doc(vDoc.id), vDoc.data(), { merge: true });
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
      for (const vDoc of legacyVaccines) {
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
  const withPublicPage = await ensurePublicPageSlug(petRef, withToken);
  const withIdentity = await ensurePetIdentity(petRef, withPublicPage);
  return { petRef, pet: toPetProfile(petId, withIdentity) };
}

export async function getOrCreateCurrentPet(uid: string) {
  const cached = readCachedCurrentPet(uid);
  if (cached) {
    const db = getFirebaseAdminDb();
    return {
      petRef: db.collection(COLLECTION_PETS).doc(cached.id),
      pet: cached,
    };
  }

  const db = getFirebaseAdminDb();
  await migrateLegacyPetsSubcollection(db, uid);

  const userRef = db.collection(COLLECTION_USER).doc(uid);
  const userSnap = await userRef.get();
  const userData = (userSnap.data() ?? {}) as { defaultPetId?: string };

  const petsRoot = db.collection(COLLECTION_PETS);

  const rawDefaultId = typeof userData.defaultPetId === "string" ? userData.defaultPetId.trim() : "";
  const candidatePetId = rawDefaultId && isDemoPetId(rawDefaultId) ? "" : rawDefaultId;
  if (candidatePetId) {
    const petRef = petsRoot.doc(candidatePetId);
    const petSnap = await petRef.get();
    const data = petSnap.data() as PetDoc | undefined;
    if (petSnap.exists && data?.ownerId === uid) {
      const result = await finalizePetProfile(petRef, petSnap.id, data);
      writeCachedCurrentPet(uid, result.pet);
      return result;
    }
  }

  const owned = await petsRoot.where("ownerId", "==", uid).get();
  const firstReal = owned.docs.find(
    (doc) => !isDemoPetDocContent(doc.data() as PetDoc, doc.id),
  );
  if (firstReal) {
    const doc = firstReal;
    await userRef.set({ defaultPetId: doc.id }, { merge: true });
    const result = await finalizePetProfile(doc.ref, doc.id, doc.data() as PetDoc);
    writeCachedCurrentPet(uid, result.pet);
    return result;
  }

  const created = await petsRoot.add(defaultPetDoc(uid));
  await userRef.set({ defaultPetId: created.id }, { merge: true });
  const createdSnap = await created.get();
  const result = await finalizePetProfile(created, createdSnap.id, createdSnap.data() as PetDoc);
  writeCachedCurrentPet(uid, result.pet);
  return result;
}

export async function listOwnedPets(uid: string) {
  const db = getFirebaseAdminDb();
  await migrateLegacyPetsSubcollection(db, uid);

  const userRef = db.collection(COLLECTION_USER).doc(uid);
  const userSnap = await userRef.get();
  const userData = (userSnap.data() ?? {}) as UserDoc;

  const owned = await db.collection(COLLECTION_PETS).where("ownerId", "==", uid).get();
  const realDocs = owned.docs.filter(
    (doc) => !isDemoPetDocContent(doc.data() as PetDoc, doc.id),
  );
  if (realDocs.length === 0) {
    const created = await getOrCreateCurrentPet(uid);
    return {
      currentPetId: created.pet.id,
      pets: [created.pet],
    };
  }

  const pets = await Promise.all(
    realDocs.map(async (doc) => {
      const withToken = await ensureFinderShareToken(doc.ref, doc.data() as PetDoc);
      const normalized = await ensurePublicPageSlug(doc.ref, withToken);
      const withIdentity = await ensurePetIdentity(doc.ref, normalized);
      return toPetProfile(doc.id, withIdentity);
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

  if (isDemoPetId(normalizedPetId)) return null;
  const petRef = db.collection(COLLECTION_PETS).doc(normalizedPetId);
  const petSnap = await petRef.get();
  const petData = petSnap.data() as PetDoc | undefined;
  if (!petSnap.exists || petData?.ownerId !== uid) return null;
  if (isDemoPetDocContent(petData, normalizedPetId)) return null;

  await db.collection(COLLECTION_USER).doc(uid).set({ defaultPetId: normalizedPetId }, { merge: true });
  const normalized = await ensureFinderShareToken(petRef, petData);
  const withPublicPage = await ensurePublicPageSlug(petRef, normalized);
  const withIdentity = await ensurePetIdentity(petRef, withPublicPage);
  const next = toPetProfile(normalizedPetId, withIdentity);
  writeCachedCurrentPet(uid, next);
  return next;
}

export async function createOwnedPet(uid: string) {
  const db = getFirebaseAdminDb();
  const petsRoot = db.collection(COLLECTION_PETS);
  const createdRef = await petsRoot.add(defaultPetDoc(uid));

  await db.collection(COLLECTION_USER).doc(uid).set({ defaultPetId: createdRef.id }, { merge: true });

  const createdSnap = await createdRef.get();
  const result = await finalizePetProfile(createdRef, createdSnap.id, (createdSnap.data() ?? {}) as PetDoc);
  writeCachedCurrentPet(uid, result.pet);
  return result;
}

export async function getPublicPetBySlug(publicSlug: string) {
  const normalizedSlug = publicSlug.trim().toLowerCase();
  if (!/^[a-z0-9-]{8,64}$/.test(normalizedSlug)) return null;

  const db = getFirebaseAdminDb();
  const query = await db.collection(COLLECTION_PETS).where("publicPageSlug", "==", normalizedSlug).limit(1).get();
  if (query.empty) return null;

  const doc = query.docs[0];
  const normalized = await ensurePublicPageSlug(doc.ref, doc.data() as PetDoc);
  const withIdentity = await ensurePetIdentity(doc.ref, normalized);
  return toPetProfile(doc.id, withIdentity);
}

