"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppleSignInGlyph, GoogleSignInGlyph } from "./brand-sign-in-icons";

type LoginScreenProps = {
  devBypassEnabled: boolean;
};

export function LoginScreen({ devBypassEnabled }: LoginScreenProps) {
  const router = useRouter();
  const [devBusy, setDevBusy] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [oauthHint, setOauthHint] = useState<string | null>(null);

  async function enterDev() {
    setDevError(null);
    setDevBusy(true);
    try {
      const res = await fetch("/api/auth/dev", { method: "POST" });
      if (!res.ok) {
        setDevError("Acesso dev indisponivel neste ambiente.");
        return;
      }
      router.replace("/");
      router.refresh();
    } finally {
      setDevBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-3 py-10 pb-16 sm:px-6">
      <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
        <header className="glass-card appear-up rounded-[28px] px-5 py-6 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">ColeiraPet</p>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-900">Entrar</h1>
          <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-snug text-zinc-500">
            Acompanhe saude, local e rotinas do seu pet com a coleira conectada.
          </p>
        </header>

        <section
          className="appear-up mt-4 rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
          style={{ animationDelay: "80ms" }}
        >
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setOauthHint("Login com Apple em breve.")}
              className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-black text-[15px] font-semibold text-white transition hover:bg-zinc-900 active:scale-[0.99]"
              aria-label="Entrar com Apple"
            >
              <AppleSignInGlyph className="h-[22px] w-[22px] text-white" />
              Entrar com Apple
            </button>

            <button
              type="button"
              onClick={() => setOauthHint("Login com Google em breve.")}
              className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-200 bg-white text-[15px] font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.99]"
              aria-label="Entrar com Google"
            >
              <GoogleSignInGlyph className="h-[22px] w-[22px]" />
              Entrar com Google
            </button>
          </div>

          {oauthHint ? (
            <p className="mt-3 text-center text-[12px] font-medium text-zinc-600" role="status">
              {oauthHint}
            </p>
          ) : null}
          <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
            Ao continuar, voce concorda com os termos e a politica de privacidade do app.
          </p>
        </section>

        {devBypassEnabled ? (
          <div className="appear-up mt-4" style={{ animationDelay: "140ms" }}>
            <button
              type="button"
              onClick={enterDev}
              disabled={devBusy}
              className="chip flex h-12 w-full items-center justify-center rounded-2xl text-[13px] font-semibold text-zinc-600 transition enabled:hover:bg-zinc-100 disabled:opacity-60"
              aria-label="Acesso desenvolvedor sem login"
            >
              {devBusy ? "Entrando…" : "Acesso dev"}
            </button>
            <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-wide text-amber-700/90">
              Uso temporario — remover antes do lancamento
            </p>
            {devError ? <p className="mt-2 text-center text-[12px] font-medium text-red-600">{devError}</p> : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
