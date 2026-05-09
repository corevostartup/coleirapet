 "use client";

import { useMemo, useState } from "react";
import { VetShell } from "@/components/vet-shell";

type AppointmentStatus = "Aguardando" | "Em atendimento" | "Finalizado";
type Appointment = {
  id: string;
  pet: string;
  petId: string;
  tutor: string;
  diagnosis: string;
  when: string;
  status: AppointmentStatus;
};

const initialAppointments: Appointment[] = [
  { id: "ATD-01", pet: "Bob", petId: "PET-2001", tutor: "Renata", diagnosis: "Otite externa", when: "12/04 14:20", status: "Finalizado" },
  { id: "ATD-02", pet: "Maya", petId: "PET-2002", tutor: "Felipe", diagnosis: "Consulta preventiva", when: "Hoje 10:30", status: "Aguardando" },
  { id: "ATD-03", pet: "Zeus", petId: "PET-2003", tutor: "Adriana", diagnosis: "Controle de peso", when: "Hoje 09:40", status: "Em atendimento" },
  { id: "ATD-04", pet: "Luna", petId: "PET-1001", tutor: "Cassio", diagnosis: "Vacina de reforco", when: "Hoje 11:10", status: "Aguardando" },
];

function nextStatus(current: AppointmentStatus): AppointmentStatus {
  if (current === "Aguardando") return "Em atendimento";
  if (current === "Em atendimento") return "Finalizado";
  return "Finalizado";
}

function statusTone(status: AppointmentStatus) {
  if (status === "Aguardando") return "bg-amber-100 text-amber-800";
  if (status === "Em atendimento") return "bg-sky-100 text-sky-800";
  return "bg-emerald-100 text-emerald-800";
}

export default function VetAtendidosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [search, setSearch] = useState("");

  const metrics = useMemo(() => {
    const waiting = appointments.filter((item) => item.status === "Aguardando").length;
    const inProgress = appointments.filter((item) => item.status === "Em atendimento").length;
    const done = appointments.filter((item) => item.status === "Finalizado").length;
    return { waiting, inProgress, done };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return appointments.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.pet.toLowerCase().includes(q) ||
        item.tutor.toLowerCase().includes(q) ||
        item.petId.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [appointments, search, statusFilter]);

  function advanceAppointment(appointmentId: string) {
    setAppointments((prev) =>
      prev.map((item) =>
        item.id === appointmentId
          ? {
              ...item,
              status: nextStatus(item.status),
            }
          : item,
      ),
    );
  }

  return (
    <VetShell title="Pets atendidos" subtitle="Historico medico">
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-zinc-900">Gestao de atendimentos</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">Mock</span>
        </div>
        <p className="mt-1 text-[12px] text-zinc-500">Controle da fila: aguardando, em atendimento e finalizado.</p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Aguardando</p>
            <p className="mt-1 text-[16px] font-semibold text-zinc-900">{metrics.waiting}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Em atendimento</p>
            <p className="mt-1 text-[16px] font-semibold text-zinc-900">{metrics.inProgress}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Finalizados</p>
            <p className="mt-1 text-[16px] font-semibold text-zinc-900">{metrics.done}</p>
          </article>
        </div>

        <div className="mt-3 grid gap-2">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por pet, tutor, pet ID ou atendimento"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | AppointmentStatus)}
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">Todos os status</option>
            <option value="Aguardando">Aguardando</option>
            <option value="Em atendimento">Em atendimento</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </div>

        <div className="mt-3 space-y-2">
          {filteredAppointments.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[12px] font-semibold text-zinc-800">
                {item.pet} · {item.tutor}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {item.id} · {item.petId}
              </p>
              <p className="mt-1 text-[12px] text-zinc-700">{item.diagnosis}</p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <p className="text-[10px] text-zinc-500">{item.when}</p>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(item.status)}`}>{item.status}</span>
                  <button
                    type="button"
                    onClick={() => advanceAppointment(item.id)}
                    disabled={item.status === "Finalizado"}
                    className="rounded-xl border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Avancar status
                  </button>
                </div>
              </div>
            </article>
          ))}
          {filteredAppointments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-[12px] text-zinc-500">
              Nenhum atendimento encontrado.
            </p>
          ) : null}
        </div>
      </section>
    </VetShell>
  );
}
