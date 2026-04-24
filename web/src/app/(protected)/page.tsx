import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { NFCPairLink } from "@/components/nfc-pair-link";
import { AppShell, TopBar } from "@/components/shell";
import { ProductCarousel } from "@/components/product-carousel";
import { IconCollar, IconPin, IconShield, IconStethoscope, IconWave } from "@/components/icons";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import { events, metrics, pet, weeklyActivity } from "@/lib/mock";
import { getOrCreateCurrentPet } from "@/lib/pets/current";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

const NFC_PAIRED_COOKIE = "cp_nfc_paired";

export default async function Home() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  const isNfcPaired = jar.get(NFC_PAIRED_COOKIE)?.value === "1";
  let currentUser = null;
  let currentPet = null;
  if (uid) {
    try {
      currentUser = await getOrCreateCurrentUserProfile(uid);
    } catch {
      // Evita tela branca/500 quando ambiente está sem Firebase Admin em produção.
      currentUser = null;
    }
    try {
      currentPet = (await getOrCreateCurrentPet(uid)).pet;
    } catch {
      currentPet = null;
    }
  }
  const isVet = currentUser?.userType === "vet";
  const cardPet = {
    image: currentPet?.image ?? pet.image,
    name: currentPet?.name ?? pet.name,
    breed: currentPet?.breed ?? pet.breed,
    age: currentPet?.age ?? pet.age ?? null,
    wellbeing: pet.wellbeing,
  };

  const maxActivity = Math.max(...weeklyActivity.map((item) => item.activeMinutes));
  const avgActivity = Math.round(
    weeklyActivity.reduce((total, item) => total + item.activeMinutes, 0) / weeklyActivity.length,
  );
  const avgSteps = Math.round(
    weeklyActivity.reduce((total, item) => total + item.steps, 0) / weeklyActivity.length,
  );

  return (
    <AppShell tab="home">
      <TopBar title="Monitoramento em tempo real" subtitle="ColeiraPet">
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
              Pareie agora para liberar dados publicos e contato de emergencia na coleira — leva menos de um minuto.
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
              {weeklyActivity.map((item) => (
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

        <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "300ms" }}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-zinc-900">Localizacao e seguranca</h3>
            <IconShield className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
            <div className="flex items-start gap-2">
              <IconPin className="mt-0.5 h-4.5 w-4.5 text-emerald-700" />
              <div>
                <p className="text-[13px] font-medium text-emerald-800">Av. Paulista, 1000 · Sao Paulo</p>
                <p className="mt-0.5 text-[11px] text-emerald-700">Atualizado ha 2 min · Zona segura ativa</p>
              </div>
            </div>
          </div>
        </section>

        <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "360ms" }}>
          <h3 className="mb-3 text-[14px] font-semibold text-zinc-900">Proximos eventos</h3>
          <div className="space-y-2">
            {events.map((item) => (
              <article key={item.label} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.kind === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <p className="text-[13px] font-medium text-zinc-800">{item.label}</p>
                </div>
                <p className="text-[11px] text-zinc-500">{item.when}</p>
              </article>
            ))}
          </div>
        </section>
    </AppShell>
  );
}
