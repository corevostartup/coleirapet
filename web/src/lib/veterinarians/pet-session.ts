import { COLLECTION_VETERINARIANS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb, getFirestoreFieldValue } from "@/lib/firebase/admin";

type RecentConsultationEntry = {
  petId?: string;
  consultedAt?: string;
  finishedAt?: string;
};

const MAX_RECENT = 15;

function toText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export async function readVetPetSession(vetUid: string) {
  const db = getFirebaseAdminDb();
  const snap = await db.collection(COLLECTION_VETERINARIANS).doc(vetUid).get();
  const data = snap.data() ?? {};
  const activePetId = toText(data.activePetId);
  const activePetSelectedAt = toText(data.activePetSelectedAt) || null;
  return { activePetId: activePetId || null, activePetSelectedAt };
}

export async function readRecentConsultations(vetUid: string) {
  const db = getFirebaseAdminDb();
  const snap = await db.collection(COLLECTION_VETERINARIANS).doc(vetUid).get();
  const raw = snap.data()?.recentPetConsultations;
  if (!Array.isArray(raw)) return [] as Array<{ petId: string; consultedAt: string; finishedAt: string | null }>;

  return raw
    .map((item) => {
      const entry = item as RecentConsultationEntry;
      const petId = typeof entry.petId === "string" ? entry.petId.trim() : "";
      const consultedAt = typeof entry.consultedAt === "string" ? entry.consultedAt.trim() : "";
      const finishedAt = typeof entry.finishedAt === "string" ? entry.finishedAt.trim() : "";
      if (!petId) return null;
      return {
        petId,
        consultedAt: consultedAt || new Date(0).toISOString(),
        finishedAt: finishedAt || null,
      };
    })
    .filter((item): item is { petId: string; consultedAt: string; finishedAt: string | null } => item !== null)
    .slice(0, MAX_RECENT);
}

export async function pushRecentConsultation(vetUid: string, petId: string) {
  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_VETERINARIANS).doc(vetUid);
  const current = await readRecentConsultations(vetUid);
  const nowIso = new Date().toISOString();
  const next = [
    { petId, consultedAt: nowIso, finishedAt: null },
    ...current.filter((item) => item.petId !== petId),
  ].slice(0, MAX_RECENT);
  await ref.set(
    {
      recentPetConsultations: next,
      activePetId: petId,
      activePetSelectedAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true },
  );
  return next;
}

export async function finishActiveConsultation(vetUid: string, expectedPetId?: string) {
  const session = await readVetPetSession(vetUid);
  if (!session.activePetId) {
    throw new Error("Nenhum atendimento em andamento.");
  }
  if (expectedPetId && expectedPetId !== session.activePetId) {
    throw new Error("Pet ativo nao corresponde ao selecionado.");
  }

  const petId = session.activePetId;
  const nowIso = new Date().toISOString();
  const current = await readRecentConsultations(vetUid);
  const next = current.map((item) => (item.petId === petId ? { ...item, finishedAt: nowIso } : item));

  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_VETERINARIANS).doc(vetUid);
  const FieldValue = getFirestoreFieldValue();

  await ref.set(
    {
      recentPetConsultations: next,
      activePetId: FieldValue.delete(),
      activePetSelectedAt: FieldValue.delete(),
      updatedAt: nowIso,
    },
    { merge: true },
  );

  return { petId, finishedAt: nowIso };
}
