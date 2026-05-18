"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { IconStethoscope } from "@/components/icons";
import type { VaccineItem, VaccineStatus } from "@/lib/vaccines/vaccine-item";

function DetailRow({ label, value }: { label: string; value: string }) {
  const display = value.trim() || "Nao informado";
  const muted = !value.trim();
  return (
    <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-[13px] leading-snug ${muted ? "italic text-zinc-400" : "font-medium text-zinc-900"}`}>{display}</p>
    </div>
  );
}

export function VaccineDetailsModal({
  vaccine,
  open,
  onClose,
  onUpdated,
}: {
  vaccine: VaccineItem | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: (v: VaccineItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<VaccineStatus>("pending");
  const [vet, setVet] = useState("");
  const [clinic, setClinic] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!vaccine || !open) return;
    setStatus(vaccine.status);
    setVet(vaccine.veterinarian);
    setClinic(vaccine.clinic);
    setNotes(vaccine.notes);
    setEditing(false);
    setSaveError(null);
  }, [vaccine, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  async function handleSaveDetails() {
    if (!vaccine) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: Record<string, unknown> = {
        id: vaccine.id,
        veterinarian: vet,
        clinic,
        notes,
      };
      if (vaccine.canOwnerEditStatus) {
        payload.status = status;
      }

      const res = await fetch("/api/vaccines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Falha ao salvar.");
      }
      const data = (await res.json()) as { vaccine: VaccineItem };
      onUpdated?.(data.vaccine);
      setEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted || !open || !vaccine) return null;

  const displayStatus = editing && vaccine.canOwnerEditStatus ? status : vaccine.status;
  const dateTitle = displayStatus === "applied" ? "Data da aplicacao" : "Data prevista";

  return createPortal(
    <div
      className="fixed inset-0 z-[3050] flex min-h-[100dvh] justify-center overflow-y-auto bg-black/45 px-3 py-6 pb-28 sm:px-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vaccine-detail-title"
    >
      <button type="button" aria-label="Fechar" className="fixed inset-0 cursor-default" onClick={() => !saving && onClose()} />

      <section className="relative z-[1] my-auto w-[min(420px,calc(100vw-1rem))] max-w-[428px] rounded-[26px] border border-zinc-200 bg-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)] sm:p-0">
        <div className="max-h-[min(90dvh,720px)] overflow-y-auto rounded-[26px] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <IconStethoscope className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Detalhes da vacina</p>
                <h2 id="vaccine-detail-title" className="mt-0.5 text-[17px] font-bold leading-tight text-zinc-900">
                  {vaccine.name}
                </h2>
                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                    displayStatus === "applied" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {displayStatus === "applied" ? "Aplicada" : "Pendente"}
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
              aria-label="Fechar"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            <DetailRow label={dateTitle} value={vaccine.dateLabel} />
            {!editing ? (
              <>
                <DetailRow label="Veterinario(a) / responsavel" value={vaccine.veterinarian} />
                <DetailRow label="Clinica ou estabelecimento" value={vaccine.clinic} />
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Observacoes</p>
                  <p
                    className={`mt-1 text-[13px] leading-relaxed ${vaccine.notes.trim() ? "text-zinc-900" : "italic text-zinc-400"}`}
                  >
                    {vaccine.notes.trim() || "Nao informado"}
                  </p>
                </div>
              </>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <DetailRow label="Registrado em" value={vaccine.createdAtLabel} />
              <DetailRow label="Atualizado em" value={vaccine.updatedAtLabel} />
            </div>
          </div>

          {editing ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
              <p className="text-[12px] font-semibold text-emerald-900">Editar detalhes</p>
              {vaccine.canOwnerEditStatus ? (
                <div>
                  <label htmlFor="vd-status" className="text-[11px] font-semibold text-zinc-600">
                    Status
                  </label>
                  <select
                    id="vd-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as VaccineStatus)}
                    className="mt-1 box-border h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[13px] text-zinc-900 outline-none focus:border-emerald-400"
                  >
                    <option value="pending">Pendente</option>
                    <option value="applied">Aplicada</option>
                  </select>
                </div>
              ) : (
                <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] leading-snug text-amber-900">
                  Esta vacina foi cadastrada pelo veterinario. Apenas o profissional que registrou pode alterar o status.
                </p>
              )}
              <div className="grid min-w-0 gap-2">
                <input
                  id="vd-vet"
                  value={vet}
                  onChange={(e) => setVet(e.target.value)}
                  maxLength={120}
                  placeholder="Veterinario(a)"
                  aria-label="Veterinario(a)"
                  className="box-border w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none focus:border-emerald-400"
                />
                <input
                  id="vd-clinic"
                  value={clinic}
                  onChange={(e) => setClinic(e.target.value)}
                  maxLength={120}
                  placeholder="Clinica ou estabelecimento"
                  aria-label="Clinica ou estabelecimento"
                  className="box-border w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none focus:border-emerald-400"
                />
                <textarea
                  id="vd-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={800}
                  placeholder="Observacoes (lote, etc.)"
                  aria-label="Observacoes"
                  className="box-border w-full min-w-0 resize-none rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none focus:border-emerald-400"
                />
              </div>
              {saveError ? <p className="text-[11px] font-medium text-rose-600">{saveError}</p> : null}
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveDetails()}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:bg-zinc-300"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setStatus(vaccine.status);
                    setVet(vaccine.veterinarian);
                    setClinic(vaccine.clinic);
                    setNotes(vaccine.notes);
                    setSaveError(null);
                  }}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white py-2.5 text-[13px] font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar edicao
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-4 w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 text-[13px] font-semibold text-zinc-800 transition hover:bg-zinc-100"
            >
              Editar detalhes
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl py-2.5 text-[13px] font-semibold text-zinc-500 hover:text-zinc-800"
          >
            Fechar
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
