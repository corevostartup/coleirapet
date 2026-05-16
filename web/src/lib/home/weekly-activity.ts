import type { DocumentReference } from "firebase-admin/firestore";
import { SUBCOLLECTION_ACTIVITY_MINUTES } from "@/lib/firebase/collections";
import { weeklyActivity } from "@/lib/mock";

export type ActivityMinutesDoc = {
  date?: string;
  minutes?: number;
};

export type WeeklyActivityDay = {
  day: string;
  activeMinutes: number;
  steps: number;
};

export function buildFallbackWeeklyActivity(): WeeklyActivityDay[] {
  return weeklyActivity.map((item) => ({ ...item }));
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toIsoDate(value: Date) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Ultimos 7 dias de minutos ativos (mesma logica que o card da Home). */
export async function fetchWeeklyActivityLast7Days(petRef: DocumentReference | null): Promise<WeeklyActivityDay[]> {
  if (!petRef) return buildFallbackWeeklyActivity();
  try {
    const activitySnapshot = await petRef
      .collection(SUBCOLLECTION_ACTIVITY_MINUTES)
      .orderBy("date", "desc")
      .limit(90)
      .get();

    const activityByDate = new Map<string, number>();
    for (const doc of activitySnapshot.docs) {
      const data = doc.data() as ActivityMinutesDoc;
      const date = typeof data.date === "string" ? data.date : "";
      const minutes = typeof data.minutes === "number" ? Math.max(0, Math.round(data.minutes)) : 0;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (activityByDate.has(date)) continue;
      activityByDate.set(date, minutes);
    }

    const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"] as const;
    const today = startOfDay(new Date());
    const last7Days: WeeklyActivityDay[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const jsDay = date.getDay();
      const label = labels[(jsDay + 6) % 7];
      const isoDate = toIsoDate(date);
      const activeMinutes = activityByDate.get(isoDate) ?? 0;
      last7Days.push({ day: label, activeMinutes, steps: 0 });
    }
    return last7Days;
  } catch {
    return buildFallbackWeeklyActivity();
  }
}
