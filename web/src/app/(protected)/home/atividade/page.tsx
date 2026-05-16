import { cookies } from "next/headers";
import Link from "next/link";
import { AppShell, TopBar } from "@/components/shell";
import { HealthActivityMinutesPanel } from "@/components/health-activity-minutes-panel";
import { IconChevronLeft } from "@/components/icons";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import type { DocumentReference } from "firebase-admin/firestore";
import { fetchWeeklyActivityLast7Days } from "@/lib/home/weekly-activity";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

export const dynamic = "force-dynamic";

export default async function HomeAtividadePage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  let petRef: DocumentReference | null = null;
  if (uid) {
    try {
      petRef = (await getOrCreateCurrentPet(uid)).petRef;
    } catch {
      petRef = null;
    }
  }
  const weeklyActivityData = await fetchWeeklyActivityLast7Days(petRef);
  const avgActivity = Math.round(
    weeklyActivityData.reduce((total, item) => total + item.activeMinutes, 0) /
      Math.max(weeklyActivityData.length, 1),
  );

  const back = (
    <Link
      href="/home"
      prefetch
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.97]"
      aria-label="Voltar"
    >
      <IconChevronLeft className="h-5 w-5" aria-hidden />
    </Link>
  );

  return (
    <AppShell tab="home">
      <TopBar title="Atividade" subtitle="Minutos ativos" leadingAction={back} action={null} />
      <section
        data-lyka-shell-span="full"
        className="appear-up mt-3 overflow-hidden rounded-[28px] bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 p-5 text-white shadow-[0_20px_40px_-28px_rgba(6,78,59,0.65)]"
        style={{ animationDelay: "40ms" }}
      >
        <p className="text-[12px] font-medium text-emerald-100">Media na semana</p>
        <p className="mt-1 text-[36px] font-semibold leading-none tracking-tight tabular-nums">
          {avgActivity}
          <span className="ml-1.5 text-[18px] font-medium text-emerald-100">min/dia</span>
        </p>
        <p className="mt-3 text-[11px] leading-snug text-emerald-100/90">
          Meta sugerida: 60 minutos de movimento por dia.
        </p>
      </section>
      <HealthActivityMinutesPanel />
    </AppShell>
  );
}
