"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconChevronLeft, IconCollar, IconShield } from "@/components/icons";
import { AppShell, TopBar } from "@/components/shell";

const NFC_PAIRED_COOKIE = "cp_nfc_paired";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
const PASSWORD_STEP_QUERY = "step=password";

type NativeWindow = Window & {
  __COLEIRAPET_IOS_APP__?: boolean;
  ColeiraPetNativeNFC?: {
    startPairing: () => void;
    writePairingPassword: (password: string) => void;
  };
};

export default function TagNfcPairPage() {
  const router = useRouter();
  const [step, setStep] = useState<"scan" | "password">("scan");
  const [password, setPassword] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [isIosNativeApp, setIsIosNativeApp] = useState(false);
  const canFinish = password.trim().length >= 4;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as NativeWindow;
    setIsIosNativeApp(Boolean(w.__COLEIRAPET_IOS_APP__ && w.ColeiraPetNativeNFC));
    const shouldGoPassword = window.location.search.includes(PASSWORD_STEP_QUERY);
    setStep(shouldGoPassword ? "password" : "scan");
  }, []);

  function handleStartScan() {
    const w = typeof window !== "undefined" ? (window as NativeWindow) : undefined;
    if (w?.__COLEIRAPET_IOS_APP__ && w.ColeiraPetNativeNFC?.startPairing) {
      w.ColeiraPetNativeNFC.startPairing();
      return;
    }
    setStep("password");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canFinish) return;
    const nextPassword = password.trim();
    const w = typeof window !== "undefined" ? (window as NativeWindow) : undefined;
    if (w?.__COLEIRAPET_IOS_APP__ && w.ColeiraPetNativeNFC?.writePairingPassword) {
      setIsWriting(true);
      w.ColeiraPetNativeNFC.writePairingPassword(nextPassword);
      return;
    }
    document.cookie = `${NFC_PAIRED_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
    router.replace("/home");
  }

  return (
    <AppShell tab="profile">
      <TopBar
        title="Parear Tag NFC"
        subtitle={step === "scan" ? "Escaneamento" : "Cadastro de senha"}
        leadingAction={
          <Link
            href="/tag-nfc"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
            aria-label="Voltar para gerenciamento da Tag NFC"
          >
            <IconChevronLeft className="h-5 w-5" />
          </Link>
        }
      />

      <section
        className="appear-up mt-3 rounded-[26px] border border-emerald-200/90 bg-gradient-to-b from-emerald-50 via-white to-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
        style={{ animationDelay: "60ms" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">{step === "scan" ? "Escanear Tag NFC" : "Senha da Tag"}</h3>
          <IconCollar className="h-5 w-5 text-emerald-700" aria-hidden />
        </div>
        {step === "scan" ? (
          <>
            <p className="text-[12px] text-zinc-700">
              Aproxime a Tag NFC do celular para iniciar o pareamento.
            </p>
            <button
              type="button"
              onClick={handleStartScan}
              className="mt-3 w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
            >
              Escanear Tag NFC
            </button>
            {!isIosNativeApp ? <p className="mt-2 text-[11px] text-zinc-500">Modo web: apos confirmar o escaneamento, continue para cadastrar a senha.</p> : null}
          </>
        ) : (
          <p className="text-[12px] text-zinc-700">
            Defina uma senha para proteger alteracoes da Tag NFC.
          </p>
        )}
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "100ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Importante</h3>
          <IconShield className="h-5 w-5 text-emerald-600" aria-hidden />
        </div>
        <p className="text-[12px] text-zinc-600">
          Todos os dados publicos configurados no perfil serao exibidos ao escanear a Tag NFC.
        </p>
        <p className="mt-2 text-[12px] text-zinc-600">
          Esta senha serve apenas para editar informacoes da tag. A leitura continua publica.
        </p>
      </section>

      {step === "password" ? (
        <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "120ms" }}>
          <form onSubmit={handleSubmit}>
            <label htmlFor="tag-password" className="text-[12px] font-semibold text-zinc-700">
              Senha da Tag NFC
            </label>
            <input
              id="tag-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite a senha da tag"
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              autoComplete="new-password"
            />
            <p className="mt-2 text-[11px] text-zinc-500">Use pelo menos 4 caracteres.</p>

            <button
              type="submit"
              disabled={!canFinish || isWriting}
              className="mt-4 w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isWriting ? "Gravando senha na Tag NFC..." : "Finalizar pareamento"}
            </button>
          </form>
        </section>
      ) : null}
    </AppShell>
  );
}
