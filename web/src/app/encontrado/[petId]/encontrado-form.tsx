"use client";

import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function EncontradoForm({ petId }: { petId: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") ?? "";

  const [message, setMessage] = useState("");
  const [senderLabel, setSenderLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const invalidLink = !token.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (invalidLink || busy) return;
    setHint(null);
    setBusy(true);
    try {
      const res = await fetch("/api/public/finder-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId,
          token: token.trim(),
          message: message.trim(),
          ...(senderLabel.trim() ? { senderLabel: senderLabel.trim() } : {}),
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setHint(payload?.error ?? "Nao foi possivel enviar. Tente de novo.");
        return;
      }
      setDone(true);
      setMessage("");
      setSenderLabel("");
    } catch {
      setHint("Erro de rede. Verifique sua conexao.");
    } finally {
      setBusy(false);
    }
  }

  if (invalidLink) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Link incompleto</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Use o mesmo link gravado na tag NFC do animal (com o codigo de seguranca no final).
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-zinc-900">Mensagem enviada</h1>
        <p className="mt-2 text-sm text-zinc-600">O tutor sera avisado no aplicativo. Obrigado por ajudar.</p>
        <button
          type="button"
          className="mt-6 text-sm font-medium text-emerald-700 underline decoration-emerald-700/40 underline-offset-4"
          onClick={() => setDone(false)}
        >
          Enviar outra mensagem
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-semibold text-zinc-900">Encontrou um pet?</h1>
      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
        Deixe uma mensagem para o tutor — ela aparece na tela de localizacao no app. Se puder, diga onde esta o animal e como
        contatar voce.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Sua mensagem</span>
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={600}
            className="mt-1.5 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-500/0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/25"
            placeholder="Ex.: Estou com o cachorro na esquina da Rua X, posso ficar ate as 18h..."
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Como podem falar com voce? (opcional)</span>
          <input
            type="text"
            value={senderLabel}
            onChange={(e) => setSenderLabel(e.target.value)}
            maxLength={80}
            className="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none ring-emerald-500/0 transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/25"
            placeholder="Nome ou telefone"
          />
        </label>

        {hint ? <p className="text-sm text-rose-600">{hint}</p> : null}

        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Enviando..." : "Enviar mensagem"}
        </button>
      </form>
    </div>
  );
}
