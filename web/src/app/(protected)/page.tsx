import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { NFCPairLink } from "@/components/nfc-pair-link";
import { HomeLocationSecurityCard } from "@/components/home-location-security-card";
import { AppShell, TopBar } from "@/components/shell";
import { ProductCarousel } from "@/components/product-carousel";
import { IconCollar, IconStethoscope, IconWave } from "@/components/icons";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import type { DocumentReference } from "firebase-admin/firestore";
import { SUBCOLLECTION_ACTIVITY_MINUTES } from "@/lib/firebase/collections";
import { fetchHomeUpcomingEvents } from "@/lib/home/upcoming-events";
import { metrics, pet, weeklyActivity } from "@/lib/mock";
import { getOrCreateCurrentPet } from "@/lib/pets/current";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

function formatPtBrDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function isCoordinateLikeAddress(value: string | null | undefined) {
  if (!value) return false;
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

type ActivityMinutesDoc = {
  date?: string;
  minutes?: number;
};

function buildFallbackWeeklyActivity() {
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

/** Cookie definido pelo app iOS apos gravar a tag; cobre cache stale do pet em outra instancia. */
const NFC_PAIRED_COOKIE = "cp_nfc_paired";

export const dynamic = "force-dynamic";

export default async function Home() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  let currentUser = null;
  let currentPet = null;
  let petRef: DocumentReference | null = null;
  if (uid) {
    try {
      currentUser = await getOrCreateCurrentUserProfile(uid);
    } catch {
      // Evita tela branca/500 quando ambiente está sem Firebase Admin em produção.
      currentUser = null;
    }
    try {
      const result = await getOrCreateCurrentPet(uid);
      currentPet = result.pet;
      petRef = result.petRef;
    } catch {
      currentPet = null;
      petRef = null;
    }
  }
  const nfcIdTrimmed = (currentPet?.nfcId ?? "").trim();
  const nfcPairedCookie = jar.get(NFC_PAIRED_COOKIE)?.value === "1";
  const isNfcPaired = Boolean(nfcIdTrimmed) || nfcPairedCookie;
  const isVet = currentUser?.userType === "vet";
  const cardPet = {
    image: currentPet?.image ?? pet.image,
    name: currentPet?.name ?? pet.name,
    breed: currentPet?.breed ?? pet.breed,
    /** Com pet persistido, só a idade do cadastro (null = nao informada); evita cair no mock "3 anos". */
    age: currentPet ? currentPet.age : (pet.age ?? null),
    wellbeing: pet.wellbeing,
  };
  const nfcLat = currentPet?.lastNfcAccessLat;
  const nfcLng = currentPet?.lastNfcAccessLng;
  const hasRealNfcLocation = typeof nfcLat === "number" && typeof nfcLng === "number";
  const storedAddress = currentPet?.lastNfcAccessAddress;
  const locationAddressLabel =
    storedAddress && !isCoordinateLikeAddress(storedAddress)
      ? storedAddress
      : hasRealNfcLocation
        ? "Endereco ainda nao disponivel"
        : "Nenhuma localizacao registrada";
  const locationUpdateLabel = hasRealNfcLocation
    ? `Ultimo acesso NFC: ${formatPtBrDateTime(currentPet?.lastNfcAccessAt) ?? "agora"} · Zona segura ativa`
    : "Aguardando compartilhamento de localizacao via NFC";

  let weeklyActivityData = buildFallbackWeeklyActivity();
  let upcomingEvents: Awaited<ReturnType<typeof fetchHomeUpcomingEvents>> = [];
  if (uid && petRef) {
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
      const last7Days: Array<{ day: string; activeMinutes: number; steps: number }> = [];
      for (let offset = 6; offset >= 0; offset--) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        const jsDay = date.getDay();
        const label = labels[(jsDay + 6) % 7];
        const isoDate = toIsoDate(date);
        const activeMinutes = activityByDate.get(isoDate) ?? 0;
        last7Days.push({ day: label, activeMinutes, steps: 0 });
      }
      weeklyActivityData = last7Days;
    } catch {
      // Em caso de falha, mantém visual e dados mock como fallback.
      weeklyActivityData = buildFallbackWeeklyActivity();
    }
    try {
      upcomingEvents = await fetchHomeUpcomingEvents(petRef);
    } catch {
      upcomingEvents = [];
    }
  }

  const maxActivity = Math.max(...weeklyActivityData.map((item) => item.activeMinutes), 1);
  const avgActivity = Math.round(
    weeklyActivityData.reduce((total, item) => total + item.activeMinutes, 0) / weeklyActivityData.length,
  );
  const avgSteps = Math.round(
    weeklyActivityData.reduce((total, item) => total + item.steps, 0) / weeklyActivityData.length,
  );

  return (
    <AppShell tab="home">
      <TopBar title="Monitoramento" subtitle="Lyka">
        {isVet ? (
          <Link
            href="/vet/pets"
            className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 shadow-sm transition hover:bg-emerald-100/90"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-emerald-900">Area medica · veterinario</p>
              <p className="mt-0.5 text-[11px] text-emerald-800/90">Prontuario, vacinas e dados publicos</p>
            </div>
            <IconStethoscope className="h-8 w-8 shrink-0 text-emerald-700" aria-hidden />
          </Link>
        ) : null}
      </TopBar>

        {!isNfcPaired ? (
          <section
            className="appear-up mt-3 rounded-[26px] border border-emerald-200/90 bg-gradient-to-b from-emerald-50 via-white to-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
            style={{ animationDelay: "50ms" }}
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconCollar className="h-5 w-5 text-emerald-800" aria-hidden />
                <h3 className="text-[14px] font-semibold text-zinc-900">Tag NFC</h3>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200/80">
                Proximo passo
              </span>
            </div>
            <p className="mb-3 text-[12px] leading-snug text-zinc-700">
              Pareie agora para liberar dados publicos e contato de emergencia na coleira deste pet — leva menos de um minuto.
            </p>
            <NFCPairLink
              href="/tag-nfc/parear"
              className="cta-nfc-attention relative flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 text-[14px] font-semibold shadow-lg transition hover:from-emerald-500 hover:to-emerald-600 hover:shadow-xl active:scale-[0.99]"
            >
              <span className="relative z-10 font-semibold text-emerald-50 drop-shadow-sm">Parear Tag NFC</span>
            </NFCPairLink>
            <p className="mt-2 text-center text-[10px] font-medium leading-snug text-emerald-800/90">
              Conecte seu dispositivo NFC ao perfil para sincronizar a coleira e liberar dados em emergência.
            </p>
          </section>
        ) : null}

        <section className="appear-up mt-3 overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_20px_40px_-28px_rgba(12,18,14,0.5)]" style={{ animationDelay: "60ms" }}>
          <div className="relative h-[260px]">
            <Image
              src={cardPet.image}
              alt="Pet com coleira inteligente"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 440px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <h2 className="text-[30px] font-semibold leading-none tracking-tight text-white">{cardPet.name}</h2>
                <p className="mt-1 text-[13px] text-white/80">
                  {cardPet.breed} · {cardPet.age === null ? "Idade nao informada" : `${cardPet.age} anos`}
                </p>
              </div>
              <span className="rounded-full border border-white/25 bg-white/20 px-3 py-1 text-[12px] font-medium text-white backdrop-blur">Bem-estar {cardPet.wellbeing}%</span>
            </div>
          </div>
        </section>

        <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "120ms" }}>
          <h3 className="mb-3 text-[14px] font-semibold text-zinc-900">Produtos</h3>

          <ProductCarousel />
        </section>

        <section className="appear-up mt-3 grid grid-cols-4 gap-2" style={{ animationDelay: "180ms" }}>
          {metrics.map((item) => (
            <article key={item.label} className="elev-card rounded-xl p-2">
              <p className="truncate text-[9px] uppercase tracking-wide text-zinc-500">{item.label}</p>
              <p className="mt-1.5 text-[15px] font-semibold leading-none text-zinc-900">
                {item.value}
                <span className="ml-1 text-[9px] font-medium text-zinc-500">{item.unit}</span>
              </p>
              <p className={`mt-1 text-[9px] font-medium ${item.tone}`}>{item.status}</p>
            </article>
          ))}
        </section>

        <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "240ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-zinc-900">Atividade semanal</h3>
            <IconWave className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="mb-3 flex items-center justify-between text-[11px]">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">Minutos ativos por dia</span>
            <span className="text-zinc-500">Meta: 60 min</span>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
            <div className="grid grid-cols-7 items-end gap-2">
              {weeklyActivityData.map((item) => (
                <div key={item.day} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500">{item.activeMinutes}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-300"
                    style={{
                      height: `${12 + (item.activeMinutes / maxActivity) * 90}px`,
                      minHeight: "12px",
                    }}
                    title={`${item.activeMinutes} min`}
                  />
                  <span className="text-[10px] font-medium text-zinc-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">Media: {avgActivity} min/dia · {Math.round(avgSteps / 100) / 10} mil passos por dia</p>
        </section>

        <HomeLocationSecurityCard
          addressLabel={locationAddressLabel}
          updateLabel={locationUpdateLabel}
          lat={hasRealNfcLocation ? nfcLat : null}
          lng={hasRealNfcLocation ? nfcLng : null}
          animationDelay="300ms"
        />

        <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "360ms" }}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-semibold text-zinc-900">Proximos eventos</h3>
              <p className="mt-0.5 text-[11px] text-zinc-500">Vacinas pendentes e lembretes de medicacao do pet</p>
            </div>
            <Link href="/dados" className="text-[11px] font-semibold text-emerald-700 underline decoration-emerald-600/35 underline-offset-2">
              Ver em Dados
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-500">
                Nenhuma vacina pendente nem lembrete cadastrado.{" "}
                <Link href="/dados" className="font-semibold text-emerald-700 underline decoration-emerald-600/35">
                  Abrir Dados
                </Link>
              </p>
            ) : (
              upcomingEvents.map((item) => (
                <Link
                  key={item.id}
                  href="/dados"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.kind === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                    <div className="min-w-0">
                      <span
                        className={`mb-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                          item.source === "vaccine" ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                        }`}
                      >
                        {item.source === "vaccine" ? "Vacina pendente" : "Lembrete"}
                      </span>
                      <p className="truncate text-[13px] font-medium text-zinc-800">{item.label}</p>
                    </div>
                  </div>
                  <p className="shrink-0 text-right text-[11px] text-zinc-500">{item.when}</p>
                </Link>
              ))
            )}
          </div>
        </section>
    </AppShell>
  );
}
