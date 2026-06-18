"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lyka] protected route error", error);
  }, [error]);

  return (
    <main className="ios-safe-top flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-6 py-12 text-center">
      <h1 className="text-[20px] font-semibold text-zinc-900">Nao foi possivel carregar esta tela</h1>
      <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-600">
        Ocorreu um erro ao abrir o app. Tente novamente ou volte para a Home.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-emerald-700"
        >
          Tentar novamente
        </button>
        <Link
          href="/home"
          className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-[14px] font-semibold text-zinc-900 transition hover:bg-zinc-50"
        >
          Ir para Home
        </Link>
      </div>
    </main>
  );
}
