"use client";

import { consumeGoogleRedirectResult, signInWithGoogleRedirectOnly } from "@/lib/firebase/client";
import { useEffect, useState } from "react";

const CALLBACK_SCHEME = process.env.NEXT_PUBLIC_IOS_AUTH_CALLBACK_SCHEME ?? "coleirapet";
const IOS_GOOGLE_REDIRECT_MARKER = "cp-ios-google-redirect-started-at";
const IOS_GOOGLE_REDIRECT_TTL_MS = 10 * 60 * 1000;

function goNative(path: string) {
  window.location.replace(`${CALLBACK_SCHEME}://auth${path}`);
}

/**
 * Evita disparar o fluxo Google duas vezes (ex.: React Strict Mode em dev),
 * o que causava redirect duplo e loop no seletor de conta.
 */
let iosGoogleAuthStarted = false;

function markRedirectStarted() {
  try {
    sessionStorage.setItem(IOS_GOOGLE_REDIRECT_MARKER, String(Date.now()));
  } catch {
    // ignore
  }
}

function clearRedirectMarker() {
  try {
    sessionStorage.removeItem(IOS_GOOGLE_REDIRECT_MARKER);
  } catch {
    // ignore
  }
}

function hadPendingRedirectMarker() {
  try {
    const raw = sessionStorage.getItem(IOS_GOOGLE_REDIRECT_MARKER);
    if (!raw) return false;
    const timestamp = Number(raw);
    if (!Number.isFinite(timestamp) || Date.now() - timestamp > IOS_GOOGLE_REDIRECT_TTL_MS) {
      sessionStorage.removeItem(IOS_GOOGLE_REDIRECT_MARKER);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default function IosGoogleAuthPage() {
  const [status, setStatus] = useState("Abrindo login Google...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const hadPendingRedirect = hadPendingRedirectMarker();
        const redirectToken = await consumeGoogleRedirectResult();
        if (cancelled) return;

        if (redirectToken) {
          clearRedirectMarker();
          setStatus("Finalizando autenticacao...");
          goNative(`?firebaseIdToken=${encodeURIComponent(redirectToken)}`);
          return;
        }

        // Se voltou do Google sem token, interrompe para nao relancar redirect infinito.
        if (hadPendingRedirect) {
          clearRedirectMarker();
          iosGoogleAuthStarted = false;
          goNative(`?error=${encodeURIComponent("Falha ao concluir login Google. Tente novamente.")}`);
          return;
        }

        if (iosGoogleAuthStarted) return;

        iosGoogleAuthStarted = true;
        markRedirectStarted();
        setStatus("Redirecionando para o Google...");
        await signInWithGoogleRedirectOnly();
      } catch (error) {
        iosGoogleAuthStarted = false;
        clearRedirectMarker();
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        goNative(`?error=${encodeURIComponent(message)}`);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="ios-safe-top flex min-h-screen items-center justify-center bg-zinc-50 p-4 text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm font-medium text-zinc-700">{status}</p>
      </div>
    </main>
  );
}
