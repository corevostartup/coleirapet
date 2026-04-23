"use client";

import { consumeGoogleRedirectResult, signInWithGoogleRedirectOnly } from "@/lib/firebase/client";
import { useEffect, useState } from "react";

const CALLBACK_SCHEME = process.env.NEXT_PUBLIC_IOS_AUTH_CALLBACK_SCHEME ?? "coleirapet";

function goNative(path: string) {
  window.location.replace(`${CALLBACK_SCHEME}://auth${path}`);
}

/**
 * Evita disparar o fluxo Google duas vezes (ex.: React Strict Mode em dev),
 * o que causava redirect duplo e loop no seletor de conta.
 */
let iosGoogleAuthStarted = false;

export default function IosGoogleAuthPage() {
  const [status, setStatus] = useState("Abrindo login Google...");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const redirectToken = await consumeGoogleRedirectResult();
        if (cancelled) return;

        if (redirectToken) {
          setStatus("Finalizando autenticacao...");
          goNative(`?firebaseIdToken=${encodeURIComponent(redirectToken)}`);
          return;
        }

        if (iosGoogleAuthStarted) {
          return;
        }
        iosGoogleAuthStarted = true;

        setStatus("Redirecionando para o Google...");
        await signInWithGoogleRedirectOnly();
      } catch (error) {
        iosGoogleAuthStarted = false;
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
