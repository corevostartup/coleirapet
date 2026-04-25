"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconWave } from "@/components/icons";

type Entry = {
  id: string;
  date: string;
  dateLabel: string;
  minutes: number;
};

function todayIso() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function HealthActivityMinutesPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [minutes, setMinutes] = useState<number>(30);
  const [editingId, setEditingId] = useState<string | null>(null);
  const savingRef = useRef(saving);
  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  const avgMinutes = useMemo(() => {
    if (!entries.length) return 0;
    return Math.round(entries.reduce((sum, item) => sum + item.minutes, 0) / entries.length);
  }, [entries]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/pets/activity-minutes");
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Falha ao carregar minutos ativos.");
        }
        const data = (await res.json()) as { entries?: Entry[] };
        if (!cancelled) setEntries(data.entries ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Falha ao carregar minutos ativos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
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
      if (e.key === "Escape" && !savingRef.current) closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  function openModalNew() {
    setModalError(null);
    setEditingId(null);
    setDate(todayIso());
    setMinutes(30);
    setModalOpen(true);
  }

  function openModalEdit(entry: Entry) {
    setModalError(null);
    setEditingId(entry.id);
    setDate(entry.date);
    setMinutes(entry.minutes);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalError(null);
    setEditingId(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) return;
    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch("/api/pets/activity-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, minutes }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; entry?: Entry }
        | null;
      if (!res.ok) throw new Error(payload?.error ?? "Falha ao salvar minutos ativos.");
      const entry = payload?.entry;
      if (entry) {
        setEntries((prev) => {
          const filtered = prev.filter((item) => item.id !== entry.id);
          return [entry, ...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
        });
      }
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Falha ao salvar minutos ativos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
      style={{ animationDelay: "155ms" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-snug text-zinc-900">Minutos ativos por dia</h3>
          <p className="mt-0.5 text-[12px] text-zinc-500">Media: {avgMinutes} min/dia</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={openModalNew}
            aria-label="Adicionar registro de minutos"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/90 bg-zinc-50/80 text-zinc-500 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-800 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <IconWave className="h-5 w-5 text-zinc-600" aria-hidden />
        </div>
      </div>

      {error ? <p className="mt-1 text-[12px] font-medium text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-3 text-[12px] text-zinc-500">Carregando registros...</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-3 text-[12px] text-zinc-500">
          Nenhum registro ainda. Toque em + para adicionar.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {entries.slice(0, 7).map((item) => (
            <ActivityMinutesCard
              key={item.id}
              item={item}
              onEdit={() => openModalEdit(item)}
            />
          ))}
        </div>
      )}

      {mounted && modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[3000] flex min-h-[100dvh] items-center justify-center bg-black/40 px-3 py-6 pb-28 sm:px-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-minutes-modal-title"
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
                    <h3 id="activity-minutes-modal-title" className="text-[15px] font-semibold text-zinc-900">
                      {editingId ? "Atualizar minutos" : "Novo registro"}
                    </h3>
                    <p className="mt-1 text-[12px] text-zinc-600">Registre quantos minutos seu pet se manteve ativo no dia.</p>
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
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="act-minutes-date" className="text-[12px] font-semibold text-zinc-700">
                        Data
                      </label>
                      <input
                        id="act-minutes-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        readOnly={Boolean(editingId)}
                        required
                        className="mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-[13px] text-zinc-900 outline-none transition read-only:opacity-90 focus:border-emerald-400 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="act-minutes-value" className="text-[12px] font-semibold text-zinc-700">
                        Minutos
                      </label>
                      <input
                        id="act-minutes-value"
                        type="number"
                        min={0}
                        max={1440}
                        step={1}
                        value={minutes}
                        onChange={(e) => setMinutes(Number(e.target.value))}
                        className="no-number-spinner mt-2 h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white"
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
                    {saving ? "Salvando..." : "Salvar minutos"}
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

function ActivityMinutesCard({ item, onEdit }: { item: Entry; onEdit: () => void }) {
  return (
    <article className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-zinc-800">{item.dateLabel}</p>
        <p className="mt-0.5 text-[12px] font-semibold text-zinc-900">{item.minutes} min</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
      >
        Editar
      </button>
    </article>
  );
}
