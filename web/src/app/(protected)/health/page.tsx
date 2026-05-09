import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, TopBar } from "@/components/shell";
import { HealthActivityMinutesPanel } from "@/components/health-activity-minutes-panel";
import { HealthWeightPanel } from "@/components/health-weight-panel";
import { IconHeart, IconMoon, IconTemp, IconWave } from "@/components/icons";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import { heartTrend, metrics, pet } from "@/lib/mock";
import { getOrCreateCurrentPet, type PetProfile } from "@/lib/pets/current";
import { getPetImageOrDefault } from "@/lib/pets/image";

export default async function HealthPage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  let currentPet: PetProfile | null = null;
  if (uid) {
    try {
      currentPet = (await getOrCreateCurrentPet(uid)).pet;
    } catch {
      currentPet = null;
    }
  }
  const petName =
    typeof currentPet?.name === "string" && currentPet.name.trim().length > 0
      ? currentPet.name.trim()
      : pet.name;
  const petImageSrc = getPetImageOrDefault(currentPet?.image ?? pet.image);

  const maxBpm = Math.max(...heartTrend.map((item) => item.bpm));
  const avgBpm = Math.round(heartTrend.reduce((sum, item) => sum + item.bpm, 0) / heartTrend.length);
  const minBpm = Math.min(...heartTrend.map((item) => item.bpm));
  const bpmRange = Math.max(maxBpm - minBpm, 1);

  return (
    <AppShell tab="health">
      <TopBar
        title={`Saude de ${petName}`}
        subtitle="Dados em tempo real"
        action={
          <Link
            href="/profile"
            className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100"
            aria-label="Perfil do pet"
          >
            <Image src={petImageSrc} alt={`Foto de ${petName}`} fill className="object-cover" sizes="44px" />
          </Link>
        }
      />

      <section className="appear-up mt-3 grid grid-cols-4 gap-2" style={{ animationDelay: "80ms" }}>
        {metrics.map((item) => (
          <article key={item.label} className="elev-card rounded-xl p-2">
            <p className="truncate text-[9px] uppercase tracking-wide text-zinc-500">{item.label}</p>
            <p className="mt-1.5 text-[15px] font-semibold leading-none text-zinc-900">
              {item.value}
              <span className="ml-1 text-[9px] font-medium text-zinc-500">{item.unit}</span>
            </p>
            <p className={`mt-1 truncate text-[9px] font-medium ${item.tone}`}>{item.status}</p>
          </article>
        ))}
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "140ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Tendencia cardiaca</h3>
          <IconWave className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-xl bg-zinc-50 px-2.5 py-2 text-center">
            <p className="text-zinc-500">Media</p>
            <p className="font-semibold text-zinc-800">{avgBpm} bpm</p>
          </div>
          <div className="rounded-xl bg-zinc-50 px-2.5 py-2 text-center">
            <p className="text-zinc-500">Pico</p>
            <p className="font-semibold text-zinc-800">{maxBpm} bpm</p>
          </div>
          <div className="rounded-xl bg-zinc-50 px-2.5 py-2 text-center">
            <p className="text-zinc-500">Repouso</p>
            <p className="font-semibold text-zinc-800">{minBpm} bpm</p>
          </div>
        </div>
        <div className="flex h-24 items-end gap-1.5">
          {heartTrend.map((item) => (
            <div key={item.time} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-full bg-gradient-to-t from-emerald-500 to-emerald-300"
                style={{
                  height: `${16 + ((item.bpm - minBpm) / bpmRange) * 84}%`,
                  minHeight: 8,
                }}
              />
              <span className="text-[10px] text-zinc-400">{item.time}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">Leitura por horario (24h) · faixa esperada para repouso e atividade leve</p>
      </section>

      <section className="appear-up mt-3 rounded-[26px] border border-zinc-200 bg-white p-3 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "170ms" }}>
        <div className="grid grid-cols-2 gap-2.5">
          <article>
            <div className="relative h-[150px] overflow-hidden rounded-2xl border border-zinc-200">
              <Image
                src="/img/coleira.png"
                alt="Dispositivo inteligente Lyka"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 220px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
              <div className="absolute bottom-2 left-2 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                Lyka ativa
              </div>
            </div>
          </article>

          <article>
            <div className="relative h-[150px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
              <Image
                src="/img/esteira.png"
                alt="Esteira"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 220px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
              <div className="absolute bottom-2 left-2 rounded-full border border-white/30 bg-white/20 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
                Esteira Ativa
              </div>
            </div>
          </article>
        </div>
      </section>

      <HealthActivityMinutesPanel />

      <HealthWeightPanel />

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "200ms" }}>
        <h3 className="mb-3 text-[14px] font-semibold text-zinc-900">Resumo clinico</h3>
        <div className="space-y-2.5">
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center gap-2">
              <IconHeart className="h-4.5 w-4.5 text-emerald-600" />
              <p className="text-[12px] font-medium text-zinc-800">Ritmo cardiaco dentro do padrao</p>
            </div>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center gap-2">
              <IconTemp className="h-4.5 w-4.5 text-blue-600" />
              <p className="text-[12px] font-medium text-zinc-800">Temperatura estavel sem variacoes abruptas</p>
            </div>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <div className="flex items-center gap-2">
              <IconMoon className="h-4.5 w-4.5 text-zinc-600" />
              <p className="text-[12px] font-medium text-zinc-800">Sono com qualidade alta nos ultimos 7 dias</p>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}