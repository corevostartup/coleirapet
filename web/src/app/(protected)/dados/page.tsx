import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, TopBar } from "@/components/shell";
import { VaccinesPanel } from "@/components/vaccines-panel";
import { IconFile, IconPill, IconShield } from "@/components/icons";
import { pet, records } from "@/lib/mock";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

export default async function DadosPage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  let currentPet = null;
  if (uid) {
    try {
      currentPet = (await getOrCreateCurrentPet(uid)).pet;
    } catch {
      // Fallback para mock quando backend (Admin/Firestore) estiver indisponível.
      currentPet = null;
    }
  }
  const publicFields = currentPet?.publicFields ?? {
    name: true,
    breed: false,
    color: false,
    emergencyContact: true,
    microchipId: false,
    notes: false,
  };

  const publicDataItems = [
    { type: "Nome", detail: currentPet?.name ?? pet.name, visible: publicFields.name },
    { type: "Raca", detail: currentPet?.breed ?? pet.breed, visible: publicFields.breed },
    { type: "Cor", detail: currentPet?.color ?? "Nao informado", visible: publicFields.color },
    {
      type: "Contato de emergencia",
      detail: currentPet?.emergencyContact ?? "(11) 98888-1234",
      visible: publicFields.emergencyContact,
    },
    { type: "Microchip", detail: currentPet?.microchipId ?? "Nao informado", visible: publicFields.microchipId },
    { type: "Observacoes", detail: currentPet?.notes ?? "Nao informado", visible: publicFields.notes },
  ].filter((item) => item.visible && item.detail.trim() && item.detail !== "Nao informado");

  return (
    <AppShell tab="dados">
      <TopBar title="Registros medicos" subtitle="Historico clinico" />

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <IconShield className="h-5 w-5 text-emerald-600" />
              <h3 className="text-[14px] font-semibold text-zinc-900">Dados publicos</h3>
            </div>
            <span className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700">Expandir</span>
          </summary>

          <div className="mt-3">
            <p className="mb-3 text-[12px] text-zinc-500">Informacoes visiveis ao escanear a tag NFC.</p>

            <article className="mb-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">Foto</p>
              <div className="relative h-[180px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <Image
                  src={currentPet?.image ?? pet.image}
                  alt={`Foto de ${currentPet?.name ?? pet.name}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 440px"
                />
              </div>
            </article>

            <div className="space-y-2">
              {publicDataItems.map((item) => (
                <article key={item.type} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">{item.type}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-zinc-800">{item.detail}</p>
                </article>
              ))}
              {publicDataItems.length === 0 ? (
                <article className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4">
                  <p className="text-[12px] text-zinc-500">Nenhum campo adicional publico no momento.</p>
                </article>
              ) : null}
            </div>
            <Link
              href="/profile"
              className="mt-3 inline-flex rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Gerenciar dados publicos no perfil
            </Link>
          </div>
        </details>
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