import type { DocumentReference } from "firebase-admin/firestore";
import { SUBCOLLECTION_WEIGHT_ENTRIES } from "@/lib/firebase/collections";

export const WEIGHT_ENTRIES_UPDATED_EVENT = "lyka-weight-entries-updated";

export function todayIsoDateInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function normalizeWeightKg(weightKg: number) {
  return Math.round(weightKg * 1000) / 1000;
}

export function hasPetWeightChanged(previous: number | null | undefined, next: number) {
  const roundedNext = Math.round(next * 10) / 10;
  if (previous == null || !Number.isFinite(previous)) return true;
  return Math.round(previous * 10) / 10 !== roundedNext;
}

export async function upsertPetWeightEntry(petRef: DocumentReference, date: string, weightKg: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data invalida para registro de peso.");
  }
  const normalized = normalizeWeightKg(weightKg);
  if (!Number.isFinite(normalized) || normalized <= 0 || normalized > 500) {
    throw new Error("Peso invalido para registro de peso.");
  }

  const nowIso = new Date().toISOString();
  const docRef = petRef.collection(SUBCOLLECTION_WEIGHT_ENTRIES).doc(date);
  const snap = await docRef.get();
  const createdAt =
    snap.exists && typeof (snap.data() as { createdAt?: string })?.createdAt === "string"
      ? (snap.data() as { createdAt: string }).createdAt
      : nowIso;

  await docRef.set(
    {
      date,
      weightKg: normalized,
      updatedAt: nowIso,
      createdAt,
    },
    { merge: true },
  );
}

export function dispatchWeightEntriesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WEIGHT_ENTRIES_UPDATED_EVENT));
}
