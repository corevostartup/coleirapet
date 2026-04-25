"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [status, setStatus] = useState<VaccineStatus>("pending");
  const [date, setDate] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  function openModal() {
    setModalError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalError(null);
    setName("");
    setStatus("pending");
    setDate("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setModalError(null);

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
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Falha ao cadastrar vacina.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
      style={{ animationDelay }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold leading-snug text-zinc-900">Vacinas</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={openModal}
            aria-label="Adicionar vacina"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/90 bg-zinc-50/80 text-zinc-500 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-800 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <IconCalendar className="h-5 w-5 text-zinc-600" aria-hidden />
        </div>
      </div>

      {error ? <p className="mt-1 text-[12px] font-medium text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-3 text-[12px] text-zinc-500">Carregando vacinas...</p>
      ) : vaccines.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-3 text-[12px] text-zinc-500">
          Nenhuma vacina cadastrada.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {vaccines.map((vaccine) => (
            <VaccineCard key={vaccine.id} vaccine={vaccine} />
          ))}
        </div>
      )}

      {mounted && modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[3000] flex min-h-[100dvh] items-center justify-center bg-black/40 px-3 py-6 pb-28 sm:px-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vaccine-modal-title"
            >
              <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 cursor-default"
                onClick={() => !saving && closeModal()}
              />
              <section className="relative z-[1] mx-auto w-[min(420px,calc(100vw-1.5rem))] max-w-[428px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 id="vaccine-modal-title" className="text-[15px] font-semibold text-zinc-900">
                      Nova vacina
                    </h3>
                    <p className="mt-1 text-[12px] text-zinc-600">Cadastre nome, status e data da vacina.</p>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
                    aria-label="Fechar"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-3">
                  <div>
                    <label htmlFor="vaccine-name" className="text-[12px] font-semibold text-zinc-700">
                      Nome da vacina
                    </label>
                    <input
                      id="vaccine-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Nome da vacina"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                      required
                      minLength={2}
                      maxLength={80}
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="vaccine-status" className="text-[12px] font-semibold text-zinc-700">
                        Status
                      </label>
                      <select
                        id="vaccine-status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as VaccineStatus)}
                        className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                      >
                        <option value="pending">Pendente</option>
                        <option value="applied">Aplicada</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="vaccine-date" className="text-[12px] font-semibold text-zinc-700">
                        Data
                      </label>
                      <input
                        id="vaccine-date"
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  {modalError ? <p className="text-[11px] font-medium text-rose-600">{modalError}</p> : null}

                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-1 w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {saving ? "Salvando..." : "Salvar vacina"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </form>
              </section>
            </div>,
            document.body,
          )
        : null}
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
