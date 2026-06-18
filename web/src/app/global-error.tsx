"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lyka] global error", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh items-center justify-center bg-zinc-950 px-6 text-center text-white">
        <div>
          <h1 className="text-[20px] font-semibold">Erro inesperado</h1>
          <p className="mt-2 text-[13px] text-zinc-300">Nao foi possivel carregar o app. Tente novamente.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-5 rounded-2xl bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white"
          >
            Recarregar
          </button>
        </div>
      </body>
    </html>
  );
}
