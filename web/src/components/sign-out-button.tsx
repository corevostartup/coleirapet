"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

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

  async function handleClick() {
    if (busy) return;
    const ok = window.confirm("Deseja realmente sair da conta?");
    if (!ok) return;
    await signOut();
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={busy}
      className="w-full rounded-2xl border border-red-200 bg-red-50/80 py-3.5 text-[14px] font-semibold text-red-800 transition enabled:hover:bg-red-100 disabled:opacity-60"
    >
      {busy ? "Saindo…" : "Sair da conta"}
    </button>
  );
}
