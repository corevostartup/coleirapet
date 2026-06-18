import { COLLECTION_PETS, SUBCOLLECTION_PET_MEMBERS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { resolveUserOwnerIdAliases } from "@/lib/pets/user-owner-aliases";

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
  const ownerAliases = await resolveUserOwnerIdAliases(normalizedUid);

  if (ownerId && ownerAliases.includes(ownerId)) {
    await ensurePrimaryMemberRecord(normalizedPetId, normalizedUid);
    if (ownerId !== normalizedUid) {
      const nowIso = new Date().toISOString();
      await petRef.set({ ownerId: normalizedUid, updatedAt: nowIso }, { merge: true });
      petData.ownerId = normalizedUid;
    }
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
  let role = normalizeRole(member.role);
  if (!role && memberSnap.id === normalizedUid) {
    role = "primary";
  }

  if (role === "primary") {
    if (!ownerId || !ownerAliases.includes(ownerId)) {
      const nowIso = new Date().toISOString();
      await petRef.set({ ownerId: normalizedUid, updatedAt: nowIso }, { merge: true });
      petData.ownerId = normalizedUid;
    }
    return {
      petRef,
      petData,
      access: {
        role: "primary",
        canEditBasicData: member.permissions?.editBasicData !== false,
        canDeletePet: member.permissions?.deletePet !== false,
        canPairNfc: member.permissions?.pairNfc !== false,
        canManageTutors: true,
      },
    };
  }

  if (role === "secondary") {
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

  return null;
}

function memberDocsToPetIds(snapshot: FirebaseFirestore.QuerySnapshot) {
  const ids = new Set<string>();
  for (const doc of snapshot.docs) {
    const petRef = doc.ref.parent.parent;
    if (!petRef) continue;
    ids.add(petRef.id);
  }
  return Array.from(ids);
}

async function safeMemberPetIds(query: () => Promise<string[]>) {
  try {
    return await query();
  } catch {
    return [];
  }
}

export async function listActiveMemberPetIdsForUser(uid: string) {
  const normalizedUid = parseText(uid);
  if (!normalizedUid) return [];
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collectionGroup(SUBCOLLECTION_PET_MEMBERS)
    .where("uid", "==", normalizedUid)
    .where("status", "==", "active")
    .get();
  return memberDocsToPetIds(snapshot);
}

export async function listPrimaryPetIdsForUser(uid: string) {
  const normalizedUid = parseText(uid);
  if (!normalizedUid) return [];
  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collectionGroup(SUBCOLLECTION_PET_MEMBERS)
    .where("uid", "==", normalizedUid)
    .where("role", "==", "primary")
    .where("status", "==", "active")
    .get();
  return memberDocsToPetIds(snapshot);
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
  return memberDocsToPetIds(snapshot);
}

/** União de pets por ownerId (todos os aliases), membros ativos e papéis primário/secundário. */
export async function listAccessiblePetIdsForUser(uid: string) {
  const normalizedUid = parseText(uid);
  if (!normalizedUid) return [];

  const db = getFirebaseAdminDb();
  const ownerAliases = await resolveUserOwnerIdAliases(normalizedUid);

  const [ownedSnapshots, primaryMemberPetIds, secondaryPetIds, activeMemberPetIds] = await Promise.all([
    Promise.all(ownerAliases.map((alias) => db.collection(COLLECTION_PETS).where("ownerId", "==", alias).get())),
    safeMemberPetIds(() => listPrimaryPetIdsForUser(normalizedUid)),
    safeMemberPetIds(() => listSecondaryPetIdsForUser(normalizedUid)),
    safeMemberPetIds(() => listActiveMemberPetIdsForUser(normalizedUid)),
  ]);

  const petIds = new Set<string>();
  for (const snapshot of ownedSnapshots) {
    for (const doc of snapshot.docs) petIds.add(doc.id);
  }
  for (const petId of primaryMemberPetIds) petIds.add(petId);
  for (const petId of secondaryPetIds) petIds.add(petId);
  for (const petId of activeMemberPetIds) petIds.add(petId);
  return Array.from(petIds);
}
