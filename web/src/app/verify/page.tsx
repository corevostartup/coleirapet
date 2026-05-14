"use client";

import { getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getLykaFirebaseApp } from "@/lib/firebase/client";

export default function VerifyPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirmando e-mail...");

  useEffect(() => {
    const auth = getAuth(getLykaFirebaseApp());
    const user = auth.currentUser;
    if (!user) {
      setMessage("Sessao nao encontrada. Redirecionando para o login...");
      const id = window.setTimeout(() => router.replace("/login"), 2000);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    void user
      .reload()
      .then(() => {
        if (cancelled) return;
        router.replace("/home");
      })
      .catch(() => {
        if (cancelled) return;
        setMessage("Nao foi possivel confirmar. Tente entrar novamente.");
        window.setTimeout(() => router.replace("/login"), 2500);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <p className="max-w-sm text-center text-[14px] leading-relaxed text-zinc-200">{message}</p>
    </main>
  );
}
