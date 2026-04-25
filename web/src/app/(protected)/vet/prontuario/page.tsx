import { VetShell } from "@/components/vet-shell";

const records = [
  { pet: "Luna", note: "Sem sinais de dor, apetite normal.", when: "Hoje 09:20" },
  { pet: "Thor", note: "Troca de curativo realizada.", when: "Ontem 17:05" },
  { pet: "Nina", note: "Prescrito anti-inflamatorio por 5 dias.", when: "Ontem 11:42" },
];

export default function VetProntuarioPage() {
  return (
    <VetShell title="Prontuario" subtitle="Area medica">
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <h3 className="text-[14px] font-semibold text-zinc-900">Ultimos registros clinicos</h3>
        <div className="mt-3 space-y-2">
          {records.map((item) => (
            <article key={`${item.pet}-${item.when}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-zinc-800">{item.pet}</p>
                <p className="text-[10px] text-zinc-500">{item.when}</p>
              </div>
              <p className="mt-1 text-[12px] text-zinc-700">{item.note}</p>
            </article>
          ))}
        </div>
      </section>
    </VetShell>
  );
}
