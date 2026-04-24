import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, TopBar } from "@/components/shell";
import { IconCollar, IconShield } from "@/components/icons";
import { pet } from "@/lib/mock";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import { getOrCreateCurrentPet } from "@/lib/pets/current";
import { getPetImageOrDefault } from "@/lib/pets/image";

export default async function TagNfcPage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  let currentPet = null;
  if (uid) {
    try {
      currentPet = (await getOrCreateCurrentPet(uid)).pet;
    } catch {
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
    <AppShell tab="profile">
      <TopBar title="Tag NFC" subtitle="Gerenciamento" />

      <section
        className="appear-up mt-3 rounded-[26px] border border-emerald-200/90 bg-gradient-to-b from-emerald-50 via-white to-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
        style={{ animationDelay: "60ms" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Status da Tag</h3>
          <IconCollar className="h-5 w-5 text-emerald-700" aria-hidden />
        </div>
        <p className="text-[12px] text-zinc-700">Conectada e vinculada ao perfil da Luna.</p>
        <p className="mt-1 text-[11px] text-zinc-500">Ultima leitura: ha 2 minutos.</p>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "100ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Acoes</h3>
          <IconShield className="h-5 w-5 text-emerald-600" aria-hidden />
        </div>
        <div className="space-y-2">
          <Link
            href="/tag-nfc/parear"
            className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-[12px] font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Parear Tag NFC
          </Link>
          <Link
            href="/tag-nfc/testar-leitura"
            className="block w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-[12px] font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Testar leitura
          </Link>
          <button
            type="button"
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-[12px] font-semibold text-zinc-800 transition hover:bg-zinc-100"
          >
            Trocar senha
          </button>
        </div>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "120ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Dados publicos</h3>
          <IconShield className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="mb-3 text-[12px] text-zinc-500">Informacoes visiveis ao escanear a tag NFC.</p>

        <article className="mb-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-2.5">
          <p className="mb-1 text-[11px] uppercase tracking-wide text-zinc-500">Foto</p>
          <div className="relative h-[180px] w-full overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <Image
              src={getPetImageOrDefault(currentPet?.image ?? pet.image)}
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
      </section>
    </AppShell>
  );
}
