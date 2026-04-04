import { AppShell, TopBar } from "@/components/shell";
import { IconCalendar, IconFile, IconPill } from "@/components/icons";
import { records, vaccines } from "@/lib/mock";

export default function RecordsPage() {
  return (
    <AppShell tab="records">
      <TopBar title="Registros medicos" subtitle="Historico clinico" />

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Vacinas</h3>
          <IconCalendar className="h-5 w-5 text-zinc-600" />
        </div>
        <div className="space-y-2">
          {vaccines.map((vaccine) => (
            <article key={vaccine.name} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-zinc-800">{vaccine.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${vaccine.state === "Aplicada" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {vaccine.state}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-zinc-500">Data: {vaccine.date}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "140ms" }}>
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

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "200ms" }}>
        <div className="mb-2 flex items-center gap-2">
          <IconPill className="h-5 w-5 text-blue-600" />
          <h3 className="text-[14px] font-semibold text-zinc-900">Lembrete de medicacao</h3>
        </div>
        <p className="text-[12px] text-zinc-600">Suplemento articular as 20:00 · Ultima dose registrada ontem.</p>
      </section>
    </AppShell>
  );
}