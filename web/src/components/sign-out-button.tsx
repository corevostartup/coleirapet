"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmSignOut() {
    if (busy) return;
    setConfirmOpen(false);
    await signOut();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (busy) return;
          setConfirmOpen(true);
        }}
        disabled={busy}
        className="w-full rounded-2xl border border-red-200 bg-red-50/80 py-3.5 text-[14px] font-semibold text-red-800 transition enabled:hover:bg-red-100 disabled:opacity-60"
      >
        {busy ? "Saindo…" : "Sair da conta"}
      </button>

      {confirmOpen && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/35 px-4 py-6"
              role="presentation"
              onClick={() => !busy && setConfirmOpen(false)}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="sign-out-dialog-title"
                className="w-full max-w-[400px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]"
                onClick={(event) => event.stopPropagation()}
              >
                <p
                  id="sign-out-dialog-title"
                  className="text-center text-[15px] font-semibold leading-snug text-zinc-900"
                >
                  Sair da conta?
                </p>
                <p className="mt-2 text-center text-[12px] leading-relaxed text-zinc-600">
                  Voce precisara entrar de novo para acessar o perfil do seu pet e os dados da Lyka.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmOpen(false)}
                    className="rounded-2xl border border-zinc-200 bg-white py-3 text-[13px] font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleConfirmSignOut()}
                    className="rounded-2xl border border-red-200 bg-red-50 py-3 text-[13px] font-semibold text-red-800 transition enabled:hover:bg-red-100 disabled:opacity-60"
                  >
                    {busy ? "Saindo…" : "Sair"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
