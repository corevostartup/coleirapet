"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCalendar } from "@/components/icons";

type VaccineStatus = "applied" | "pending";

type VaccineItem = {
  id: string;
  name: string;
  status: VaccineStatus;
  stateLabel: "Aplicada" | "Pendente";
  date: string;
  dateLabel: string;
};

type VaccinesResponse = {
  vaccines: VaccineItem[];
};

type CreateVaccineResponse = {
  vaccine: VaccineItem;
};

export function VaccinesPanel({ animationDelay = "80ms" }: { animationDelay?: string }) {
  const [vaccines, setVaccines] = useState<VaccineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<VaccineStatus>("pending");
  const [date, setDate] = useState("");
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadVaccines() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/vaccines", { method: "GET" });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Falha ao carregar vacinas.");
        }

        const payload = (await res.json()) as VaccinesResponse;
        if (!active) return;
        setVaccines(payload.vaccines ?? []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Falha ao carregar vacinas.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadVaccines();
    return () => {
      active = false;
    };
  }, []);

  const appliedVaccines = useMemo(
    () => vaccines.filter((vaccine) => vaccine.status === "applied"),
    [vaccines],
  );
  const pendingVaccines = useMemo(
    () => vaccines.filter((vaccine) => vaccine.status === "pending"),
    [vaccines],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/vaccines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, status, date }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Falha ao cadastrar vacina.");
      }

      const payload = (await res.json()) as CreateVaccineResponse;
      const created = payload.vaccine;
      setVaccines((current) => [created, ...current]);
      setName("");
      setStatus("pending");
      setDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cadastrar vacina.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
      style={{ animationDelay }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-zinc-900">Vacinas</h3>
        <IconCalendar className="h-5 w-5 text-zinc-600" />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Cadastrar vacina</p>
          <button
            type="button"
            onClick={() => setIsFormExpanded((value) => !value)}
            className="chip rounded-xl px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-100"
            aria-expanded={isFormExpanded}
          >
            {isFormExpanded ? "Recolher" : "Expandir"}
          </button>
        </div>

        {isFormExpanded ? (
          <form onSubmit={handleSubmit} className="mt-2">
            <div className="grid gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nome da vacina"
                className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] text-zinc-800 outline-none ring-emerald-200 transition focus:ring"
                required
                minLength={2}
                maxLength={80}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as VaccineStatus)}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] text-zinc-800 outline-none ring-emerald-200 transition focus:ring"
                >
                  <option value="pending">Pendente</option>
                  <option value="applied">Aplicada</option>
                </select>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] text-zinc-800 outline-none ring-emerald-200 transition focus:ring"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-2 h-10 w-full rounded-xl bg-emerald-600 text-[13px] font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Adicionar vacina"}
            </button>
          </form>
        ) : null}
      </section>

      {error ? <p className="mt-2 text-[12px] font-medium text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-3 text-[12px] text-zinc-500">Carregando vacinas...</p>
      ) : (
        <div className="mt-3 grid gap-3">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Pendentes</p>
            <div className="space-y-2">
              {pendingVaccines.length ? (
                pendingVaccines.map((vaccine) => <VaccineCard key={vaccine.id} vaccine={vaccine} />)
              ) : (
                <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] text-zinc-500">
                  Nenhuma vacina pendente cadastrada.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">Aplicadas</p>
            <div className="space-y-2">
              {appliedVaccines.length ? (
                appliedVaccines.map((vaccine) => <VaccineCard key={vaccine.id} vaccine={vaccine} />)
              ) : (
                <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[11px] text-zinc-500">
                  Nenhuma vacina aplicada cadastrada.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function VaccineCard({ vaccine }: { vaccine: VaccineItem }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium text-zinc-800">{vaccine.name}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            vaccine.status === "applied" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {vaccine.stateLabel}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-zinc-500">Data: {vaccine.dateLabel}</p>
    </article>
  );
}
