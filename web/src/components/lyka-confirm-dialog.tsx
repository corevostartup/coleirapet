"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type LykaConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  confirmTone?: "emerald" | "default" | "danger";
  dialogId?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const confirmToneClass: Record<NonNullable<LykaConfirmDialogProps["confirmTone"]>, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800 enabled:hover:bg-emerald-100",
  default: "border-zinc-200 bg-zinc-900 text-white enabled:hover:bg-zinc-800",
  danger: "border-red-200 bg-red-50 text-red-800 enabled:hover:bg-red-100",
};

export function LykaConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy = false,
  confirmTone = "emerald",
  dialogId = "lyka-confirm-dialog-title",
  onConfirm,
  onCancel,
}: LykaConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/35 px-4 py-6"
      role="presentation"
      onClick={() => !busy && onCancel()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogId}
        className="w-full max-w-[400px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p id={dialogId} className="text-center text-[15px] font-semibold leading-snug text-zinc-900">
          {title}
        </p>
        <p className="mt-2 text-center text-[12px] leading-relaxed text-zinc-600">{description}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-2xl border border-zinc-200 bg-white py-3 text-[13px] font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-2xl border py-3 text-[13px] font-semibold transition disabled:opacity-60 ${confirmToneClass[confirmTone]}`}
          >
            {busy ? "Aguarde..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
