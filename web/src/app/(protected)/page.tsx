import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { NFCPairLink } from "@/components/nfc-pair-link";
import { HomeLocationSecurityCard } from "@/components/home-location-security-card";
import { HomeWeightChartSection } from "@/components/home-weight-chart-section";
import { AppShell, TopBar } from "@/components/shell";
import { ProductCarousel } from "@/components/product-carousel";
import { IconCollar, IconStethoscope, IconVaccineWallet, IconWave } from "@/components/icons";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import type { DocumentReference } from "firebase-admin/firestore";
import { fetchHomeUpcomingEvents } from "@/lib/home/upcoming-events";
import { fetchWeeklyActivityLast7Days } from "@/lib/home/weekly-activity";
import { metrics, pet } from "@/lib/mock";
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

  const weeklyActivityData = await fetchWeeklyActivityLast7Days(petRef);
  let upcomingEvents: Awaited<ReturnType<typeof fetchHomeUpcomingEvents>> = [];
  if (uid && petRef) {
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
            data-lyka-shell-span="full"
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

        <section
          data-lyka-shell-span="full"
          className="appear-up mt-3 overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_20px_40px_-28px_rgba(12,18,14,0.5)]"
          style={{ animationDelay: "60ms" }}
        >
          <div className="relative h-[260px]">
            <Image
              src={cardPet.image}
              alt="Pet com coleira inteligente"
              fill
              priority
              className="object-cover"
                    sizes="(max-width: 767px) 100vw, min(50vw, 520px)"
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

        <section
          data-lyka-shell-span="full"
          className="appear-up mt-3 rounded-[26px] bg-white px-3 py-2 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
          style={{ animationDelay: "120ms" }}
        >
          <ProductCarousel />
        </section>

        <section
          data-lyka-shell-span="full"
          className="appear-up mt-3 grid grid-cols-4 gap-1.5 sm:gap-2"
          style={{ animationDelay: "180ms" }}
        >
          {metrics.map((item) => (
            <article key={item.label} className="elev-card min-w-0 rounded-xl p-1.5 sm:p-2">
              <p className="truncate text-[9px] uppercase tracking-wide text-zinc-500">{item.label}</p>
              <p className="mt-1.5 text-[15px] font-semibold leading-none text-zinc-900">
                {item.value}
                <span className="ml-1 text-[9px] font-medium text-zinc-500">{item.unit}</span>
              </p>
              <p className={`mt-1 text-[9px] font-medium ${item.tone}`}>{item.status}</p>
            </article>
          ))}
        </section>

        <section
          data-lyka-shell-span="full"
          className="appear-up mt-3"
          style={{ animationDelay: "210ms" }}
        >
          <Link
            href="/dados/carteira-vacinacao"
            className="flex items-center justify-between gap-3 rounded-[26px] border border-emerald-200 bg-emerald-50 px-4 py-3.5 shadow-[0_16px_28px_-22px_rgba(16,94,62,0.22)] transition hover:border-emerald-300 hover:bg-emerald-100/80"
          >
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-emerald-950">Carteira de vacinação</p>
              <p className="mt-0.5 text-[11px] text-emerald-900/85">
                Consulte vacinas aplicadas e abra a carteira completa do pet.
              </p>
            </div>
            <IconVaccineWallet className="h-9 w-9 shrink-0 text-emerald-700" aria-hidden />
          </Link>
        </section>

        <div
          data-lyka-shell-span="full"
          className="appear-up grid grid-cols-2 gap-2 sm:gap-3"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href="/home/atividade"
            prefetch
            className="group block min-h-0 min-w-0 rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 sm:rounded-[26px]"
          >
            <article className="flex aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px] border border-zinc-100/80 bg-white p-2.5 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)] transition active:scale-[0.98] group-hover:border-emerald-300/60 sm:rounded-[26px] sm:p-3">
              <div className="mb-1 flex items-center justify-between gap-1">
                <h3 className="truncate text-[12px] font-semibold text-zinc-900 sm:text-[13px]">Atividade</h3>
                <IconWave className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              </div>
              <p className="mb-2 line-clamp-2 text-[10px] leading-snug text-zinc-500">
                Ø {avgActivity} min/d · meta 60
              </p>
              <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-100 bg-zinc-50 p-2">
                <div className="grid min-h-0 flex-1 grid-cols-7 items-end gap-0.5 sm:gap-1">
                  {weeklyActivityData.map((item) => (
                    <div key={item.day} className="flex min-w-0 flex-col items-center gap-0.5">
                      <span className="text-[8px] font-semibold tabular-nums text-zinc-500 sm:text-[9px]">{item.activeMinutes}</span>
                      <div
                        className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500 to-emerald-300"
                        style={{
                          height: `${6 + (item.activeMinutes / maxActivity) * 42}px`,
                          minHeight: "5px",
                        }}
                        title={`${item.activeMinutes} min`}
                      />
                      <span className="text-[8px] font-medium text-zinc-500 sm:text-[9px]">{item.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </Link>

          <Link
            href="/home/peso"
            prefetch
            className="group block min-h-0 min-w-0 rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 sm:rounded-[26px]"
          >
            <HomeWeightChartSection animationDelay="240ms" compact />
          </Link>
        </div>

        <div data-lyka-shell-span="full">
          <HomeLocationSecurityCard
            addressLabel={locationAddressLabel}
            updateLabel={locationUpdateLabel}
            lat={hasRealNfcLocation ? nfcLat : null}
            lng={hasRealNfcLocation ? nfcLng : null}
            animationDelay="320ms"
          />
        </div>

        <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "380ms" }}>
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
