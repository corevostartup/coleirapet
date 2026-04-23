import { VetShell } from "@/components/vet-shell";

const attendedPets = [
  { pet: "Bob", tutor: "Renata", diagnosis: "Otite externa", when: "12/04" },
  { pet: "Maya", tutor: "Felipe", diagnosis: "Consulta preventiva", when: "10/04" },
  { pet: "Zeus", tutor: "Adriana", diagnosis: "Controle de peso", when: "08/04" },
];

export default function VetAtendidosPage() {
  return (
    <VetShell tab="atendidos" title="Pets atendidos" subtitle="Historico medico">
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <h3 className="text-[14px] font-semibold text-zinc-900">Atendimentos recentes</h3>
        <p className="mt-1 text-[12px] text-zinc-500">Resumo dos ultimos casos finalizados.</p>
        <div className="mt-3 space-y-2">
          {attendedPets.map((item) => (
            <article key={`${item.pet}-${item.when}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[12px] font-semibold text-zinc-800">
                {item.pet} · {item.tutor}
              </p>
              <p className="mt-1 text-[12px] text-zinc-700">{item.diagnosis}</p>
              <p className="mt-0.5 text-[10px] text-zinc-500">{item.when}</p>
            </article>
          ))}
        </div>
      </section>
    </VetShell>
  );
}
