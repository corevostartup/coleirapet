"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const CONFIRM_TOKEN = "EXCLUIR";

export function DeleteAccountButton() {
  const router = useRouter();
  const [confirmInput, setConfirmInput] = useState("");
  const [showFloatingConfirm, setShowFloatingConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canDelete = useMemo(() => confirmInput.trim().toUpperCase() === CONFIRM_TOKEN, [confirmInput]);

  async function handleDelete() {
    if (!canDelete || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/users/current", {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Nao foi possivel excluir sua conta agora.");
      }
      setDone(true);
      setShowFloatingConfirm(false);
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado ao excluir conta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/80 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
          Danger
        </span>
        <span className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
          Area sensivel
        </span>
      </div>
      <p className="mt-2 text-[12px] font-semibold text-red-900">Excluir conta</p>
      <p className="mt-1 text-[11px] leading-snug text-red-700/90">
        Esta acao e permanente. Seus dados de perfil e pets vinculados serao removidos da plataforma.
      </p>

      <label className="mt-3 block text-[11px] text-red-800">
        Digite <span className="font-semibold">{CONFIRM_TOKEN}</span> para confirmar
      </label>
      <input
        type="text"
        value={confirmInput}
        onChange={(event) => setConfirmInput(event.target.value)}
        disabled={busy || done}
        autoComplete="off"
        className="mt-1.5 w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-red-400 focus:ring-2 focus:ring-red-200 disabled:opacity-60"
        placeholder="EXCLUIR"
      />

      <button
        type="button"
        onClick={() => setShowFloatingConfirm(true)}
        disabled={!canDelete || busy || done}
        className="mt-3 w-full rounded-xl border border-red-300 bg-red-600 py-2.5 text-[13px] font-semibold text-white transition enabled:hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {busy ? "Excluindo conta..." : done ? "Conta excluida" : "Excluir definitivamente"}
      </button>

      {error ? <p className="mt-2 text-[11px] text-red-700">{error}</p> : null}

      {showFloatingConfirm ? (
        <div className="fixed inset-0 z-[12000] flex items-end justify-center bg-black/35 px-4 pb-8 pt-10 sm:items-center sm:pb-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-4 shadow-2xl">
            <p className="text-[13px] font-semibold text-zinc-900">Confirmar exclusao definitiva</p>
            <p className="mt-1.5 text-[12px] leading-snug text-zinc-600">
              Esta acao nao pode ser desfeita. Tem certeza que deseja excluir sua conta e todos os dados vinculados?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowFloatingConfirm(false)}
                disabled={busy}
                className="rounded-xl border border-zinc-300 bg-white py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-xl border border-red-300 bg-red-600 py-2 text-[12px] font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? "Excluindo..." : "Confirmar exclusao"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
