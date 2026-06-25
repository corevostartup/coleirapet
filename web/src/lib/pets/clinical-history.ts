import type { DocumentReference } from "firebase-admin/firestore";
import {
  SUBCOLLECTION_MEDICATION_REMINDERS,
  SUBCOLLECTION_PET_CLINICAL_RECORDS,
  SUBCOLLECTION_VACCINES,
  SUBCOLLECTION_VACCINES_LEGACY,
} from "@/lib/firebase/collections";
import { resolveVeterinarianIdentity } from "@/lib/veterinarians/auth";

export type ClinicalHistoryKind = "clinical" | "vaccine" | "medication";

export type ClinicalHistoryItem = {
  id: string;
  kind: ClinicalHistoryKind;
  kindLabel: string;
  title: string;
  detail: string;
  prescribedByName: string;
  prescribedByCrmv: string;
  createdAtIso: string;
  when: string;
};

export type ClinicalHistoryItemWithPet = ClinicalHistoryItem & {
  petId: string;
  veterinarianLabel: string;
};

function isoFromFirestoreTime(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value != null && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return "";
    }
  }
  return "";
}

export function formatClinicalHistoryWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function kindLabel(kind: ClinicalHistoryKind) {
  if (kind === "vaccine") return "Vacina";
  if (kind === "medication") return "Medicacao";
  return "Prontuario";
}

function formatVeterinarianLabel(name: string, crmv: string) {
  const trimmedName = name.trim();
  const trimmedCrmv = crmv.trim();
  if (trimmedName && trimmedCrmv && trimmedCrmv !== "Nao informado") {
    return `${trimmedName} · CRMV ${trimmedCrmv}`;
  }
  if (trimmedName) return trimmedName;
  return "";
}

async function resolveAuthorFields(
  data: {
    prescribedByName?: string;
    prescribedByCrmv?: string;
    createdByUid?: string;
    recordedByUid?: string;
    veterinarian?: string;
  },
  cache: Map<string, { name: string; crmv: string }>,
) {
  const storedName = typeof data.prescribedByName === "string" ? data.prescribedByName.trim() : "";
  const storedCrmv = typeof data.prescribedByCrmv === "string" ? data.prescribedByCrmv.trim() : "";
  if (storedName && storedCrmv && storedCrmv !== "Nao informado") {
    return { prescribedByName: storedName, prescribedByCrmv: storedCrmv };
  }

  const authorUid =
    (typeof data.createdByUid === "string" && data.createdByUid.trim()) ||
    (typeof data.recordedByUid === "string" && data.recordedByUid.trim()) ||
    "";

  if (authorUid) {
    if (!cache.has(authorUid)) {
      const identity = await resolveVeterinarianIdentity(authorUid);
      cache.set(authorUid, {
        name: identity.name,
        crmv: identity.crmv || "Nao informado",
      });
    }
    const resolved = cache.get(authorUid)!;
    return {
      prescribedByName: storedName || resolved.name,
      prescribedByCrmv: storedCrmv && storedCrmv !== "Nao informado" ? storedCrmv : resolved.crmv,
    };
  }

  const legacyVet = typeof data.veterinarian === "string" ? data.veterinarian.trim() : "";
  if (legacyVet) {
    return { prescribedByName: legacyVet, prescribedByCrmv: storedCrmv || "Nao informado" };
  }

  return {
    prescribedByName: storedName || "Veterinario",
    prescribedByCrmv: storedCrmv || "Nao informado",
  };
}

export async function loadPetClinicalHistory(petRef: DocumentReference, petId: string): Promise<ClinicalHistoryItemWithPet[]> {
  const authorCache = new Map<string, { name: string; crmv: string }>();
  const [clinicalSnap, vaccinesSnap, vaccinesLegacySnap, medicationsSnap] = await Promise.all([
    petRef.collection(SUBCOLLECTION_PET_CLINICAL_RECORDS).limit(200).get(),
    petRef.collection(SUBCOLLECTION_VACCINES).limit(200).get(),
    petRef.collection(SUBCOLLECTION_VACCINES_LEGACY).limit(200).get(),
    petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).limit(200).get(),
  ]);

  const items: ClinicalHistoryItem[] = [];

  for (const doc of clinicalSnap.docs) {
    const data = doc.data() as {
      kind?: string;
      diagnosis?: string;
      note?: string;
      prescribedByName?: string;
      prescribedByCrmv?: string;
      recordedByUid?: string;
      createdAt?: unknown;
    };
    const author = await resolveAuthorFields(data, authorCache);
    const createdAtIso = isoFromFirestoreTime(data.createdAt);
    items.push({
      id: `clinical-${doc.id}`,
      kind: "clinical",
      kindLabel: kindLabel("clinical"),
      title: typeof data.diagnosis === "string" && data.diagnosis.trim() ? data.diagnosis.trim() : "Registro clinico",
      detail: typeof data.note === "string" ? data.note.trim() : "",
      prescribedByName: author.prescribedByName,
      prescribedByCrmv: author.prescribedByCrmv,
      createdAtIso,
      when: formatClinicalHistoryWhen(createdAtIso),
    });
  }

  const vaccineDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const doc of [...vaccinesSnap.docs, ...vaccinesLegacySnap.docs]) {
    if (!vaccineDocs.has(doc.id)) vaccineDocs.set(doc.id, doc);
  }

  for (const doc of vaccineDocs.values()) {
    const data = doc.data() as {
      name?: string;
      date?: string;
      nextDose?: string;
      observation?: string;
      notes?: string;
      prescribedByName?: string;
      prescribedByCrmv?: string;
      createdByUid?: string;
      veterinarian?: string;
      createdAt?: unknown;
    };
    const author = await resolveAuthorFields(data, authorCache);
    const createdAtIso = isoFromFirestoreTime(data.createdAt);
    const observation = (typeof data.observation === "string" ? data.observation : "") || (typeof data.notes === "string" ? data.notes : "");
    const date = typeof data.date === "string" ? data.date.trim() : "";
    const nextDose = typeof data.nextDose === "string" ? data.nextDose.trim() : "";
    const detailParts = [
      date ? `Aplicada em ${date}` : "",
      nextDose ? `Proxima dose: ${nextDose}` : "",
      observation.trim(),
    ].filter(Boolean);

    items.push({
      id: `vaccine-${doc.id}`,
      kind: "vaccine",
      kindLabel: kindLabel("vaccine"),
      title: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Vacina",
      detail: detailParts.join(" · "),
      prescribedByName: author.prescribedByName,
      prescribedByCrmv: author.prescribedByCrmv,
      createdAtIso,
      when: formatClinicalHistoryWhen(createdAtIso),
    });
  }

  for (const doc of medicationsSnap.docs) {
    const data = doc.data() as {
      name?: string;
      dose?: string;
      duration?: string;
      observation?: string;
      prescribedByName?: string;
      prescribedByCrmv?: string;
      createdByUid?: string;
      createdAt?: unknown;
    };
    const author = await resolveAuthorFields(data, authorCache);
    const createdAtIso = isoFromFirestoreTime(data.createdAt);
    const dose = typeof data.dose === "string" ? data.dose.trim() : "";
    const duration = typeof data.duration === "string" ? data.duration.trim() : "";
    const observation = typeof data.observation === "string" ? data.observation.trim() : "";
    const detailParts = [dose, duration ? `Duracao: ${duration}` : "", observation].filter(Boolean);

    items.push({
      id: `medication-${doc.id}`,
      kind: "medication",
      kindLabel: kindLabel("medication"),
      title: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Medicacao",
      detail: detailParts.join(" · "),
      prescribedByName: author.prescribedByName,
      prescribedByCrmv: author.prescribedByCrmv,
      createdAtIso,
      when: formatClinicalHistoryWhen(createdAtIso),
    });
  }

  return items
    .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso))
    .map((item) => ({
      ...item,
      petId,
      veterinarianLabel: formatVeterinarianLabel(item.prescribedByName, item.prescribedByCrmv),
    }));
}
