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

/** Converte minutos salvos em sequencia de digitos para edicao (ex.: 90 → "130", 45 → "45"). */
function minutesToDigitBuffer(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return String(m);
  if (h < 10) return `${h}${String(m).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`.slice(0, 4);
}

/**
 * Formata digitos (0–4) como H:MM enquanto o usuario digita.
 * Os dois ultimos digitos sao sempre minutos (00–59); o restante sao horas.
 */
function formatDurationDigitBuffer(rawDigits: string): string {
  const d = rawDigits.replace(/\D/g, "").slice(0, 4);
  if (!d) return "";

  if (d.length === 1) {
    return `0:0${d}`;
  }

  if (d.length === 2) {
    const n = Number.parseInt(d, 10);
    if (Number.isNaN(n)) return "";
    if (n <= 59) return `0:${String(n).padStart(2, "0")}`;
    const h = Math.floor(n / 60);
    const m = n % 60;
    const total = h * 60 + m;
    if (total > 1440) return "24:00";
    return `${h}:${String(m).padStart(2, "0")}`;
  }

  const mm = Number.parseInt(d.slice(-2), 10);
  let hh = Number.parseInt(d.slice(0, -2), 10) || 0;
  if (Number.isNaN(mm)) return "0:00";
  if (mm > 59) {
    const n = Number.parseInt(d, 10);
    const total = Math.min(n, 1440);
    hh = Math.floor(total / 60);
    const m = total % 60;
    return `${hh}:${String(m).padStart(2, "0")}`;
  }
  if (hh > 24) hh = 24;
  if (hh === 24 && mm > 0) return "24:00";
  const total = hh * 60 + mm;
  if (total > 1440) return "24:00";
  return `${hh}:${String(mm).padStart(2, "0")}`;
}

function totalMinutesFromDigitBuffer(digits: string): number | null {
  const d = digits.replace(/\D/g, "");
  if (!d) return null;
  const formatted = formatDurationDigitBuffer(d);
  return parseDurationToTotalMinutes(formatted);
}

/** Converte string H:MM canonica para total de minutos (0–1440). */
function parseDurationToTotalMinutes(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const hm = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!hm) return null;
  const h = Number.parseInt(hm[1], 10);
  const m = Number.parseInt(hm[2], 10);
  if (m > 59 || h < 0 || h > 24) return null;
  if (h === 24 && m !== 0) return null;
  const total = h * 60 + m;
  if (total > 1440) return null;
  return total;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toIsoDate(value: Date) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Ultimos 7 dias (incl. hoje), alinhado ao card da Home. */
function buildWeeklyActivityFromEntries(entries: Entry[]) {
  const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"] as const;
  const byDate = new Map<string, number>();
  for (const e of entries) {
    const iso = e.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    byDate.set(iso, (byDate.get(iso) ?? 0) + e.minutes);
  }
  const today = startOfDay(new Date());
  const out: { day: string; isoDate: string; activeMinutes: number }[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const jsDay = date.getDay();
    const label = labels[(jsDay + 6) % 7];
    const isoDate = toIsoDate(date);
    out.push({ day: label, isoDate, activeMinutes: byDate.get(isoDate) ?? 0 });
  }
  return out;
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
  const [durationDigits, setDurationDigits] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const savingRef = useRef(saving);
  useEffect(() => {
    savingRef.current = saving;
  }, [saving]);

  const weeklyActivity = useMemo(() => buildWeeklyActivityFromEntries(entries), [entries]);
  const maxWeeklyMinutes = useMemo(
    () => Math.max(...weeklyActivity.map((item) => item.activeMinutes), 1),
    [weeklyActivity],
  );
  const avgWeeklyMinutes = useMemo(
    () =>
      weeklyActivity.length
        ? Math.round(weeklyActivity.reduce((sum, item) => sum + item.activeMinutes, 0) / weeklyActivity.length)
        : 0,
    [weeklyActivity],
  );

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
    setDurationDigits("");
    setModalOpen(true);
  }

  function openModalEdit(entry: Entry) {
    setModalError(null);
    setEditingId(entry.id);
    setDate(entry.date);
    setDurationDigits(minutesToDigitBuffer(entry.minutes));
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
    const minutesParsed = totalMinutesFromDigitBuffer(durationDigits);
    if (minutesParsed === null) {
      setModalError("Informe o tempo no formato horas:minutos (ex.: 0:30 ou 1:15), ate 24:00.");
      return;
    }
    if (minutesParsed < 0 || minutesParsed > 1440) {
      setModalError("O tempo total nao pode passar de 24 horas (24:00).");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch("/api/pets/activity-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, minutes: minutesParsed }),
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
      data-lyka-shell-span="full"
      className="appear-up mt-3 min-w-0 overflow-x-clip rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
      style={{ animationDelay: "155ms" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold leading-snug text-zinc-900">Atividade Semanal</h3>
          <p className="mt-0.5 text-[12px] text-zinc-500">Media (7 dias): {avgWeeklyMinutes} min/dia</p>
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

      {!loading ? (
        <>
          <div className="mb-3 flex items-center justify-between text-[11px]">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">Minutos ativos por dia</span>
            <span className="text-zinc-500">Meta: 60 min</span>
          </div>
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
            <div className="grid grid-cols-7 items-end gap-2">
              {weeklyActivity.map((item) => (
                <div key={item.isoDate} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-zinc-500">{item.activeMinutes}</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-300"
                    style={{
                      height: `${12 + (item.activeMinutes / maxWeeklyMinutes) * 90}px`,
                      minHeight: "12px",
                    }}
                    title={`${item.activeMinutes} min`}
                  />
                  <span className="text-[10px] font-medium text-zinc-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

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
              className="fixed inset-0 z-[3000] flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-black/40 px-2 py-6 pb-28 sm:px-6"
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
              <section className="relative z-[1] mx-auto min-w-0 w-[min(420px,calc(100vw-1rem))] max-w-[428px] rounded-[26px] border border-zinc-200 bg-white p-3 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] sm:p-4">
                <div className="mb-3 flex items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1 pr-1 sm:pr-2">
                    <h3 id="activity-minutes-modal-title" className="text-[15px] font-semibold leading-snug text-zinc-900">
                      {editingId ? "Atualizar minutos" : "Novo registro"}
                    </h3>
                    <p className="mt-1 break-words text-[12px] leading-snug text-zinc-600">
                      Registre quanto tempo seu pet ficou ativo no dia. No campo tempo use horas e minutos (ex.:{" "}
                      <span className="tabular-nums">0:45</span> ou <span className="tabular-nums">1:30</span>).
                    </p>
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

                <form onSubmit={handleSubmit} className="grid min-w-0 gap-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="shrink-0">
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
                        className="mt-2 box-border h-11 min-h-11 w-[min(100%,11.5rem)] min-w-[10.5rem] max-w-[12rem] rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 text-[13px] text-zinc-900 outline-none transition read-only:opacity-90 focus:border-emerald-400 focus:bg-white sm:px-3"
                      />
                    </div>
                    <div className="min-w-[6.25rem] shrink-0 sm:w-28">
                      <label htmlFor="act-minutes-value" className="text-[12px] font-semibold text-zinc-700">
                        Tempo <span className="font-normal text-zinc-500">(h:mm)</span>
                      </label>
                      <input
                        id="act-minutes-value"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        spellCheck={false}
                        value={formatDurationDigitBuffer(durationDigits)}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                          setDurationDigits(digits);
                        }}
                        placeholder="0:30"
                        className="no-number-spinner mt-2 box-border h-11 min-h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 text-[13px] tabular-nums text-zinc-900 outline-none transition placeholder:text-zinc-400 placeholder:font-normal focus:border-emerald-400 focus:bg-white focus:text-zinc-900 sm:px-3"
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
