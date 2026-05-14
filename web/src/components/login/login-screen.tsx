"use client";

import Image from "next/image";
import {
  registerWithEmailPasswordAndSendVerification,
  sendPasswordResetEmailLyka,
  signInWithAppleNativeIdToken,
  signInWithAppleOnWeb,
  signInWithEmailPassword,
  signInWithGoogleNativeIdToken,
  signInWithGoogleOnWeb,
  consumeGoogleRedirectResult,
} from "@/lib/firebase/client";
import { LegalContent } from "@/components/legal/legal-content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { GoogleSignInGlyph } from "./brand-sign-in-icons";

/** Mesmo visual do botao "Fazer login" (vidro + blur), em tamanho compacto para nav. */
const DESKTOP_GLASS_NAV_BTN =
  "lyka-login-cta inline-flex items-center justify-center rounded-2xl border border-white/40 bg-white/12 px-5 py-2.5 text-[14px] font-semibold !text-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md transition hover:bg-white/20 hover:!text-white active:scale-[0.99] active:!text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:!text-white visited:!text-white";

const LOGIN_DESKTOP_SPOTLIGHT_BG = `radial-gradient(ellipse min(88vw, 120vh) min(100vh, 920px) at var(--login-spot-x, 32%) var(--login-spot-y, 50%), rgba(0,0,0,0) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0.14) 38%, rgba(0,0,0,0.38) 62%, rgba(0,0,0,0.58) 100%)`;

/** Evita duas execucoes paralelas do bootstrap OAuth (Strict Mode e remounts). */
let loginRedirectBootstrapChain: Promise<void> = Promise.resolve();

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

type LoginAuthBusy = "google" | "apple" | "email-login" | "email-create" | "email-forgot";

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

type LoginAuthFormSectionProps = {
  variant: "login" | "signup";
  authBusy: LoginAuthBusy | null;
  authInProgress: boolean;
  oauthHint: string | null;
  showEmailAuth: boolean;
  email: string;
  password: string;
  displayName: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setDisplayName: (value: string) => void;
  isRegisteringEmail: boolean;
  setIsRegisteringEmail: (value: boolean) => void;
  showForgotPassword: boolean;
  setShowForgotPassword: (value: boolean) => void;
  forgotPasswordSuccess: boolean;
  setForgotPasswordSuccess: (value: boolean) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  setShowEmailAuth: (value: boolean) => void;
  setOauthHint: (value: string | null) => void;
  setLegalDocOpen: (value: "privacy" | "terms" | null) => void;
  enterGoogle: () => void;
  enterApple: () => void;
  enterWithEmail: (mode: "login" | "create") => void;
  submitForgotPassword: () => void;
  style?: CSSProperties;
  className?: string;
  hideLegalButtons?: boolean;
};

function LoginAuthFormSection({
  variant,
  authBusy,
  authInProgress,
  oauthHint,
  showEmailAuth,
  email,
  password,
  displayName,
  setEmail,
  setPassword,
  setDisplayName,
  isRegisteringEmail,
  setIsRegisteringEmail,
  showForgotPassword,
  setShowForgotPassword,
  forgotPasswordSuccess,
  setForgotPasswordSuccess,
  showPassword,
  setShowPassword,
  setShowEmailAuth,
  setOauthHint,
  setLegalDocOpen,
  enterGoogle,
  enterApple,
  enterWithEmail,
  submitForgotPassword,
  style,
  className = "",
  hideLegalButtons = false,
}: LoginAuthFormSectionProps) {
  const isSignup = variant === "signup";
  const registering = isSignup || isRegisteringEmail;

  function handleEmailFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (registering) void enterWithEmail("create");
    else void enterWithEmail("login");
  }

  function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitForgotPassword();
  }

  function resetEmailPanel() {
    setOauthHint(null);
    setEmail("");
    setPassword("");
    setDisplayName("");
    setShowForgotPassword(false);
    setForgotPasswordSuccess(false);
    setIsRegisteringEmail(false);
    setShowEmailAuth(false);
  }

  const inputClass =
    "h-[52px] w-full rounded-2xl border border-zinc-200 bg-white px-4 text-[14px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 disabled:opacity-70";

  return (
    <section
      className={`rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)] ${className}`}
      style={style}
    >
      {isSignup ? (
        <h1 className="mb-3 text-center text-[17px] font-semibold leading-snug text-zinc-900">Criar conta na Lyka</h1>
      ) : null}
      {showEmailAuth ? (
        showForgotPassword && !isSignup ? (
          <form className="space-y-2.5" onSubmit={handleForgotSubmit}>
            <h2 className="text-center text-[15px] font-semibold text-zinc-900">Esqueci minha senha</h2>
            {forgotPasswordSuccess ? (
              <>
                <p className="text-center text-[12px] leading-relaxed text-zinc-600">
                  Enviamos um link para <strong className="text-zinc-800">{email}</strong>. Verifique sua caixa de entrada e siga as instrucoes para redefinir
                  sua senha.
                </p>
                <button
                  type="button"
                  className="lyka-login-cta flex h-[52px] w-full items-center justify-center rounded-2xl bg-black text-[15px] font-semibold !text-white"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordSuccess(false);
                    setOauthHint(null);
                  }}
                >
                  Voltar ao login
                </button>
              </>
            ) : (
              <>
                <p className="text-[12px] leading-relaxed text-zinc-600">
                  Informe o e-mail da sua conta. Enviaremos um link para redefinir sua senha.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={authInProgress}
                  autoComplete="email"
                  placeholder="E-mail"
                  className={inputClass}
                />
                {oauthHint ? (
                  <p className="text-center text-[12px] font-medium text-rose-600" role="alert">
                    {oauthHint}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={authInProgress}
                  className="lyka-login-cta flex h-[52px] w-full items-center justify-center rounded-2xl bg-black text-[15px] font-semibold !text-white transition hover:bg-zinc-900 hover:!text-white disabled:opacity-70"
                >
                  {authBusy === "email-forgot" ? "Enviando..." : "Enviar link"}
                </button>
                <button
                  type="button"
                  disabled={authInProgress}
                  className="lyka-login-cta mx-auto mt-1 block w-full text-center text-[13px] font-medium text-emerald-700 underline decoration-emerald-600/35"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setOauthHint(null);
                  }}
                >
                  Voltar ao login
                </button>
              </>
            )}
          </form>
        ) : (
          <form className="space-y-2.5" onSubmit={handleEmailFormSubmit}>
            {registering ? (
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                disabled={authInProgress}
                autoComplete="name"
                placeholder="Nome"
                className={inputClass}
              />
            ) : null}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={authInProgress}
              autoComplete="email"
              placeholder="E-mail"
              className={inputClass}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={authInProgress}
                autoComplete={registering ? "new-password" : "current-password"}
                placeholder="Senha"
                className={`${inputClass} pr-[4.5rem]`}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
                onClick={() => setShowPassword(!showPassword)}
                disabled={authInProgress}
                tabIndex={-1}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <button
              type="submit"
              disabled={authInProgress}
              className="lyka-login-cta flex h-[52px] w-full items-center justify-center rounded-2xl bg-black text-[15px] font-semibold !text-white transition hover:bg-zinc-900 hover:!text-white active:scale-[0.99] active:!text-white focus-visible:!text-white disabled:opacity-70"
            >
              {registering
                ? authBusy === "email-create"
                  ? "Criando conta..."
                  : "Criar conta"
                : authBusy === "email-login"
                  ? "Entrando..."
                  : "Entrar"}
            </button>
            {!isSignup ? (
              registering ? (
                <button
                  type="button"
                  disabled={authInProgress}
                  className="lyka-login-cta w-full text-center text-[13px] font-medium text-emerald-700 underline decoration-emerald-600/35 underline-offset-2"
                  onClick={() => {
                    setIsRegisteringEmail(false);
                    setOauthHint(null);
                  }}
                >
                  Ja tem conta? Entrar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={authInProgress}
                    className="lyka-login-cta w-full text-center text-[13px] font-medium text-emerald-700 underline decoration-emerald-600/35 underline-offset-2"
                    onClick={() => {
                      setIsRegisteringEmail(true);
                      setOauthHint(null);
                    }}
                  >
                    Cadastre-se
                  </button>
                  <button
                    type="button"
                    disabled={authInProgress}
                    className="lyka-login-cta w-full text-center text-[12px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotPasswordSuccess(false);
                      setOauthHint(null);
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </>
              )
            ) : (
              <p className="text-center text-[12px] text-zinc-600">
                <Link href="/login" className="font-semibold text-emerald-700 underline decoration-emerald-600/35 underline-offset-2">
                  Ja tem conta? Entrar
                </Link>
              </p>
            )}
            <button
              type="button"
              onClick={resetEmailPanel}
              disabled={authInProgress}
              className="lyka-login-cta mx-auto mt-1 block rounded-full bg-zinc-800 px-4 py-1.5 text-center text-[12px] font-medium !text-white transition enabled:hover:bg-zinc-700 disabled:opacity-60"
            >
              Voltar
            </button>
          </form>
        )
      ) : (
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => void enterApple()}
            disabled={authInProgress}
            className="lyka-login-cta flex h-[52px] w-full items-center justify-center rounded-2xl bg-black text-[15px] font-semibold !text-white transition hover:bg-zinc-900 hover:!text-white active:scale-[0.99] active:!text-white focus-visible:!text-white disabled:opacity-70"
            aria-label={isSignup ? "Cadastrar com Apple" : "Entrar com Apple"}
          >
            {authBusy === "apple" ? "Abrindo..." : isSignup ? "Cadastrar com Apple" : "Entrar com Apple"}
          </button>

          <button
            type="button"
            onClick={() => void enterGoogle()}
            disabled={authInProgress}
            className="lyka-login-cta flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl border border-zinc-600 bg-zinc-900 text-[15px] font-semibold !text-white shadow-sm transition enabled:hover:bg-zinc-800 enabled:hover:!text-white active:scale-[0.99] active:!text-white focus-visible:!text-white disabled:opacity-70"
            aria-label={isSignup ? "Cadastrar com Google" : "Entrar com Google"}
          >
            <GoogleSignInGlyph className="h-[22px] w-[22px] shrink-0" />
            {authBusy === "google" ? (isSignup ? "Abrindo Google..." : "Entrando com Google...") : isSignup ? "Cadastrar com Google" : "Entrar com Google"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOauthHint(null);
              setShowEmailAuth(true);
              if (isSignup) setIsRegisteringEmail(true);
            }}
            disabled={authInProgress}
            className="lyka-login-cta flex h-[52px] w-full items-center justify-center rounded-2xl border border-zinc-600 bg-zinc-800 text-[15px] font-semibold !text-white transition enabled:hover:bg-zinc-700 enabled:hover:!text-white active:scale-[0.99] active:!text-white focus-visible:!text-white disabled:opacity-70"
            aria-label={isSignup ? "Cadastrar com Email" : "Entrar com Email"}
          >
            {isSignup ? "Cadastrar com Email" : "Entrar com Email"}
          </button>
        </div>
      )}

      {!showEmailAuth || !showForgotPassword ? (
        <p className={`mt-3 text-center text-[12px] font-medium text-zinc-600 ${oauthHint && !showForgotPassword ? "" : "min-h-0"}`} role="status">
          {showForgotPassword ? null : oauthHint}
        </p>
      ) : null}
      <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
        Ao continuar, voce concorda com os termos e a politica de privacidade do app.
      </p>
      {hideLegalButtons ? null : (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setLegalDocOpen("terms")}
            className="lyka-login-cta rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-medium !text-white transition hover:bg-zinc-800 hover:!text-white active:!text-white focus-visible:!text-white"
          >
            Termos de Uso
          </button>
          <span className="text-[11px] text-zinc-300">·</span>
          <button
            type="button"
            onClick={() => setLegalDocOpen("privacy")}
            className="lyka-login-cta rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-medium !text-white transition hover:bg-zinc-800 hover:!text-white active:!text-white focus-visible:!text-white"
          >
            Politica de Privacidade
          </button>
        </div>
      )}
      {!showEmailAuth ? (
        <p className="mt-3 text-center text-[12px] text-zinc-600">
          {isSignup ? (
            <Link href="/login" className="font-semibold text-emerald-700 underline decoration-emerald-600/35 underline-offset-2 hover:text-emerald-800">
              Ja tem conta? Entrar
            </Link>
          ) : (
            <Link href="/criar-conta" className="font-semibold text-emerald-700 underline decoration-emerald-600/35 underline-offset-2 hover:text-emerald-800">
              Novo por aqui? Criar conta
            </Link>
          )}
        </p>
      ) : null}
    </section>
  );
}

export function LoginScreen({ variant = "login" }: { variant?: "login" | "signup" }) {
  const isSignup = variant === "signup";
  const router = useRouter();
  const [authBusy, setAuthBusy] = useState<LoginAuthBusy | null>(null);
  const authInProgress = authBusy !== null;
  const [oauthHint, setOauthHint] = useState<string | null>(null);
  const [legalDocOpen, setLegalDocOpen] = useState<"privacy" | "terms" | null>(null);
  const [showEmailAuth, setShowEmailAuth] = useState(isSignup);
  const [isRegisteringEmail, setIsRegisteringEmail] = useState(isSignup);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [desktopLoginOpen, setDesktopLoginOpen] = useState(isSignup);
  const desktopParallaxZoneRef = useRef<HTMLDivElement>(null);
  const mobileLogoParallaxRef = useRef<HTMLDivElement>(null);
  const desktopLogoParallaxRef = useRef<HTMLDivElement>(null);
  const spotlightOverlayRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const zone = desktopParallaxZoneRef.current;
    const spotlight = spotlightOverlayRef.current;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mq = window.matchMedia("(min-width: 1024px)");
    /** Cursor nos cantos da viewport: deslocamento ~ metade do ecra (sem tectos fixos), para o logo atravessar quase toda a area visivel. */
    const rangeFracX = 0.47;
    const rangeFracY = 0.45;
    /** Quanto maior, mais rapido tende ao alvo; valores menores = flutuacao mais longa com grandes deslocamentos. */
    const followLambda = 3.35;
    const maxZoomExtra = 0.55;

    const pos = { x: 0, y: 0, s: 1 };
    const target = { x: 0, y: 0, s: 1 };
    let rafId = 0;
    let lastTickMs: number | null = null;

    /** Amplitudes do “flutuar” contínuo (gravidade zero), somadas ao parallax do rato. */
    const floatAx = 15;
    const floatAy = 19;
    const floatRot = 0.85;
    const floatScaleAmp = 0.022;

    /** Margem minima ate as bordas da janela (px). */
    const viewPad = 14;

    const clampRectIntoViewport = (rect: DOMRect) => {
      const iw = window.innerWidth;
      const ih = window.innerHeight;
      let dx = 0;
      let dy = 0;
      if (rect.width <= iw - 2 * viewPad) {
        if (rect.left < viewPad) dx = viewPad - rect.left;
        if (rect.right > iw - viewPad) dx += iw - viewPad - rect.right;
      } else {
        dx = (iw - rect.width) / 2 - rect.left;
      }
      if (rect.height <= ih - 2 * viewPad) {
        if (rect.top < viewPad) dy = viewPad - rect.top;
        if (rect.bottom > ih - viewPad) dy += ih - viewPad - rect.bottom;
      } else {
        dy = (ih - rect.height) / 2 - rect.top;
      }
      return { dx, dy };
    };

    const tick = (now: number) => {
      const isDesktop = mq.matches;
      const desktopEl = desktopLogoParallaxRef.current;
      const mobileEl = mobileLogoParallaxRef.current;

      const tSec = now * 0.001;
      const fx =
        floatAx * (0.55 * Math.sin(tSec * 0.95 + 0.42) + 0.45 * Math.sin(tSec * 1.58 + 1.74));
      const fy =
        floatAy * (0.52 * Math.cos(tSec * 0.86 + 1.08) + 0.48 * Math.sin(tSec * 1.33 + 0.21));
      const rotDeg =
        floatRot * (0.6 * Math.sin(tSec * 0.64 + 0.48) + 0.4 * Math.sin(tSec * 1.12 + 2.05));
      const scaleFloat =
        1 + floatScaleAmp * (0.65 * Math.sin(tSec * 1.03 + 0.28) + 0.35 * Math.sin(tSec * 1.87 + 1.35));

      if (isDesktop) {
        mobileEl?.style && (mobileEl.style.transform = "");
        const el = desktopEl;
        if (!el) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        el.style.transformOrigin = "center center";

        if (!reduceMotion.matches) {
          if (lastTickMs === null) lastTickMs = now;
          const dt = Math.min(0.05, Math.max(0, (now - lastTickMs) / 1000));
          lastTickMs = now;
          const follow = 1 - Math.exp(-followLambda * dt);
          pos.x += (target.x - pos.x) * follow;
          pos.y += (target.y - pos.y) * follow;
          pos.s += (target.s - pos.s) * follow;

          const sc = pos.s * scaleFloat;
          let tx = pos.x + fx;
          let ty = pos.y + fy;
          el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rotDeg}deg) scale(${sc})`;
          const { dx, dy } = clampRectIntoViewport(el.getBoundingClientRect());
          if (dx !== 0 || dy !== 0) {
            tx += dx;
            ty += dy;
            pos.x += dx;
            pos.y += dy;
            el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rotDeg}deg) scale(${sc})`;
          }
        } else {
          lastTickMs = null;
          pos.x = pos.y = target.x = target.y = 0;
          pos.s = target.s = 1;
          el.style.transform = "";
        }

        if (spotlight) {
          const rect = el.getBoundingClientRect();
          const px = ((rect.left + rect.width / 2) / Math.max(window.innerWidth, 1)) * 100;
          const py = ((rect.top + rect.height / 2) / Math.max(window.innerHeight, 1)) * 100;
          spotlight.style.setProperty("--login-spot-x", `${px}%`);
          spotlight.style.setProperty("--login-spot-y", `${py}%`);
        }
      } else {
        lastTickMs = null;
        pos.x = pos.y = target.x = target.y = 0;
        pos.s = target.s = 1;

        desktopEl?.style && (desktopEl.style.transform = "");
        spotlight?.style.removeProperty("--login-spot-x");
        spotlight?.style.removeProperty("--login-spot-y");

        const el = mobileEl;
        if (!el) {
          rafId = requestAnimationFrame(tick);
          return;
        }
        el.style.transformOrigin = "center center";

        if (!reduceMotion.matches) {
          const sc = scaleFloat;
          let tx = fx;
          let ty = fy;
          el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rotDeg}deg) scale(${sc})`;
          const { dx, dy } = clampRectIntoViewport(el.getBoundingClientRect());
          if (dx !== 0 || dy !== 0) {
            tx += dx;
            ty += dy;
            el.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rotDeg}deg) scale(${sc})`;
          }
        } else {
          el.style.transform = "";
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    const onPointerOrMouseMove = (e: PointerEvent | MouseEvent) => {
      if (reduceMotion.matches || !mq.matches) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const rangeX = w * rangeFracX;
      const rangeY = h * rangeFracY;
      const minEdge = Math.min(e.clientX, w - e.clientX, e.clientY, h - e.clientY);
      const halfMin = Math.min(w, h) * 0.5;
      const nearBorder = 1 - Math.min(1, minEdge / Math.max(halfMin, 1));
      target.s = 1 + nearBorder * maxZoomExtra;

      // Cursor da viewport: centro = (0,0), cantos tendem ao maximo da area.
      const nx = (e.clientX / Math.max(w, 1)) * 2 - 1;
      const ny = (e.clientY / Math.max(h, 1)) * 2 - 1;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      target.x = clamp(nx) * rangeX;
      target.y = clamp(ny) * rangeY;
    };

    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      target.s = 1;
    };

    const onMqChange = () => {
      if (!mq.matches) {
        target.x = 0;
        target.y = 0;
        target.s = 1;
      }
    };

    const onMotionChange = () => {
      if (reduceMotion.matches) {
        target.x = 0;
        target.y = 0;
        target.s = 1;
      }
    };

    window.addEventListener("pointermove", onPointerOrMouseMove, { passive: true });
    window.addEventListener("mousemove", onPointerOrMouseMove, { passive: true });
    zone?.addEventListener("pointerleave", onLeave);
    zone?.addEventListener("mouseleave", onLeave);
    mq.addEventListener("change", onMqChange);
    reduceMotion.addEventListener("change", onMotionChange);
    rafId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onPointerOrMouseMove);
      window.removeEventListener("mousemove", onPointerOrMouseMove);
      zone?.removeEventListener("pointerleave", onLeave);
      zone?.removeEventListener("mouseleave", onLeave);
      mq.removeEventListener("change", onMqChange);
      reduceMotion.removeEventListener("change", onMotionChange);
      cancelAnimationFrame(rafId);
      desktopLogoParallaxRef.current?.style && (desktopLogoParallaxRef.current.style.transform = "");
      mobileLogoParallaxRef.current?.style && (mobileLogoParallaxRef.current.style.transform = "");
      spotlight?.style.removeProperty("--login-spot-x");
      spotlight?.style.removeProperty("--login-spot-y");
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function finishRedirectFlow() {
      try {
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
      } catch (error) {
        if (!active) return;
        setOauthHint(error instanceof Error ? error.message : "Erro ao concluir login Google.");
        setAuthBusy(null);
      }
    }

    loginRedirectBootstrapChain = loginRedirectBootstrapChain
      .then(() => finishRedirectFlow())
      .catch(() => {});

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
        setOauthHint("Informe e-mail e senha.");
        setAuthBusy(null);
        return;
      }
      if (mode === "create") {
        const nameRequired = isSignup || isRegisteringEmail;
        if (nameRequired && !displayName.trim()) {
          setOauthHint("Informe nome, e-mail e senha.");
          setAuthBusy(null);
          return;
        }
      }
      if (password.trim().length < 6) {
        setOauthHint("A senha precisa ter pelo menos 6 caracteres.");
        setAuthBusy(null);
        return;
      }

      const idToken =
        mode === "create"
          ? await registerWithEmailPasswordAndSendVerification(displayName, email, password)
          : await signInWithEmailPassword(email, password);

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

      setOauthHint(mode === "create" ? "Conta criada. Verifique seu e-mail para o link de confirmacao." : null);
      router.replace("/home");
    } catch (error) {
      setOauthHint(error instanceof Error ? error.message : "Erro ao autenticar com email.");
      setAuthBusy(null);
    }
  }

  async function submitForgotPassword() {
    setOauthHint(null);
    setAuthBusy("email-forgot");
    try {
      if (!email.trim()) {
        setOauthHint("Informe seu e-mail.");
        setAuthBusy(null);
        return;
      }
      await sendPasswordResetEmailLyka(email);
      setForgotPasswordSuccess(true);
    } catch (error) {
      setOauthHint(error instanceof Error ? error.message : "Nao foi possivel enviar o e-mail de redefinicao.");
    } finally {
      setAuthBusy(null);
    }
  }

  const authSectionProps: LoginAuthFormSectionProps = {
    variant,
    authBusy,
    authInProgress,
    oauthHint,
    showEmailAuth,
    email,
    password,
    displayName,
    setEmail,
    setPassword,
    setDisplayName,
    isRegisteringEmail,
    setIsRegisteringEmail,
    showForgotPassword,
    setShowForgotPassword,
    forgotPasswordSuccess,
    setForgotPasswordSuccess,
    showPassword,
    setShowPassword,
    setShowEmailAuth,
    setOauthHint,
    setLegalDocOpen,
    enterGoogle: () => void enterGoogle(),
    enterApple: () => void enterApple(),
    enterWithEmail: (mode) => void enterWithEmail(mode),
    submitForgotPassword: () => void submitForgotPassword(),
  };

  return (
    <main className="ios-safe-top relative min-h-screen overflow-hidden bg-black lg:min-h-0 lg:overflow-visible">
      <div className="relative flex min-h-screen flex-col overflow-hidden px-3 py-10 pb-16 sm:px-6 lg:hidden">
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

        <div className="relative z-[1] mx-auto flex w-full max-w-[440px] flex-1 flex-col items-center justify-center">
          {/* Mesmo visual da coluna do logo no desktop: anel + coleira flutuante (sem moldura / hero). */}
          <div className="relative flex w-full max-w-full flex-col items-center justify-center overflow-visible py-4 appear-up">
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="splash-orbit-ring aspect-square w-[min(96vw,420px)] max-w-[420px] rounded-full border border-white/[0.06]" />
            </div>

            <div className="relative z-[1] flex w-[min(76vw,280px)] max-w-full flex-col items-center">
              <div ref={mobileLogoParallaxRef} className="w-full will-change-transform">
                <div className="relative aspect-square w-full">
                  <Image
                    src="/coleira-splash-logo.png"
                    alt="Lyka"
                    fill
                    priority
                    className="object-contain drop-shadow-[0_12px_40px_rgba(34,197,94,0.18)]"
                    sizes="280px"
                  />
                </div>
              </div>
            </div>
          </div>

          <LoginAuthFormSection {...authSectionProps} className="appear-up mt-2" style={{ animationDelay: "80ms" }} />
        </div>
      </div>

      <div
        ref={desktopParallaxZoneRef}
        className="hidden min-h-screen lg:fixed lg:inset-0 lg:z-0 lg:flex lg:flex-col lg:isolate"
      >
        <div className="pointer-events-none absolute inset-0 bg-zinc-900">
          <Image
            src="/login-desktop-bg.png"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        </div>
        <div
          ref={spotlightOverlayRef}
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: LOGIN_DESKTOP_SPOTLIGHT_BG }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-l from-black/14 via-transparent to-transparent" aria-hidden />

        <nav
          className="relative z-[10] flex w-full shrink-0 items-center justify-between gap-3 px-6 pb-2 pt-6 sm:px-10"
          aria-label="Navegação principal"
        >
          <button
            type="button"
            className={DESKTOP_GLASS_NAV_BTN}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Lyka
          </button>
          <div className="flex max-w-[72%] flex-wrap items-center justify-end gap-2 sm:max-w-none">
            <Link href="/terms" className={DESKTOP_GLASS_NAV_BTN}>
              Saiba mais
            </Link>
            {isSignup ? (
              <Link href="/login" className={DESKTOP_GLASS_NAV_BTN}>
                Entrar
              </Link>
            ) : (
              <Link href="/criar-conta" className={DESKTOP_GLASS_NAV_BTN}>
                Criar conta
              </Link>
            )}
            <Link href="/privacy" className={DESKTOP_GLASS_NAV_BTN}>
              Privacidade
            </Link>
            <Link href="/terms" className={DESKTOP_GLASS_NAV_BTN}>
              Termos
            </Link>
            <a href="mailto:support@lyka.app" className={DESKTOP_GLASS_NAV_BTN}>
              Contato
            </a>
          </div>
        </nav>

        <div className="relative z-[5] flex min-h-0 w-full flex-1 flex-row items-stretch overflow-visible px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex min-h-0 min-w-0 flex-[2] flex-col items-center justify-center overflow-visible">
            <div className="relative flex w-full max-w-[min(42vw,400px)] flex-col items-center justify-center overflow-visible py-4">
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="splash-orbit-ring aspect-square w-[min(96vw,420px)] max-w-[420px] rounded-full border border-white/[0.06]" />
              </div>

              <div className="relative z-[1] flex w-[min(76vw,280px)] max-w-full flex-col items-center">
                <div ref={desktopLogoParallaxRef} className="w-full will-change-transform">
                  <div className="relative aspect-square w-full">
                    <Image
                      src="/coleira-splash-logo.png"
                      alt="Lyka"
                      fill
                      priority
                      className="object-contain drop-shadow-[0_12px_40px_rgba(34,197,94,0.18)]"
                      sizes="280px"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:pl-4">
            <div
              suppressHydrationWarning
              data-lyka-desktop-login={desktopLoginOpen ? "1" : "0"}
              className="flex w-full flex-col items-end flex-1 data-[lyka-desktop-login=0]:min-h-full data-[lyka-desktop-login=0]:justify-center data-[lyka-desktop-login=1]:min-h-0 data-[lyka-desktop-login=1]:justify-start data-[lyka-desktop-login=1]:py-2 sm:data-[lyka-desktop-login=1]:py-3"
            >
              <div className="w-full max-w-[440px] shrink-0">
                {desktopLoginOpen ? (
                  <div className="appear-up flex flex-col gap-3">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setDesktopLoginOpen(false)}
                        disabled={authInProgress}
                        className="lyka-login-cta rounded-2xl border border-white/35 bg-white/15 px-4 py-2.5 text-[13px] font-semibold !text-white shadow-[0_12px_40px_-18px_rgba(0,0,0,0.65)] backdrop-blur-md transition enabled:hover:bg-white/25 enabled:hover:!text-white active:!text-white focus-visible:!text-white disabled:opacity-60"
                        aria-label={isSignup ? "Recolher cadastro" : "Recolher login"}
                      >
                        {isSignup ? "Recolher cadastro" : "Recolher login"}
                      </button>
                    </div>
                    <LoginAuthFormSection {...authSectionProps} hideLegalButtons />
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDesktopLoginOpen(true)}
                      disabled={authInProgress}
                      className="lyka-login-cta appear-up rounded-2xl border border-white/40 bg-white/12 px-8 py-3.5 text-[15px] font-semibold !text-white shadow-[0_16px_48px_-20px_rgba(0,0,0,0.7)] backdrop-blur-md transition hover:bg-white/20 hover:!text-white active:scale-[0.99] active:!text-white focus-visible:!text-white disabled:opacity-60"
                      aria-label={isSignup ? "Abrir cadastro" : "Fazer login"}
                    >
                      {isSignup ? "Abrir cadastro" : "Fazer login"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
                className="lyka-login-cta rounded-xl bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold !text-white transition hover:bg-zinc-800 hover:!text-white active:!text-white focus-visible:!text-white"
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
