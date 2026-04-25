import type { DocumentReference, QueryDocumentSnapshot } from "firebase-admin/firestore";
import {
  SUBCOLLECTION_MEDICATION_REMINDERS,
  SUBCOLLECTION_VACCINES,
  SUBCOLLECTION_VACCINES_LEGACY,
} from "@/lib/firebase/collections";

export type HomeUpcomingEventRow = {
  id: string;
  label: string;
  when: string;
  kind: "warning" | "info";
  sortAt: number;
};

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

function parseIsoDateAtLocalMidnight(iso: string): number {
  const [y, mo, d] = iso.split("-").map(Number);
  if (!y || !mo || !d) return Number.POSITIVE_INFINITY;
  return new Date(y, mo - 1, d, 0, 0, 0, 0).getTime();
}

function formatVaccineWhenLabel(isoDate: string): string {
  const eventStart = parseIsoDateAtLocalMidnight(isoDate);
  const today0 = startOfLocalDay(new Date());
  const diffDays = Math.round((eventStart - today0) / (24 * 60 * 60 * 1000));
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(eventStart));
  if (diffDays < 0) return `Atrasada (${formatted})`;
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  return `Em ${formatted}`;
}

function nextMedicationOccurrenceMs(timeHHmm: string): number {
  const [h, m] = timeHHmm.split(":").map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return Number.POSITIVE_INFINITY;
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime();
}

function formatMedicationWhenLabel(timeHHmm: string): string {
  const nextMs = nextMedicationOccurrenceMs(timeHHmm);
  const next = new Date(nextMs);
  const today0 = startOfLocalDay(new Date());
  const diffDays = Math.round((startOfLocalDay(next) - today0) / (24 * 60 * 60 * 1000));
  const hm = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(next);
  if (diffDays === 0) return `Hoje às ${hm}`;
  if (diffDays === 1) return `Amanhã às ${hm}`;
  const d = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(next);
  return `${d} às ${hm}`;
}

async function readVaccineDocsUnified(petRef: DocumentReference): Promise<QueryDocumentSnapshot[]> {
  const snapshots = await Promise.all([
    petRef.collection(SUBCOLLECTION_VACCINES).get(),
    petRef.collection(SUBCOLLECTION_VACCINES_LEGACY).get(),
  ]);
  const deduped = new Map<string, QueryDocumentSnapshot>();
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      if (!deduped.has(doc.id)) deduped.set(doc.id, doc);
    }
  }
  return Array.from(deduped.values());
}

export async function fetchHomeUpcomingEvents(petRef: DocumentReference, limit = 12): Promise<HomeUpcomingEventRow[]> {
  const rows: HomeUpcomingEventRow[] = [];

  const vaccineDocs = await readVaccineDocsUnified(petRef);
  for (const doc of vaccineDocs) {
    const data = doc.data() as { name?: string; status?: string; date?: string };
    if (data.status !== "pending") continue;
    const date = typeof data.date === "string" ? data.date.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const sortAt = parseIsoDateAtLocalMidnight(date);
    const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Vacina";
    rows.push({
      id: `v-${doc.id}`,
      label: `${name} (pendente)`,
      when: formatVaccineWhenLabel(date),
      kind: "warning",
      sortAt,
    });
  }

  const reminderSnap = await petRef
    .collection(SUBCOLLECTION_MEDICATION_REMINDERS)
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  for (const doc of reminderSnap.docs) {
    const data = doc.data() as { name?: string; time?: string };
    const time = typeof data.time === "string" ? data.time.trim() : "";
    if (!/^\d{2}:\d{2}$/.test(time)) continue;
    const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Medicação";
    const sortAt = nextMedicationOccurrenceMs(time);
    rows.push({
      id: `m-${doc.id}`,
      label: `Lembrete: ${name}`,
      when: formatMedicationWhenLabel(time),
      kind: "info",
      sortAt,
    });
  }

  rows.sort((a, b) => a.sortAt - b.sortAt);
  return rows.slice(0, limit);
}
