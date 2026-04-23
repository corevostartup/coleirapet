"use client";

import { consumeGoogleRedirectResult, signInWithGoogleOnWeb } from "@/lib/firebase/client";
import { LegalContent } from "@/components/legal/legal-content";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleSignInGlyph } from "./brand-sign-in-icons";

type LoginScreenProps = {
  devBypassEnabled: boolean;
};

type IosNativeBridge = {
  startGoogleSignIn: () => void;
};

declare global {
  interface Window {
    ColeiraPetNativeAuth?: IosNativeBridge;
    __COLEIRAPET_IOS_APP__?: boolean;
  }
}

const LOGIN_BG_STARS = [
  { t: 7, l: 11, d: 0.1, s: 2 },
  { t: 13, l: 80, d: 0.5, s: 1 },
  { t: 21, l: 44, d: 0.85, s: 1 },
  { t: 29, l: 92, d: 0.2, s: 2 },
  { t: 36, l: 24, d: 1.15, s: 1 },
  { t: 43, l: 68, d: 0.05, s: 2 },
  { t: 51, l: 9, d: 1.35, s: 1 },
  { t: 57, l: 89, d: 0.55, s: 2 },
  { t: 64, l: 34, d: 0.95, s: 1 },
  { t: 72, l: 62, d: 0.3, s: 1 },
  { t: 79, l: 15, d: 1.55, s: 2 },
  { t: 86, l: 73, d: 0.4, s: 1 },
  { t: 10, l: 57, d: 1.2, s: 1 },
  { t: 33, l: 96, d: 0.7, s: 1 },
  { t: 46, l: 3, d: 1.45, s: 2 },
  { t: 69, l: 84, d: 1.0, s: 1 },
] as const;

export function LoginScreen({ devBypassEnabled }: LoginScreenProps) {
  const router = useRouter();
  const [devBusy, setDevBusy] = useState(false);
  const [devError, setDevError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [oauthHint, setOauthHint] = useState<string | null>(null);
  const [legalDocOpen, setLegalDocOpen] = useState<"privacy" | "terms" | null>(null);

  useEffect(() => {
    let active = true;

    async function finishRedirectFlow() {
      try {
        const idToken = await consumeGoogleRedirectResult();
        if (!active || !idToken) return;

        setGoogleBusy(true);
        const res = await fetch("/api/auth/firebase/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, provider: "google" }),
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          setOauthHint(payload?.error ?? "Falha ao concluir login Google.");
          setGoogleBusy(false);
          return;
        }

        router.replace("/home");
        router.refresh();
      } catch (error) {
        if (!active) return;
        setOauthHint(error instanceof Error ? error.message : "Erro ao concluir login Google.");
        setGoogleBusy(false);
      }
    }

    finishRedirectFlow();
    return () => {
      active = false;
    };
  }, [router]);

  async function enterDev() {
    setDevError(null);
    setDevBusy(true);
    try {
      const res = await fetch("/api/auth/dev", { method: "POST" });
      if (!res.ok) {
        setDevError("Acesso dev indisponivel neste ambiente.");
        return;
      }
      router.replace("/home");
      router.refresh();
    } finally {
      setDevBusy(false);
    }
  }

  async function enterGoogle() {
    setOauthHint(null);

    if (window.__COLEIRAPET_IOS_APP__ && window.ColeiraPetNativeAuth?.startGoogleSignIn) {
      setGoogleBusy(true);
      setOauthHint("Abrindo login Google nativo do iOS...");
      window.ColeiraPetNativeAuth.startGoogleSignIn();
      return;
    }

    setGoogleBusy(true);
    try {
      const result = await signInWithGoogleOnWeb();
      if (result.type === "redirect") {
        setOauthHint("Redirecionando para o Google...");
        return;
      }

      const res = await fetch("/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: result.idToken, provider: "google" }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        setOauthHint(payload?.error ?? "Falha ao concluir login Google.");
        setGoogleBusy(false);
        return;
      }

      router.replace("/home");
      router.refresh();
    } catch (error) {
      setOauthHint(error instanceof Error ? error.message : "Erro ao autenticar com Google.");
      setGoogleBusy(false);
    }
  }

  return (
    <main className="ios-safe-top relative flex min-h-screen flex-col overflow-hidden bg-black px-3 py-10 pb-16 sm:px-6">
      <div className="splash-nebula pointer-events-none absolute inset-[-20%] opacity-70" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {LOGIN_BG_STARS.map((star, index) => (
          <span
            key={index}
            className="splash-star absolute rounded-full bg-white"
            style={{
              top: `${star.t}%`,
              left: `${star.l}%`,
              width: star.s,
              height: star.s,
              animationDelay: `${star.d}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center">
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
              className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-black text-[15px] font-semibold text-white transition hover:bg-zinc-900 active:scale-[0.99]"
              aria-label="Entrar com Apple"
            >
              Entrar com Apple
            </button>

            <button
              type="button"
              onClick={enterGoogle}
              disabled={googleBusy}
              className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-200 bg-white text-[15px] font-semibold text-zinc-800 shadow-sm transition enabled:hover:bg-zinc-50 active:scale-[0.99] disabled:opacity-70"
              aria-label="Entrar com Google"
            >
              <GoogleSignInGlyph className="h-[22px] w-[22px] shrink-0" />
              {googleBusy ? "Entrando com Google..." : "Entrar com Google"}
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
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setLegalDocOpen("terms")}
              className="text-[11px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-3 transition hover:text-zinc-700"
            >
              Termos de Uso
            </button>
            <span className="text-[11px] text-zinc-300">·</span>
            <button
              type="button"
              onClick={() => setLegalDocOpen("privacy")}
              className="text-[11px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-3 transition hover:text-zinc-700"
            >
              Politica de Privacidade
            </button>
          </div>
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
              {devBusy ? "Entrando..." : "Acesso dev"}
            </button>
            <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-wide text-amber-700/90">
              Uso temporario - remover antes do lancamento
            </p>
            {devError ? <p className="mt-2 text-center text-[12px] font-medium text-red-600">{devError}</p> : null}
          </div>
        ) : null}
      </div>

      {legalDocOpen ? (
        <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/35 px-3 py-5 sm:items-center">
          <section className="w-full max-w-[520px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-zinc-900">
                {legalDocOpen === "terms" ? "Termos de Uso" : "Politica de Privacidade"}
              </h2>
              <button
                type="button"
                onClick={() => setLegalDocOpen(null)}
                className="rounded-xl bg-zinc-100 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-200"
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[62vh] overflow-y-auto pr-1">
              <LegalContent type={legalDocOpen} />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalDocOpen(null)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Voltar para login
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
