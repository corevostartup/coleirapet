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
    writePairingPassword: (password: string, publicUrl: string) => void;
  };
};

function readInitialStep(): "scan" | "password" {
  if (typeof window === "undefined") return "scan";
  return window.location.search.includes(PASSWORD_STEP_QUERY) ? "password" : "scan";
}

function readIsIosNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as NativeWindow;
  return Boolean(w.__COLEIRAPET_IOS_APP__ && w.ColeiraPetNativeNFC);
}

export default function TagNfcPairPage() {
  const router = useRouter();
  const [step, setStep] = useState<"scan" | "password" | "write">(readInitialStep);
  const [password, setPassword] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [isIosNativeApp] = useState<boolean>(readIsIosNativeApp);
  const [publicUrl, setPublicUrl] = useState<string>("");
  const [publicUrlError, setPublicUrlError] = useState<string | null>(null);
  const canFinish = password.trim().length >= 4;

  useEffect(() => {
    let cancelled = false;
    async function loadPublicUrl() {
      try {
        const res = await fetch("/api/pets/current", { cache: "no-store" });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
          if (res.status === 401) {
            throw new Error("Sessao expirada. Faca login novamente.");
          }
          throw new Error(payload?.detail || payload?.error || "Falha ao carregar pet atual.");
        }
        const payload = (await res.json()) as { pet?: { publicPagePath?: string } };
        const path = payload.pet?.publicPagePath?.trim();
        if (!path) throw new Error("Endereco publico do pet indisponivel.");
        const absolute = new URL(path, window.location.origin).toString();
        if (!cancelled) {
          setPublicUrl(absolute);
          setPublicUrlError(null);
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error && error.message === "Sessao expirada. Faca login novamente.") {
            setPublicUrlError(error.message);
            router.replace("/login");
            return;
          }
          setPublicUrl("");
          setPublicUrlError(error instanceof Error ? error.message : "Falha ao carregar endereco publico.");
        }
      }
    }
    void loadPublicUrl();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
    if (!publicUrl) {
      setPublicUrlError("Nao foi possivel carregar o endereco publico deste pet. Tente novamente.");
      return;
    }
    setStep("write");
  }

  function handleWriteToNfc() {
    if (!publicUrl || !canFinish) return;
    const nextPassword = password.trim();
    const w = typeof window !== "undefined" ? (window as NativeWindow) : undefined;
    if (w?.__COLEIRAPET_IOS_APP__ && w.ColeiraPetNativeNFC?.writePairingPassword) {
      setIsWriting(true);
      w.ColeiraPetNativeNFC.writePairingPassword(nextPassword, publicUrl);
      return;
    }
    document.cookie = `${NFC_PAIRED_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
    router.replace("/home");
  }

  return (
    <AppShell tab="profile">
      <TopBar
        title="Parear Tag NFC"
        subtitle={step === "scan" ? "Escaneamento" : step === "password" ? "Cadastro de senha" : "Gravar na Tag"}
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
          <h3 className="text-[14px] font-semibold text-zinc-900">
            {step === "scan" ? "Escanear Tag NFC" : step === "password" ? "Senha da Tag" : "Gravacao na Tag NFC"}
          </h3>
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
        ) : step === "password" ? (
          <p className="text-[12px] text-zinc-700">
            Defina uma senha para proteger alteracoes da Tag NFC.
          </p>
        ) : (
          <p className="text-[12px] text-zinc-700">
            Aproxime novamente a Tag NFC para gravar senha e endereco publico do pet.
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
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-4 py-6">
          <section className="w-full max-w-[420px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="mb-2">
              <h3 className="text-[15px] font-semibold text-zinc-900">Cadastrar senha da Tag NFC</h3>
              <p className="mt-1 text-[12px] text-zinc-600">
                Defina a senha e clique em finalizar pareamento para concluir a conexao.
              </p>
            </div>

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
                autoFocus
              />
              <p className="mt-2 text-[11px] text-zinc-500">Use pelo menos 4 caracteres.</p>
              {publicUrlError ? <p className="mt-2 text-[11px] font-medium text-rose-600">{publicUrlError}</p> : null}

              <button
                type="submit"
                disabled={!canFinish || isWriting || !publicUrl}
                className="mt-4 w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isWriting ? "Gravando senha na Tag NFC..." : "Finalizar pareamento"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {step === "write" ? (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-4 py-6">
          <section className="w-full max-w-[420px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="mb-2">
              <h3 className="text-[15px] font-semibold text-zinc-900">Aproxime novamente o NFC</h3>
              <p className="mt-1 text-[12px] text-zinc-600">
                Toque em “Gravar na Tag NFC” e aproxime a tag para salvar a senha e o endereco publico do pet.
              </p>
            </div>

            {publicUrlError ? <p className="mb-3 text-[11px] font-medium text-rose-600">{publicUrlError}</p> : null}

            <button
              type="button"
              onClick={handleWriteToNfc}
              disabled={isWriting || !publicUrl || !canFinish}
              className="w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isWriting ? "Aguardando aproximacao da Tag NFC..." : "Gravar na Tag NFC"}
            </button>

            <button
              type="button"
              onClick={() => setStep("password")}
              disabled={isWriting}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Voltar e editar senha
            </button>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
