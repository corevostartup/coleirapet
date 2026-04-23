import { VetShell } from "@/components/vet-shell";

const clinics = [
  { name: "Clinica Pet Vida", address: "Av. Brasil, 1210", distance: "1.2 km" },
  { name: "Hospital Vet Central", address: "Rua Augusta, 880", distance: "2.4 km" },
  { name: "Pronto Vet 24h", address: "Al. Santos, 300", distance: "3.1 km" },
];

export default function VetClinicasPage() {
  return (
    <VetShell tab="clinicas" title="Clinicas" subtitle="Rede parceira">
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <h3 className="text-[14px] font-semibold text-zinc-900">Clinicas proximas</h3>
        <div className="mt-3 space-y-2">
          {clinics.map((item) => (
            <article key={item.name} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-zinc-800">{item.name}</p>
                <p className="text-[10px] text-zinc-500">{item.distance}</p>
              </div>
              <p className="mt-1 text-[12px] text-zinc-700">{item.address}</p>
            </article>
          ))}
        </div>
      </section>
    </VetShell>
  );
}
