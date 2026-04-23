import { VetShell } from "@/components/vet-shell";

const petsQueue = [
  { name: "Luna", tutor: "Cassio", reason: "Vacina de reforco", status: "Aguardando" },
  { name: "Thor", tutor: "Marina", reason: "Retorno pos-cirurgico", status: "Em triagem" },
  { name: "Nina", tutor: "Paulo", reason: "Dermatite", status: "Pronto para consulta" },
];

export default function VetPetsPage() {
  return (
    <VetShell tab="pets" title="Area medica" subtitle="Veterinario">
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <h3 className="text-[14px] font-semibold text-zinc-900">Pets de hoje</h3>
        <p className="mt-1 text-[12px] text-zinc-500">Fila de atendimento da clinica.</p>
        <div className="mt-3 space-y-2">
          {petsQueue.map((item) => (
            <article key={`${item.name}-${item.tutor}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-zinc-800">{item.name}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{item.status}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-600">Tutor: {item.tutor}</p>
              <p className="mt-1 text-[12px] text-zinc-700">{item.reason}</p>
            </article>
          ))}
        </div>
      </section>
    </VetShell>
  );
}
