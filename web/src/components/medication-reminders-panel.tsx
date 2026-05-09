"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { IconPill } from "@/components/icons";

type ReminderItem = {
  id: string;
  name: string;
  dose: string;
  time: string;
  timeLabel: string;
};

export function MedicationRemindersPanel({ animationDelay = "220ms" }: { animationDelay?: string }) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("");
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/pets/medication-reminders");
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Falha ao carregar lembretes.");
        }
        const payload = (await res.json()) as { reminders?: ReminderItem[] };
        if (active) setReminders(payload.reminders ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Falha ao carregar lembretes.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
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
    setEditingId(null);
    setName("");
    setDose("");
    setTime("");
    setModalOpen(true);
  }

  function openModalEdit(item: ReminderItem) {
    setModalError(null);
    setEditingId(item.id);
    setName(item.name);
    setDose(item.dose);
    setTime(item.time);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalError(null);
    setEditingId(null);
    setName("");
    setDose("");
    setTime("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      const isEdit = Boolean(editingId);
      const res = await fetch("/api/pets/medication-reminders", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingId, name, dose, time } : { name, dose, time }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? (isEdit ? "Falha ao atualizar lembrete." : "Falha ao cadastrar lembrete."));
      }
      const payload = (await res.json()) as { reminder: ReminderItem };
      if (isEdit) {
        setReminders((prev) =>
          prev.map((r) => (r.id === payload.reminder.id ? payload.reminder : r)),
        );
      } else {
        setReminders((prev) => [payload.reminder, ...prev]);
      }
      closeModal();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Falha ao salvar lembrete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 text-[14px] font-semibold leading-snug text-zinc-900">Lembrete de medicacao</h3>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={openModal}
            aria-label="Adicionar lembrete"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/90 bg-zinc-50/80 text-zinc-500 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-800 active:scale-[0.97]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <IconPill className="h-5 w-5 text-zinc-600" aria-hidden />
        </div>
      </div>

      {error ? <p className="mt-1 text-[12px] font-medium text-red-600">{error}</p> : null}

      {loading ? (
        <p className="mt-3 text-[12px] text-zinc-500">Carregando lembretes...</p>
      ) : reminders.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-3 text-[12px] text-zinc-500">
          Nenhum lembrete cadastrado.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {reminders.map((item) => (
            <article key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[12px] font-semibold text-zinc-800">{item.name}</p>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">{item.timeLabel}</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-600">Dose: {item.dose}</p>
              </div>
              <button
                type="button"
                onClick={() => openModalEdit(item)}
                className="shrink-0 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Editar
              </button>
            </article>
          ))}
        </div>
      )}

      {mounted && modalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[3000] flex min-h-[100dvh] items-center justify-center bg-black/40 px-3 py-6 pb-28 sm:px-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="medication-modal-title"
            >
              <button
                type="button"
                aria-label="Fechar"
                className="absolute inset-0 cursor-default"
                onClick={() => !saving && closeModal()}
              />
              <section className="relative z-[1] mx-auto w-[min(420px,calc(100vw-1rem))] max-w-[428px] rounded-[26px] border border-zinc-200 bg-white p-3 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] sm:p-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="absolute right-3 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 sm:right-4 sm:top-4"
                  aria-label="Fechar"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
                <div className="mb-3 min-w-0 pr-11 sm:pr-12">
                  <h3 id="medication-modal-title" className="text-[15px] font-semibold leading-snug text-zinc-900">
                    {editingId ? "Editar lembrete" : "Novo lembrete"}
                  </h3>
                  <p className="mt-1 text-[12px] leading-snug text-zinc-600">
                    {editingId
                      ? "Altere medicacao, dose ou horario e salve."
                      : "Cadastre medicacao, dose e horario do lembrete."}
                  </p>
                </div>

            <form onSubmit={onSubmit} className="grid min-w-0 gap-3">
              <div className="min-w-0">
                <label htmlFor="med-reminder-name" className="text-[12px] font-semibold text-zinc-700">
                  Medicacao
                </label>
                <input
                  id="med-reminder-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome da medicacao"
                  className="mt-2 box-border w-full min-w-0 max-w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                  required
                  minLength={2}
                  maxLength={80}
                  autoFocus={!editingId}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-2">
                <div className="min-w-0">
                  <label htmlFor="med-reminder-dose" className="text-[12px] font-semibold text-zinc-700">
                    Dose
                  </label>
                  <input
                    id="med-reminder-dose"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="Ex.: 1 comprimido"
                    className="mt-2 box-border w-full min-w-0 max-w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                    required
                    minLength={2}
                    maxLength={80}
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="med-reminder-time" className="text-[12px] font-semibold text-zinc-700">
                    Horario
                  </label>
                  <input
                    id="med-reminder-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="mt-2 box-border h-11 min-h-11 w-full min-w-0 max-w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white sm:px-3"
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
                {saving ? "Salvando..." : editingId ? "Salvar alteracoes" : "Salvar lembrete"}
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
