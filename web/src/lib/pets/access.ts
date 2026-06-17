import { COLLECTION_PETS, SUBCOLLECTION_PET_MEMBERS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type PetDoc = {
  ownerId?: string;
};

type PetMemberDoc = {
  uid?: string;
  role?: string;
  status?: string;
  permissions?: {
    editBasicData?: boolean;
    deletePet?: boolean;
    pairNfc?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type PetAccessRole = "primary" | "secondary";

export type PetAccess = {
  role: PetAccessRole;
  canEditBasicData: boolean;
  canDeletePet: boolean;
  canPairNfc: boolean;
  canManageTutors: boolean;
};

export type PetAccessWithRefs = {
  petRef: FirebaseFirestore.DocumentReference;
  petData: PetDoc;
  access: PetAccess;
};

function parseText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeRole(value: unknown): PetAccessRole | null {
  const normalized = parseText(value).toLowerCase();
  if (normalized === "primary") return "primary";
  if (normalized === "secondary") return "secondary";
  return null;
}

function isMemberActive(value: unknown) {
  const normalized = parseText(value).toLowerCase();
  return normalized === "active";
}

export async function ensurePrimaryMemberRecord(petId: string, ownerId: string) {
  const normalizedPetId = parseText(petId);
  const normalizedOwnerId = parseText(ownerId);
  if (!normalizedPetId || !normalizedOwnerId) return;
  const db = getFirebaseAdminDb();
  const nowIso = new Date().toISOString();
  await db
    .collection(COLLECTION_PETS)
    .doc(normalizedPetId)
    .collection(SUBCOLLECTION_PET_MEMBERS)
    .doc(normalizedOwnerId)
    .set(
      {
        uid: normalizedOwnerId,
        role: "primary",
        status: "active",
        permissions: {
          editBasicData: true,
          deletePet: true,
          pairNfc: true,
        },
        updatedAt: nowIso,
        createdAt: nowIso,
      },
      { merge: true },
    );
}

export async function getPetAccessById(uid: string, petId: string): Promise<PetAccessWithRefs | null> {
  const normalizedUid = parseText(uid);
  const normalizedPetId = parseText(petId);
  if (!normalizedUid || !normalizedPetId) return null;

  const db = getFirebaseAdminDb();
  const petRef = db.collection(COLLECTION_PETS).doc(normalizedPetId);
  const petSnap = await petRef.get();
  if (!petSnap.exists) return null;

  const petData = (petSnap.data() ?? {}) as PetDoc;
  const ownerId = parseText(petData.ownerId);
  if (ownerId && ownerId === normalizedUid) {
    await ensurePrimaryMemberRecord(normalizedPetId, ownerId);
    return {
      petRef,
      petData,
      access: {
        role: "primary",
        canEditBasicData: true,
        canDeletePet: true,
        canPairNfc: true,
        canManageTutors: true,
      },
    };
  }

  const memberSnap = await petRef.collection(SUBCOLLECTION_PET_MEMBERS).doc(normalizedUid).get();
  if (!memberSnap.exists) return null;
  const member = (memberSnap.data() ?? {}) as PetMemberDoc;
  if (!isMemberActive(member.status)) return null;
  const role = normalizeRole(member.role);
  if (role !== "secondary") return null;

  return {
    petRef,
    petData,
    access: {
      role: "secondary",
      canEditBasicData: member.permissions?.editBasicData !== false,
      canDeletePet: member.permissions?.deletePet === true,
      canPairNfc: member.permissions?.pairNfc === true,
      canManageTutors: false,
    },
  };
}

export async function listSecondaryPetIdsForUser(uid: string) {
  const normalizedUid = parseText(uid);
  if (!normalizedUid) return [];
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collectionGroup(SUBCOLLECTION_PET_MEMBERS)
    .where("uid", "==", normalizedUid)
    .where("role", "==", "secondary")
    .where("status", "==", "active")
    .get();
  const ids = new Set<string>();
  for (const doc of snapshot.docs) {
    const petRef = doc.ref.parent.parent;
    if (!petRef) continue;
    ids.add(petRef.id);
  }
  return Array.from(ids);
}
