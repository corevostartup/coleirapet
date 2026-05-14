"use client";

import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  getLykaFirebaseApp,
  sendSignupVerificationEmailAgain,
  signOutFirebaseClient,
} from "@/lib/firebase/client";

function isPasswordEmailUser(user: User | null): boolean {
  if (!user) return false;
  return user.providerData.some((p) => p.providerId === "password");
}

export function EmailVerificationGate() {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth(getLykaFirebaseApp());
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && isPasswordEmailUser(user) && !user.emailVerified) {
        setBlocked(true);
        setEmail(user.email ?? null);
      } else {
        setBlocked(false);
        setEmail(null);
      }
    });
    return () => unsub();
  }, []);

  const handleResend = useCallback(async () => {
    setError(null);
    setResending(true);
    try {
      await sendSignupVerificationEmailAgain();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao reenviar.");
    } finally {
      setResending(false);
    }
  }, []);

  const handleChecked = useCallback(async () => {
    setError(null);
    setChecking(true);
    try {
      const auth = getAuth(getLykaFirebaseApp());
      await auth.currentUser?.reload();
      const u = auth.currentUser;
      if (u?.emailVerified) {
        setBlocked(false);
        router.refresh();
      } else {
        setError("E-mail ainda nao verificado. Verifique sua caixa de entrada e clique no link.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao verificar.");
    } finally {
      setChecking(false);
    }
  }, [router]);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOutFirebaseClient();
    } catch {
      /* continua para login */
    }
    router.replace("/login");
    router.refresh();
  }, [router]);

  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 px-3 py-8">
      <div
        role="dialog"
        aria-labelledby="lyka-email-verify-title"
        className="w-full max-w-[400px] rounded-[26px] border border-zinc-200 bg-white p-5 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]"
      >
        <h2 id="lyka-email-verify-title" className="text-center text-[18px] font-semibold leading-snug text-zinc-900">
          Verifique seu e-mail
        </h2>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-zinc-600">
          Enviamos um link de confirmacao para <strong className="text-zinc-800">{email ?? "seu e-mail"}</strong>. Clique no link
          para ativar sua conta.
        </p>
        <p className="mt-2 text-center text-[12px] text-zinc-500">Verifique tambem a pasta de spam.</p>
        {error ? (
          <p className="mt-3 text-center text-[12px] font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={resending || checking}
            onClick={() => void handleResend()}
            className="flex h-[48px] w-full items-center justify-center rounded-2xl bg-emerald-600 text-[14px] font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-60"
          >
            {resending ? "Enviando..." : "Reenviar e-mail"}
          </button>
          <button
            type="button"
            disabled={resending || checking}
            onClick={() => void handleChecked()}
            className="flex h-[48px] w-full items-center justify-center rounded-2xl border border-zinc-300 bg-white text-[14px] font-semibold text-zinc-900 transition enabled:hover:bg-zinc-50 disabled:opacity-60"
          >
            {checking ? "Verificando..." : "Ja verifiquei"}
          </button>
          <button
            type="button"
            disabled={resending || checking}
            onClick={() => void handleSignOut()}
            className="text-center text-[13px] font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2 enabled:hover:text-zinc-700 disabled:opacity-60"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
