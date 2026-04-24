import Image from "next/image";
import { notFound } from "next/navigation";
import { PublicNfcLocationShare } from "@/components/public-nfc-location-share";
import { getPublicPetBySlug } from "@/lib/pets/current";
import { getPetImageOrDefault } from "@/lib/pets/image";

type PublicPetPageProps = {
  params: Promise<{ publicSlug: string }>;
};

export default async function PublicPetPage(props: PublicPetPageProps) {
  const { publicSlug } = await props.params;
  const pet = await getPublicPetBySlug(publicSlug);
  if (!pet) notFound();

  const publicDataItems = [
    { label: "Nome", value: pet.name, visible: pet.publicFields.name },
    { label: "Raca", value: pet.breed, visible: pet.publicFields.breed },
    { label: "Cor", value: pet.color ?? "Nao informado", visible: pet.publicFields.color },
    {
      label: "Contato de emergencia",
      value: pet.emergencyContact ?? "Nao informado",
      visible: pet.publicFields.emergencyContact,
    },
    { label: "Microchip", value: pet.microchipId ?? "Nao informado", visible: pet.publicFields.microchipId },
    { label: "Observacoes", value: pet.notes ?? "Nao informado", visible: pet.publicFields.notes },
  ].filter((item) => item.visible && item.value.trim() && item.value !== "Nao informado");

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <section className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
          <div className="relative h-[220px] w-full">
            <Image
              src={getPetImageOrDefault(pet.image)}
              alt={`Foto de ${pet.name}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 420px"
              priority
            />
          </div>
          <div className="p-4">
            <h1 className="text-[22px] font-semibold text-zinc-900">{pet.publicFields.name ? pet.name : "Pet encontrado"}</h1>
            <p className="mt-1 text-[12px] text-zinc-500">Dados públicos deste pet</p>
          </div>
        </section>

        <section className="mt-3 rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
          {publicDataItems.length === 0 ? (
            <p className="text-[12px] text-zinc-500">Nenhum dado publico disponivel para este pet.</p>
          ) : (
            <div className="space-y-2">
              {publicDataItems.map((item) => (
                <article key={item.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">{item.label}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-zinc-800">{item.value}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <PublicNfcLocationShare publicSlug={publicSlug} />
      </div>
    </main>
  );
}
