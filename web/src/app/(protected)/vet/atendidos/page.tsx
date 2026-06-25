"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LykaConfirmDialog } from "@/components/lyka-confirm-dialog";
import { VetShell } from "@/components/vet-shell";

type AppointmentStatus = "Aguardando" | "Em atendimento" | "Finalizado";
type Appointment = {
  id: string;
  petName: string;
  petId: string;
  petIdentity: string;
  tutorName: string;
  summary: string;
  chiefComplaint: string;
  symptoms: string;
  symptomDuration: string;
  urgency: string;
  temperature: string;
  additionalNotes: string;
  when: string;
  whenLabel: string;
  finishedAt: string | null;
  status: AppointmentStatus;
};

function nextStatus(current: AppointmentStatus): AppointmentStatus {
  if (current === "Aguardando") return "Em atendimento";
  if (current === "Em atendimento") return "Finalizado";
  return "Finalizado";
}

function advanceButtonLabel(status: AppointmentStatus) {
  if (status === "Aguardando") return "Iniciar atendimento";
  if (status === "Em atendimento") return "Finalizar atendimento";
  return "Finalizado";
}

function statusTone(status: AppointmentStatus) {
  if (status === "Aguardando") return "bg-amber-100 text-amber-800";
  if (status === "Em atendimento") return "bg-sky-100 text-sky-800";
  return "bg-emerald-100 text-emerald-800";
}

function urgencyTone(urgency: string) {
  if (urgency === "Emergencia") return "bg-rose-100 text-rose-800";
  if (urgency === "Urgente") return "bg-orange-100 text-orange-800";
  if (urgency === "Moderada") return "bg-amber-100 text-amber-800";
  return "bg-zinc-100 text-zinc-700";
}

function matchesAppointmentSearch(item: Appointment, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.petName.toLowerCase().includes(q) ||
    item.tutorName.toLowerCase().includes(q) ||
    item.petIdentity.toLowerCase().includes(q) ||
    item.petId.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q) ||
    item.chiefComplaint.toLowerCase().includes(q)
  );
}

function formatFinishedWhen(item: Appointment) {
  if (!item.finishedAt) return item.when;
  const date = new Date(item.finishedAt);
  if (Number.isNaN(date.getTime())) return item.when;
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  if (sameDay) return `Hoje ${time}`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function VetAtendidosPage() {
  const [mounted, setMounted] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueFilter, setQueueFilter] = useState<"all" | "Aguardando" | "Em atendimento">("all");
  const [search, setSearch] = useState("");
  const [finalizedSearch, setFinalizedSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    status: AppointmentStatus;
    petName: string;
  } | null>(null);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vet/appointments", { credentials: "include", cache: "no-store" });
      const data = (await response.json()) as { error?: string; detail?: string; appointments?: Appointment[] };
      if (!response.ok) throw new Error(data.detail ?? data.error ?? "Falha ao carregar atendimentos.");
      setAppointments(data.appointments ?? []);
    } catch (err) {
      setAppointments([]);
      setError(err instanceof Error ? err.message : "Falha ao carregar atendimentos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadAppointments();
  }, [mounted, loadAppointments]);

  const metrics = useMemo(() => {
    const waiting = appointments.filter((item) => item.status === "Aguardando").length;
    const inProgress = appointments.filter((item) => item.status === "Em atendimento").length;
    const done = appointments.filter((item) => item.status === "Finalizado").length;
    return { waiting, inProgress, done };
  }, [appointments]);

  const queueAppointments = useMemo(() => {
    return appointments.filter((item) => {
      if (item.status === "Finalizado") return false;
      if (queueFilter !== "all" && item.status !== queueFilter) return false;
      return matchesAppointmentSearch(item, search);
    });
  }, [appointments, queueFilter, search]);

  const finalizedAppointments = useMemo(() => {
    return appointments.filter((item) => item.status === "Finalizado" && matchesAppointmentSearch(item, finalizedSearch));
  }, [appointments, finalizedSearch]);

  const confirmCopy = useMemo(() => {
    if (!confirmTarget) return null;
    const next = nextStatus(confirmTarget.status);
    if (next === "Em atendimento") {
      return {
        title: "Iniciar atendimento?",
        description: `${confirmTarget.petName} sera aberto no prontuario para registro clinico.`,
        confirmLabel: "Iniciar atendimento",
        confirmTone: "emerald" as const,
      };
    }
    return {
      title: "Finalizar atendimento?",
      description: `Encerrar o atendimento de ${confirmTarget.petName} e liberar a fila.`,
      confirmLabel: "Finalizar",
      confirmTone: "default" as const,
    };
  }, [confirmTarget]);

  function requestAdvanceAppointment(appointmentId: string, currentStatus: AppointmentStatus, petName: string) {
    if (currentStatus === "Finalizado") return;
    setConfirmTarget({ id: appointmentId, status: currentStatus, petName });
  }

  async function confirmAdvanceAppointment() {
    if (!confirmTarget) return;

    const appointmentId = confirmTarget.id;
    setConfirmTarget(null);
    setAdvancingId(appointmentId);
    setError(null);
    try {
      const response = await fetch("/api/vet/appointments", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointmentId }),
      });
      const data = (await response.json()) as {
        error?: string;
        detail?: string;
        appointment?: Appointment;
      };
      if (!response.ok || !data.appointment) {
        throw new Error(data.detail ?? data.error ?? "Falha ao atualizar atendimento.");
      }

      setAppointments((prev) => prev.map((item) => (item.id === appointmentId ? data.appointment! : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar atendimento.");
    } finally {
      setAdvancingId(null);
    }
  }

  return (
    <VetShell title="Atendimentos" subtitle="Area medica">
      <LykaConfirmDialog
        open={Boolean(confirmTarget && confirmCopy)}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description ?? ""}
        confirmLabel={confirmCopy?.confirmLabel}
        confirmTone={confirmCopy?.confirmTone}
        busy={Boolean(advancingId)}
        dialogId="vet-advance-appointment-dialog-title"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => void confirmAdvanceAppointment()}
      />

      <section
        className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-zinc-900">Gestao de atendimentos</h3>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            Fila ativa
          </span>
        </div>
        <p className="mt-1 text-[12px] text-zinc-500">
          Pets triados entram em aguardando. Inicie o atendimento para abrir o prontuario e finalize ao concluir.
        </p>

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
            placeholder="Buscar na fila por pet, tutor, ID ou queixa"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <select
            value={queueFilter}
            onChange={(event) => setQueueFilter(event.target.value as "all" | "Aguardando" | "Em atendimento")}
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">Fila: todos os ativos</option>
            <option value="Aguardando">Aguardando</option>
            <option value="Em atendimento">Em atendimento</option>
          </select>
        </div>

        {error ? <p className="mt-2 text-[12px] font-medium text-rose-700">{error}</p> : null}

        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-[12px] text-zinc-500">
              Carregando atendimentos...
            </p>
          ) : null}

          {!loading
            ? queueAppointments.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-zinc-800">
                        {item.petName} · {item.tutorName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        {item.id.slice(0, 8).toUpperCase()} · {item.petIdentity}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyTone(item.urgency)}`}>
                        {item.urgency}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <p className="mt-1.5 text-[12px] font-medium text-zinc-800">{item.chiefComplaint}</p>
                  {item.symptoms ? <p className="mt-1 text-[11px] text-zinc-600">Sintomas: {item.symptoms}</p> : null}
                  {item.symptomDuration ? (
                    <p className="mt-0.5 text-[11px] text-zinc-500">Duracao: {item.symptomDuration}</p>
                  ) : null}
                  {item.temperature ? (
                    <p className="mt-0.5 text-[11px] text-zinc-500">Temperatura: {item.temperature}</p>
                  ) : null}
                  {item.additionalNotes ? (
                    <p className="mt-1 text-[11px] text-zinc-600">Obs.: {item.additionalNotes}</p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] text-zinc-500">Triagem: {item.when}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.status === "Em atendimento" ? (
                        <Link
                          href="/vet/prontuario"
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-100"
                        >
                          Abrir prontuario
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => requestAdvanceAppointment(item.id, item.status, item.petName)}
                        disabled={advancingId === item.id}
                        className="rounded-xl border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {advancingId === item.id ? "..." : advanceButtonLabel(item.status)}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            : null}

          {!loading && queueAppointments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-[12px] text-zinc-500">
              Nenhum atendimento na fila. Registre uma triagem para adicionar pets.
            </p>
          ) : null}
        </div>
      </section>

      <section
        className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
        style={{ animationDelay: "120ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-zinc-900">Atendimentos finalizados</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
            {metrics.done} registro{metrics.done === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-zinc-500">Historico de atendimentos ja encerrados.</p>

        <div className="mt-3">
          <input
            type="text"
            value={finalizedSearch}
            onChange={(event) => setFinalizedSearch(event.target.value)}
            placeholder="Buscar no historico"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200">
          {loading ? (
            <p className="px-3 py-4 text-center text-[12px] text-zinc-500">Carregando historico...</p>
          ) : finalizedAppointments.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-zinc-500">Nenhum atendimento finalizado encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2.5 font-semibold">Pet</th>
                    <th className="px-3 py-2.5 font-semibold">Tutor</th>
                    <th className="px-3 py-2.5 font-semibold">Queixa</th>
                    <th className="px-3 py-2.5 font-semibold">Urgencia</th>
                    <th className="px-3 py-2.5 font-semibold">Triagem</th>
                    <th className="px-3 py-2.5 font-semibold">Finalizado</th>
                  </tr>
                </thead>
                <tbody>
                  {finalizedAppointments.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 bg-white last:border-b-0">
                      <td className="px-3 py-2.5 align-top">
                        <p className="font-semibold text-zinc-800">{item.petName}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-500">{item.petIdentity}</p>
                      </td>
                      <td className="px-3 py-2.5 align-top text-zinc-700">{item.tutorName}</td>
                      <td className="max-w-[180px] px-3 py-2.5 align-top">
                        <p className="line-clamp-2 text-zinc-700">{item.chiefComplaint}</p>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgencyTone(item.urgency)}`}>
                          {item.urgency}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top text-zinc-600">{item.when}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-top text-zinc-600">{formatFinishedWhen(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </VetShell>
  );
}
