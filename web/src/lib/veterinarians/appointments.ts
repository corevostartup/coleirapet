import {
  COLLECTION_PETS,
  COLLECTION_VETERINARIANS,
  SUBCOLLECTION_VET_APPOINTMENTS,
} from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export const APPOINTMENT_STATUSES = ["Aguardando", "Em atendimento", "Finalizado"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const TRIAGE_URGENCY_LEVELS = ["Rotina", "Moderada", "Urgente", "Emergencia"] as const;
export type TriageUrgency = (typeof TRIAGE_URGENCY_LEVELS)[number];

export type VetAppointmentRecord = {
  id: string;
  petId: string;
  petName: string;
  petIdentity: string;
  tutorName: string;
  status: AppointmentStatus;
  chiefComplaint: string;
  symptoms: string;
  symptomDuration: string;
  urgency: TriageUrgency;
  temperature: string;
  additionalNotes: string;
  triagedAt: string;
  triagedByUid: string;
  triagedByName: string;
  triagedByCrmv: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type CreateTriagePayload = {
  petId: string;
  chiefComplaint: string;
  symptoms?: string;
  symptomDuration?: string;
  urgency?: TriageUrgency;
  temperature?: string;
  additionalNotes?: string;
};

function toText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

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

function normalizeStatus(value: unknown): AppointmentStatus {
  const text = toText(value);
  if (text === "Em atendimento" || text === "Finalizado") return text;
  return "Aguardando";
}

function normalizeUrgency(value: unknown): TriageUrgency {
  const text = toText(value);
  if (text === "Moderada" || text === "Urgente" || text === "Emergencia") return text;
  return "Rotina";
}

export function formatAppointmentWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (sameDay) return `Hoje ${time}`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function nextAppointmentStatus(current: AppointmentStatus): AppointmentStatus {
  if (current === "Aguardando") return "Em atendimento";
  if (current === "Em atendimento") return "Finalizado";
  return "Finalizado";
}

function appointmentFromDoc(id: string, data: Record<string, unknown>): VetAppointmentRecord {
  return {
    id,
    petId: toText(data.petId),
    petName: toText(data.petName, "Pet"),
    petIdentity: toText(data.petIdentity),
    tutorName: toText(data.tutorName, "Tutor(a)"),
    status: normalizeStatus(data.status),
    chiefComplaint: toText(data.chiefComplaint),
    symptoms: toText(data.symptoms),
    symptomDuration: toText(data.symptomDuration),
    urgency: normalizeUrgency(data.urgency),
    temperature: toText(data.temperature),
    additionalNotes: toText(data.additionalNotes),
    triagedAt: isoFromFirestoreTime(data.triagedAt) || isoFromFirestoreTime(data.updatedAt) || new Date(0).toISOString(),
    triagedByUid: toText(data.triagedByUid),
    triagedByName: toText(data.triagedByName, "Veterinario"),
    triagedByCrmv: toText(data.triagedByCrmv, "Nao informado"),
    startedAt: isoFromFirestoreTime(data.startedAt) || null,
    finishedAt: isoFromFirestoreTime(data.finishedAt) || null,
    updatedAt: isoFromFirestoreTime(data.updatedAt) || new Date(0).toISOString(),
  };
}

function appointmentsRef(vetUid: string) {
  return getFirebaseAdminDb()
    .collection(COLLECTION_VETERINARIANS)
    .doc(vetUid)
    .collection(SUBCOLLECTION_VET_APPOINTMENTS);
}

export async function listVetAppointments(vetUid: string, limit = 80) {
  const snapshot = await appointmentsRef(vetUid).orderBy("triagedAt", "desc").limit(limit).get();
  return snapshot.docs.map((doc) => appointmentFromDoc(doc.id, (doc.data() ?? {}) as Record<string, unknown>));
}

export async function findOpenAppointmentForPet(vetUid: string, petId: string) {
  const appointments = await listVetAppointments(vetUid, 100);
  return (
    appointments.find((item) => item.petId === petId && (item.status === "Aguardando" || item.status === "Em atendimento")) ??
    null
  );
}

export async function getVetAppointment(vetUid: string, appointmentId: string) {
  const snap = await appointmentsRef(vetUid).doc(appointmentId).get();
  if (!snap.exists) return null;
  return appointmentFromDoc(snap.id, (snap.data() ?? {}) as Record<string, unknown>);
}

export async function createTriageAppointment(
  vetUid: string,
  vet: { name: string; crmv: string },
  payload: CreateTriagePayload,
  pet: { id: string; name: string; petIdentity: string; tutorName: string },
) {
  const existing = await findOpenAppointmentForPet(vetUid, pet.id);
  if (existing) {
    throw new Error("Este pet ja esta na fila de atendimentos.");
  }

  const nowIso = new Date().toISOString();
  const ref = appointmentsRef(vetUid).doc();
  const record: Omit<VetAppointmentRecord, "id"> = {
    petId: pet.id,
    petName: pet.name,
    petIdentity: pet.petIdentity,
    tutorName: pet.tutorName,
    status: "Aguardando",
    chiefComplaint: payload.chiefComplaint.trim().slice(0, 300),
    symptoms: (payload.symptoms ?? "").trim().slice(0, 1200),
    symptomDuration: (payload.symptomDuration ?? "").trim().slice(0, 120),
    urgency: payload.urgency ?? "Rotina",
    temperature: (payload.temperature ?? "").trim().slice(0, 20),
    additionalNotes: (payload.additionalNotes ?? "").trim().slice(0, 1200),
    triagedAt: nowIso,
    triagedByUid: vetUid,
    triagedByName: vet.name.slice(0, 80),
    triagedByCrmv: (vet.crmv || "Nao informado").slice(0, 40),
    startedAt: null,
    finishedAt: null,
    updatedAt: nowIso,
  };

  await ref.set(record);
  return { ...record, id: ref.id };
}

export async function advanceVetAppointment(vetUid: string, appointmentId: string) {
  const current = await getVetAppointment(vetUid, appointmentId);
  if (!current) throw new Error("Atendimento nao encontrado.");
  if (current.status === "Finalizado") throw new Error("Atendimento ja finalizado.");

  const nextStatus = nextAppointmentStatus(current.status);
  const nowIso = new Date().toISOString();
  const patch: Record<string, string | null> = {
    status: nextStatus,
    updatedAt: nowIso,
  };
  if (nextStatus === "Em atendimento") patch.startedAt = nowIso;
  if (nextStatus === "Finalizado") patch.finishedAt = nowIso;

  await appointmentsRef(vetUid).doc(appointmentId).set(patch, { merge: true });
  return { ...current, ...patch, status: nextStatus as AppointmentStatus };
}

export async function finalizeAppointmentForPet(vetUid: string, petId: string) {
  const open = await findOpenAppointmentForPet(vetUid, petId);
  if (!open || open.status !== "Em atendimento") return null;

  const nowIso = new Date().toISOString();
  await appointmentsRef(vetUid).doc(open.id).set(
    {
      status: "Finalizado",
      finishedAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true },
  );
  return open.id;
}

export async function loadPetForTriage(petId: string) {
  const snap = await getFirebaseAdminDb().collection(COLLECTION_PETS).doc(petId).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  const name = toText(data.name);
  const ownerId = toText(data.ownerId);
  if (!name || !ownerId) return null;

  let petIdentity = toText(data.petIdentity).toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(petIdentity)) petIdentity = snap.id;

  return {
    id: snap.id,
    ownerId,
    name,
    petIdentity,
    breed: toText(data.breed),
    image: toText(data.image),
    age: typeof data.age === "number" && Number.isFinite(data.age) ? data.age : null,
    weightKg: typeof data.weightKg === "number" && Number.isFinite(data.weightKg) ? data.weightKg : null,
    notes: toText(data.notes),
  };
}
