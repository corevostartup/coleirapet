import {
  COLLECTION_PETS,
  COLLECTION_USER,
  SUBCOLLECTION_PET_MEMBERS,
  SUBCOLLECTION_USER_NOTIFICATIONS,
} from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { resolveUserDocumentIds, resolveUserOwnerIdAliases } from "@/lib/pets/user-owner-aliases";

function parseText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isActiveMemberStatus(status: unknown) {
  const normalized = parseText(status).toLowerCase();
  return normalized === "active" || normalized === "accepted";
}

function isSecondaryMemberData(data: Record<string, unknown>) {
  return parseText(data.role).toLowerCase() === "secondary";
}

function memberDocToPetId(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const petRef = doc.ref.parent.parent;
  return petRef?.id ?? "";
}

async function isActiveSecondaryMemberOnPet(petId: string, aliases: string[]) {
  const db = getFirebaseAdminDb();
  const membersCol = db.collection(COLLECTION_PETS).doc(petId).collection(SUBCOLLECTION_PET_MEMBERS);

  for (const alias of aliases) {
    const direct = await membersCol.doc(alias).get();
    if (direct.exists) {
      const data = direct.data() ?? {};
      if (isSecondaryMemberData(data) && isActiveMemberStatus(data.status)) return true;
    }

    const byField = await membersCol.where("uid", "==", alias).limit(10).get();
    for (const doc of byField.docs) {
      const data = doc.data() ?? {};
      if (isSecondaryMemberData(data) && isActiveMemberStatus(data.status)) return true;
    }
  }

  return false;
}

/** Pets secundarios gravados no perfil do usuario (apos aceitar convite). */
export async function listSecondaryPetIdsFromUserProfile(uid: string): Promise<string[]> {
  const db = getFirebaseAdminDb();
  const userDocIds = await resolveUserDocumentIds(uid);
  const petIds = new Set<string>();

  for (const userDocId of userDocIds) {
    const snap = await db.collection(COLLECTION_USER).doc(userDocId).get();
    if (!snap.exists) continue;
    const list = snap.data()?.secondaryPetIds;
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const petId = parseText(item);
      if (petId) petIds.add(petId);
    }
  }

  return Array.from(petIds);
}

/** Varredura por `members.uid` (indice simples; nao depende de indice composto). */
export async function listActiveSecondaryPetIdsFromMembershipScan(uid: string): Promise<string[]> {
  const aliases = await resolveUserOwnerIdAliases(uid);
  const db = getFirebaseAdminDb();
  const petIds = new Set<string>();

  for (const alias of aliases) {
    try {
      const snapshot = await db.collectionGroup(SUBCOLLECTION_PET_MEMBERS).where("uid", "==", alias).get();
      for (const doc of snapshot.docs) {
        const data = doc.data() ?? {};
        if (!isSecondaryMemberData(data) || !isActiveMemberStatus(data.status)) continue;
        const petId = memberDocToPetId(doc);
        if (petId) petIds.add(petId);
      }
    } catch {
      /* indice ausente ou outro erro */
    }
  }

  return Array.from(petIds);
}

/** Fallback quando collectionGroup composto falha: convites + notificacoes em todos os docs User. */
export async function listSecondaryPetIdsFromAcceptedInvites(uid: string): Promise<string[]> {
  const normalizedUid = parseText(uid);
  if (!normalizedUid) return [];

  const db = getFirebaseAdminDb();
  const userDocIds = await resolveUserDocumentIds(normalizedUid);
  const aliases = await resolveUserOwnerIdAliases(normalizedUid);
  const petIds = new Set<string>();

  for (const userDocId of userDocIds) {
    const snapshot = await db
      .collection(COLLECTION_USER)
      .doc(userDocId)
      .collection(SUBCOLLECTION_USER_NOTIFICATIONS)
      .orderBy("createdAt", "desc")
      .limit(120)
      .get();

    for (const doc of snapshot.docs) {
      const data = doc.data() ?? {};
      if (parseText(data.type) !== "secondary_tutor_invite") continue;

      const status = parseText(data.status).toLowerCase();
      if (status === "pending" || status === "cancelled") continue;

      const petId = parseText(data.petId);
      if (!petId) continue;

      if (await isActiveSecondaryMemberOnPet(petId, aliases)) petIds.add(petId);
    }
  }

  return Array.from(petIds);
}

/** Uniao de todas as fontes de pets secundarios ativos para o tutor. */
export async function listSecondaryPetIdsForUserWithFallbacks(uid: string): Promise<string[]> {
  const [fromProfile, fromScan, fromInvites] = await Promise.all([
    listSecondaryPetIdsFromUserProfile(uid),
    listActiveSecondaryPetIdsFromMembershipScan(uid),
    listSecondaryPetIdsFromAcceptedInvites(uid),
  ]);

  return Array.from(new Set([...fromProfile, ...fromScan, ...fromInvites]));
}
