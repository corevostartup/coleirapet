import { COLLECTION_PETS, SUBCOLLECTION_PET_MEMBERS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { listSecondaryPetIdsForUserWithFallbacks } from "@/lib/pets/secondary-member-pets";
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
  return normalized === "active" || normalized === "accepted";
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

  const memberMatch = await findActiveMemberForUser(petRef, normalizedUid);
  if (!memberMatch) return null;
  const { snap: memberSnap, member } = memberMatch;
  if (!parseText(member.uid)) {
    await memberSnap.ref.set({ uid: normalizedUid, updatedAt: new Date().toISOString() }, { merge: true });
    member.uid = normalizedUid;
  }
  let role = normalizeRole(member.role);
  const memberUid = parseText(member.uid) || memberSnap.id;
  if (!role) {
    role = ownerAliases.includes(memberUid) || (ownerId && memberUid === ownerId) ? "primary" : "secondary";
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

async function findActiveMemberForUser(
  petRef: FirebaseFirestore.DocumentReference,
  uid: string,
): Promise<{ snap: FirebaseFirestore.DocumentSnapshot; member: PetMemberDoc } | null> {
  const aliases = await resolveUserOwnerIdAliases(uid);
  const membersCol = petRef.collection(SUBCOLLECTION_PET_MEMBERS);

  for (const alias of aliases) {
    const direct = await membersCol.doc(alias).get();
    if (!direct.exists) continue;
    const member = (direct.data() ?? {}) as PetMemberDoc;
    if (isMemberActive(member.status)) return { snap: direct, member };
  }

  for (const alias of aliases) {
    const byField = await membersCol.where("uid", "==", alias).limit(10).get();
    for (const doc of byField.docs) {
      const member = (doc.data() ?? {}) as PetMemberDoc;
      if (isMemberActive(member.status)) return { snap: doc, member };
    }
  }

  return null;
}

/** Pets em que o usuario e tutor principal (ownerId), sem contar compartilhados. */
export async function countPrimaryOwnedPetsForUser(uid: string): Promise<number> {
  const normalizedUid = parseText(uid);
  if (!normalizedUid) return 0;

  const db = getFirebaseAdminDb();
  const ownerAliases = await resolveUserOwnerIdAliases(normalizedUid);
  const seen = new Set<string>();

  for (const alias of ownerAliases) {
    const snapshot = await db.collection(COLLECTION_PETS).where("ownerId", "==", alias).get();
    for (const doc of snapshot.docs) seen.add(doc.id);
  }

  return seen.size;
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

  const [ownedSnapshots, primaryMemberPetIds, secondaryPetIds, activeMemberPetIds, fallbackSecondaryPetIds] =
    await Promise.all([
      Promise.all(ownerAliases.map((alias) => db.collection(COLLECTION_PETS).where("ownerId", "==", alias).get())),
      safeMemberPetIds(() => listPrimaryPetIdsForUser(normalizedUid)),
      safeMemberPetIds(() => listSecondaryPetIdsForUser(normalizedUid)),
      safeMemberPetIds(() => listActiveMemberPetIdsForUser(normalizedUid)),
      listSecondaryPetIdsForUserWithFallbacks(normalizedUid),
    ]);

  const petIds = new Set<string>();
  for (const snapshot of ownedSnapshots) {
    for (const doc of snapshot.docs) petIds.add(doc.id);
  }
  for (const petId of primaryMemberPetIds) petIds.add(petId);
  for (const petId of secondaryPetIds) petIds.add(petId);
  for (const petId of activeMemberPetIds) petIds.add(petId);
  for (const petId of fallbackSecondaryPetIds) petIds.add(petId);
  return Array.from(petIds);
}
