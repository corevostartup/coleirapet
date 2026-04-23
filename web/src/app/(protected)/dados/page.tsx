import { cookies } from "next/headers";
import { AppShell, TopBar } from "@/components/shell";
import { VaccinesPanel } from "@/components/vaccines-panel";
import { IconFile, IconPill, IconShield } from "@/components/icons";
import { publicData, records } from "@/lib/mock";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

export default async function DadosPage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  const currentPet = uid ? (await getOrCreateCurrentPet(uid)).pet : null;
  const publicDataItems = publicData.map((item) => {
    if (item.type === "Nome") {
      return { ...item, detail: currentPet?.name ?? item.detail };
    }
    if (item.type === "Contato de emergencia") {
      return { ...item, detail: currentPet?.emergencyContact ?? item.detail };
    }
    return item;
  });

  return (
    <AppShell tab="dados">
      <TopBar title="Registros medicos" subtitle="Historico clinico" />

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Dados publicos</h3>
          <IconShield className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="mb-3 text-[12px] text-zinc-500">Informacoes visiveis ao escanear a coleira.</p>
        <div className="space-y-2">
          {publicDataItems.map((item) => (
            <article key={item.type} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">{item.type}</p>
              <p className="mt-0.5 text-[12px] font-medium text-zinc-800">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <VaccinesPanel animationDelay="120ms" />

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "160ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Prontuario simplificado</h3>
          <IconFile className="h-5 w-5 text-zinc-600" />
        </div>
        <div className="space-y-2">
          {records.map((item) => (
            <article key={item.type} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">{item.type}</p>
              <p className="mt-0.5 text-[12px] font-medium text-zinc-800">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "220ms" }}>
        <div className="mb-2 flex items-center gap-2">
          <IconPill className="h-5 w-5 text-blue-600" />
          <h3 className="text-[14px] font-semibold text-zinc-900">Lembrete de medicacao</h3>
        </div>
        <p className="text-[12px] text-zinc-600">Suplemento articular as 20:00 · Ultima dose registrada ontem.</p>
      </section>
    </AppShell>
  );
}