import { NextResponse } from "next/server";
import {
  COLLECTION_PETS,
  SUBCOLLECTION_ACTIVITY_MINUTES,
  SUBCOLLECTION_WEIGHT_ENTRIES,
} from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import { todayIsoDateInSaoPaulo } from "@/lib/pets/weight-entries";
import { requireVetAuthContext } from "@/lib/veterinarians/auth";

type PetDoc = {
  ownerId?: string;
  petIdentity?: string;
  name?: string;
  breed?: string;
  image?: string;
  age?: unknown;
  weightKg?: unknown;
  notes?: string;
};

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toPetIdentity(value: unknown, fallback: string) {
  const normalized = toText(value).toUpperCase();
  if (!normalized) return fallback;
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return fallback;
  return normalized;
}

function formatPtBrDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function addDaysIso(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const petId = new URL(request.url).searchParams.get("petId")?.trim() ?? "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const data = (petSnap.data() ?? {}) as PetDoc;
    const ownerId = toText(data.ownerId);
    let tutorName = "Tutor(a)";
    if (ownerId) {
      try {
        const tutor = await getOrCreateCurrentUserProfile(ownerId);
        tutorName = tutor.name?.trim() || tutor.email?.trim() || "Tutor(a)";
      } catch {
        tutorName = "Tutor(a)";
      }
    }

    const [weightSnap, activitySnap] = await Promise.all([
      petRef.collection(SUBCOLLECTION_WEIGHT_ENTRIES).orderBy("date", "desc").limit(30).get(),
      petRef.collection(SUBCOLLECTION_ACTIVITY_MINUTES).orderBy("date", "desc").limit(30).get(),
    ]);

    const weightChartEntries = weightSnap.docs
      .map((doc) => {
        const entry = doc.data() as { date?: string; weightKg?: number };
        const date = typeof entry.date === "string" ? entry.date.trim() : "";
        const weightKg =
          typeof entry.weightKg === "number" && Number.isFinite(entry.weightKg) ? entry.weightKg : null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || weightKg == null) return null;
        return { date, weightKg };
      })
      .filter((entry): entry is { date: string; weightKg: number } => entry !== null);

    const activityChartEntries = activitySnap.docs
      .map((doc) => {
        const entry = doc.data() as { date?: string; minutes?: number };
        const date = typeof entry.date === "string" ? entry.date.trim() : "";
        const minutes = typeof entry.minutes === "number" && Number.isFinite(entry.minutes) ? entry.minutes : 0;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
        return { date, minutes: Math.max(0, Math.round(minutes)) };
      })
      .filter((entry): entry is { date: string; minutes: number } => entry !== null);

    const profileWeightKg = toNumberOrNull(data.weightKg);
    const latestWeightEntry = weightChartEntries[0];
    const entryWeightKg = latestWeightEntry?.weightKg ?? null;
    const weightKg = entryWeightKg ?? profileWeightKg;
    const weightDate = entryWeightKg != null ? latestWeightEntry?.date ?? null : null;

    const todayIso = todayIsoDateInSaoPaulo();
    const weekStartIso = addDaysIso(todayIso, -6);

    let todayMinutes = 0;
    let last7DaysMinutes = 0;
    let latestActivityDate = "";
    let latestActivityMinutes = 0;

    for (const doc of activitySnap.docs) {
      const entry = doc.data() as { date?: string; minutes?: number };
      const date = typeof entry.date === "string" ? entry.date : "";
      const minutes = typeof entry.minutes === "number" && Number.isFinite(entry.minutes) ? entry.minutes : 0;
      if (!latestActivityDate && date) {
        latestActivityDate = date;
        latestActivityMinutes = minutes;
      }
      if (date === todayIso) todayMinutes = minutes;
      if (date >= weekStartIso && date <= todayIso) last7DaysMinutes += minutes;
    }

    return NextResponse.json({
      health: {
        id: petId,
        name: toText(data.name) || "Pet",
        petIdentity: toPetIdentity(data.petIdentity, petId),
        breed: toText(data.breed) || "Raca nao informada",
        image: toText(data.image),
        age: toNumberOrNull(data.age),
        tutorName,
        weightKg,
        weightDate,
        weightDateLabel: weightDate ? formatPtBrDate(weightDate) : null,
        weightSource: entryWeightKg != null ? "entry" : profileWeightKg != null ? "profile" : null,
        activity: {
          todayMinutes,
          last7DaysMinutes,
          last7DaysAverage: Math.round(last7DaysMinutes / 7),
          latestDate: latestActivityDate,
          latestDateLabel: latestActivityDate ? formatPtBrDate(latestActivityDate) : null,
          latestMinutes: latestActivityMinutes,
        },
        charts: {
          weight: weightChartEntries,
          activity: activityChartEntries,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar dados de saude",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao consultar dados de saude.",
      },
      { status: 500 },
    );
  }
}
