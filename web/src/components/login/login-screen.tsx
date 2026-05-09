"use client";

import Image from "next/image";
import {
  completeEmailLinkSignIn,
  createAccountWithEmailPassword,
  consumeGoogleRedirectResult,
  getEmailForStoredLinkSignIn,
  isEmailLinkSignInUrl,
  sendEmailLinkToSignIn,
  signInWithAppleNativeIdToken,
  signInWithAppleOnWeb,
  signInWithEmailPassword,
  signInWithGoogleNativeIdToken,
  signInWithGoogleOnWeb,
} from "@/lib/firebase/client";
import { LegalContent } from "@/components/legal/legal-content";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GoogleSignInGlyph } from "./brand-sign-in-icons";

function formatAuthErrorMessage(payload: { error?: string; detail?: string } | null): string {
  const error = payload?.error?.trim() ?? "";
  const detail = payload?.detail?.trim() ?? "";
  if (error && detail) return `${error}: ${detail}`;
  if (error) return error;
  if (detail) return detail;
  return "Falha ao concluir login Google.";
}

type IosNativeBridge = {
  startGoogleSignIn: () => void;
  startAppleSignIn: () => void;
};

type NativeGoogleSignInWindow = Window & {
  __lykaGoogleSignInToken?: ((idToken: string) => void) | null;
  __lykaGoogleSignInError?: ((message?: string) => void) | null;
  __lykaAppleSignInToken?: ((idToken: string) => void) | null;
  __lykaAppleSignInError?: ((message?: string) => void) | null;
};

declare global {
  interface Window {
    LykaNativeAuth?: IosNativeBridge;
    __LYKA_IOS_APP__?: boolean;
    __lykaGoogleSignInToken?: ((idToken: string) => void) | null;
    __lykaGoogleSignInError?: ((message?: string) => void) | null;
    __lykaAppleSignInToken?: ((idToken: string) => void) | null;
    __lykaAppleSignInError?: ((message?: string) => void) | null;
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

type LoginAuthBusy = "google" | "apple" | "email-login" | "email-create" | "email-link";

function nativeGoogleSignIn(): Promise<{ idToken: string }> {
  return new Promise((resolve, reject) => {
    const browserWindow = window as NativeGoogleSignInWindow;
    const nativeBridge = browserWindow.LykaNativeAuth;
    if (!nativeBridge?.startGoogleSignIn) {
      reject(new Error("Native handler not available"));
      return;
    }

    const onToken = (idToken: string) => {
      browserWindow.__lykaGoogleSignInToken = null;
      browserWindow.__lykaGoogleSignInError = null;
      resolve({ idToken });
    };

    const onError = (message?: string) => {
      browserWindow.__lykaGoogleSignInToken = null;
      browserWindow.__lykaGoogleSignInError = null;
      reject(new Error(message || "Login cancelado"));
    };

    browserWindow.__lykaGoogleSignInToken = onToken;
    browserWindow.__lykaGoogleSignInError = onError;

    try {
      nativeBridge.startGoogleSignIn();
    } catch (error) {
      browserWindow.__lykaGoogleSignInToken = null;
      browserWindow.__lykaGoogleSignInError = null;
      reject(error instanceof Error ? error : new Error("Falha ao iniciar login Google nativo."));
    }
  });
}

function nativeAppleSignIn(): Promise<{ idToken: string }> {
  return new Promise((resolve, reject) => {
    const browserWindow = window as NativeGoogleSignInWindow;
    const nativeBridge = browserWindow.LykaNativeAuth;
    if (!nativeBridge?.startAppleSignIn) {
      reject(new Error("Native handler not available"));
      return;
    }

    const onToken = (idToken: string) => {
      browserWindow.__lykaAppleSignInToken = null;
      browserWindow.__lykaAppleSignInError = null;
      resolve({ idToken });
    };

    const onError = (message?: string) => {
      browserWindow.__lykaAppleSignInToken = null;
      browserWindow.__lykaAppleSignInError = null;
      reject(new Error(message || "Login cancelado"));
    };

    browserWindow.__lykaAppleSignInToken = onToken;
    browserWindow.__lykaAppleSignInError = onError;

    try {
      nativeBridge.startAppleSignIn();
    } catch (error) {
      browserWindow.__lykaAppleSignInToken = null;
      browserWindow.__lykaAppleSignInError = null;
      reject(error instanceof Error ? error : new Error("Falha ao iniciar login Apple nativo."));
    }
  });
}

export function LoginScreen() {
  const router = useRouter();
  const [authBusy, setAuthBusy] = useState<LoginAuthBusy | null>(null);
  const authInProgress = authBusy !== null;
  const [oauthHint, setOauthHint] = useState<string | null>(null);
  const [legalDocOpen, setLegalDocOpen] = useState<"privacy" | "terms" | null>(null);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;

    async function finishEmailLinkFlow() {
      try {
        if (!isEmailLinkSignInUrl(window.location.href)) return false;
        const knownEmail = getEmailForStoredLinkSignIn();
        const emailForLink = knownEmail || window.prompt("Confirme seu email para entrar com link:")?.trim() || "";
        if (!emailForLink) {
          setOauthHint("Nao foi possivel confirmar o email para o link de acesso.");
          return true;
        }

        setAuthBusy("email-link");
        const idToken = await completeEmailLinkSignIn(emailForLink, window.location.href);
        const res = await fetch("/api/auth/firebase/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, provider: "email" }),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
          setOauthHint(formatAuthErrorMessage(payload));
          setAuthBusy(null);
          return true;
        }
        if (!active) return true;
        router.replace("/home");
        router.refresh();
        return true;
      } catch (error) {
        if (!active) return true;
        setOauthHint(error instanceof Error ? error.message : "Erro ao concluir login por link de email.");
        setAuthBusy(null);
        return true;
      }
    }

    async function finishRedirectFlow() {
      try {
        const consumedEmailLink = await finishEmailLinkFlow();
        if (consumedEmailLink) return;
        const idToken = await consumeGoogleRedirectResult();
        if (!active || !idToken) return;

        setAuthBusy("google");
        const res = await fetch("/api/auth/firebase/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, provider: "google" }),
        });

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
          setOauthHint(formatAuthErrorMessage(payload));
          setAuthBusy(null);
          return;
        }

        router.replace("/home");
        router.refresh();
      } catch (error) {
        if (!active) return;
        setOauthHint(error instanceof Error ? error.message : "Erro ao concluir login Google.");
        setAuthBusy(null);
      }
    }

    finishRedirectFlow();
    return () => {
      active = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- montagem única; incluir `router` pode repetir o efeito em dev (loop de refresh)

  async function enterGoogle() {
    setOauthHint(null);
    setAuthBusy("google");
    try {
      let idToken: string;

      if (window.__LYKA_IOS_APP__ && window.LykaNativeAuth?.startGoogleSignIn) {
        setOauthHint("Abrindo login Google nativo do iOS...");
        const result = await nativeGoogleSignIn();
        idToken = await signInWithGoogleNativeIdToken(result.idToken);
      } else {
        const result = await signInWithGoogleOnWeb();
        if (result.type === "redirect") {
          setOauthHint("Redirecionando para o Google...");
          return;
        }
        idToken = result.idToken;
      }

      const res = await fetch("/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, provider: "google" }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        setOauthHint(formatAuthErrorMessage(payload));
        setAuthBusy(null);
        return;
      }

      router.replace("/home");
      router.refresh();
    } catch (error) {
      setOauthHint(error instanceof Error ? error.message : "Erro ao autenticar com Google.");
      setAuthBusy(null);
    }
  }

  async function enterApple() {
    setOauthHint(null);
    setAuthBusy("apple");
    try {
      let idToken: string;

      if (window.__LYKA_IOS_APP__ && window.LykaNativeAuth?.startAppleSignIn) {
        setOauthHint("Abrindo login Apple nativo do iOS...");
        const result = await nativeAppleSignIn();
        idToken = await signInWithAppleNativeIdToken(result.idToken);
      } else {
        idToken = await signInWithAppleOnWeb();
      }

      const res = await fetch("/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, provider: "apple" }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        setOauthHint(formatAuthErrorMessage(payload));
        setAuthBusy(null);
        return;
      }

      router.replace("/home");
      router.refresh();
    } catch (error) {
      setOauthHint(error instanceof Error ? error.message : "Erro ao autenticar com Apple.");
      setAuthBusy(null);
    }
  }

  async function enterWithEmail(mode: "login" | "create") {
    setOauthHint(null);
    setAuthBusy(mode === "create" ? "email-create" : "email-login");
    try {
      if (!email.trim() || !password.trim()) {
        setOauthHint("Informe email e senha.");
        setAuthBusy(null);
        return;
      }
      if (password.trim().length < 6) {
        setOauthHint("A senha precisa ter pelo menos 6 caracteres.");
        setAuthBusy(null);
        return;
      }

      const idToken =
        mode === "create" ? await createAccountWithEmailPassword(email, password) : await signInWithEmailPassword(email, password);

      const res = await fetch("/api/auth/firebase/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, provider: "email" }),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
        setOauthHint(formatAuthErrorMessage(payload));
        setAuthBusy(null);
        return;
      }

      router.replace("/home");
      router.refresh();
    } catch (error) {
      setOauthHint(error instanceof Error ? error.message : "Erro ao autenticar com email.");
      setAuthBusy(null);
    }
  }

  async function enterWithEmailLink() {
    setOauthHint(null);
    setAuthBusy("email-link");
    try {
      const normalizedEmail = email.trim();
      if (!normalizedEmail) {
        setOauthHint("Informe um email para receber o link de acesso.");
        setAuthBusy(null);
        return;
      }
      await sendEmailLinkToSignIn(normalizedEmail);
      setOauthHint("Link enviado. Verifique seu email para concluir o login.");
      setAuthBusy(null);
    } catch (error) {
      setOauthHint(error instanceof Error ? error.message : "Erro ao enviar link de acesso.");
      setAuthBusy(null);
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
        <header className="glass-card appear-up overflow-hidden rounded-[28px] p-2">
          <div className="relative h-[190px] w-full overflow-hidden rounded-[22px] border border-white/40 bg-zinc-100/80">
            <Image
              src="/login-space-hero.png"
              alt="Dog astronauta Lyka"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 440px"
            />
          </div>
        </header>

        <section
          className="appear-up mt-4 rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
          style={{ animationDelay: "80ms" }}
        >
          {showEmailAuth ? (
            <div className="space-y-2.5">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={authInProgress}
                autoComplete="email"
                placeholder="Email"
                className="h-[52px] w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[14px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:opacity-70"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={authInProgress}
                autoComplete="current-password"
                placeholder="Senha"
                className="h-[52px] w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[14px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:opacity-70"
              />
              <button
                type="button"
                onClick={() => void enterWithEmail("login")}
                disabled={authInProgress}
                className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-black text-[15px] font-semibold text-white transition hover:bg-zinc-900 active:scale-[0.99] disabled:opacity-70"
                aria-label="Entrar com Email"
              >
                {authBusy === "email-login" ? "Entrando..." : "Entrar com Email"}
              </button>
              <button
                type="button"
                onClick={() => void enterWithEmail("create")}
                disabled={authInProgress}
                className="flex h-[52px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white text-[15px] font-semibold text-zinc-800 shadow-sm transition enabled:hover:bg-zinc-50 active:scale-[0.99] disabled:opacity-70"
                aria-label="Criar conta com Email"
              >
                {authBusy === "email-create" ? "Criando conta..." : "Criar conta"}
              </button>
              <button
                type="button"
                onClick={() => void enterWithEmailLink()}
                disabled={authInProgress}
                className="flex h-[52px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-[15px] font-semibold text-zinc-800 transition enabled:hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-70"
                aria-label="Receber link de acesso por email"
              >
                {authBusy === "email-link" ? "Enviando link..." : "Entrar com link por Email"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOauthHint(null);
                  setEmail("");
                  setPassword("");
                  setShowEmailAuth(false);
                }}
                disabled={authInProgress}
                className="mx-auto mt-1 block text-[12px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition enabled:hover:text-zinc-700 disabled:opacity-60"
                aria-label="Voltar para login social"
              >
                Voltar
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => void enterApple()}
                disabled={authInProgress}
                className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-black text-[15px] font-semibold text-white transition hover:bg-zinc-900 active:scale-[0.99] disabled:opacity-70"
                aria-label="Entrar com Apple"
              >
                {authBusy === "apple" ? "Entrando..." : "Entrar com Apple"}
              </button>

              <button
                type="button"
                onClick={() => void enterGoogle()}
                disabled={authInProgress}
                className="flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-200 bg-white text-[15px] font-semibold text-zinc-800 shadow-sm transition enabled:hover:bg-zinc-50 active:scale-[0.99] disabled:opacity-70"
                aria-label="Entrar com Google"
              >
                <GoogleSignInGlyph className="h-[22px] w-[22px] shrink-0" />
                {authBusy === "google" ? "Entrando com Google..." : "Entrar com Google"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOauthHint(null);
                  setShowEmailAuth(true);
                }}
                disabled={authInProgress}
                className="flex h-[52px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-[15px] font-semibold text-zinc-800 transition enabled:hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-70"
                aria-label="Entrar com Email"
              >
                Entrar com Email
              </button>
            </div>
          )}

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

      </div>

      {legalDocOpen ? (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/35 px-3 py-5">
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
          </section>
        </div>
      ) : null}
    </main>
  );
}
