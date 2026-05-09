"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconChevronLeft, IconCollar, IconShield } from "@/components/icons";
import { AppShell, TopBar } from "@/components/shell";

type NativeWindow = Window & {
  __LYKA_IOS_APP__?: boolean;
  LykaNativeNFC?: {
    startPairing: () => void;
    writePairingPassword: (password: string, publicUrl: string) => void;
  };
};

function readIsIosNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as NativeWindow;
  return Boolean(w.__LYKA_IOS_APP__ && w.LykaNativeNFC);
}

export default function TagNfcPairPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"scan" | "write">("scan");
  const [nfcPin, setNfcPin] = useState("");
  const [preparePending, setPreparePending] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [isIosNativeApp] = useState<boolean>(readIsIosNativeApp);
  const [publicUrl, setPublicUrl] = useState<string>("");
  const [publicUrlError, setPublicUrlError] = useState<string | null>(null);
  const canFinish = /^\d{4}$/.test(nfcPin.trim());

  useEffect(() => {
    const s = searchParams.get("step");
    if (s === "password" || s === "write") {
      setStep("write");
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadPublicUrl() {
      try {
        const petRes = await fetch("/api/pets/current", { cache: "no-store" });
        if (!petRes.ok) {
          const payload = (await petRes.json().catch(() => null)) as { error?: string; detail?: string } | null;
          if (petRes.status === 401) {
            throw new Error("Sessao expirada. Faca login novamente.");
          }
          throw new Error(payload?.detail || payload?.error || "Falha ao carregar pet atual.");
        }
        const payload = (await petRes.json()) as { pet?: { publicPagePath?: string } };
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- carga única na montagem

  useEffect(() => {
    if (step !== "write") return;
    let cancelled = false;
    setPreparePending(true);
    setNfcPin("");
    async function prepare() {
      try {
        const res = await fetch("/api/pets/current/nfc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prepareWrite: true }),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Falha ao gerar PIN da Tag NFC.");
        }
        const data = (await res.json()) as { nfcPin?: string };
        const pin = typeof data.nfcPin === "string" ? data.nfcPin.trim() : "";
        if (!/^\d{4}$/.test(pin)) throw new Error("PIN retornado invalido.");
        if (!cancelled) {
          setNfcPin(pin);
          setPublicUrlError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setPublicUrlError(error instanceof Error ? error.message : "Falha ao preparar PIN.");
          setNfcPin("");
        }
      } finally {
        if (!cancelled) setPreparePending(false);
      }
    }
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [step]);

  function handleStartScan() {
    const w = typeof window !== "undefined" ? (window as NativeWindow) : undefined;
    if (w?.__LYKA_IOS_APP__ && w.LykaNativeNFC?.startPairing) {
      w.LykaNativeNFC.startPairing();
      return;
    }
    setStep("write");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  function handleWriteToNfc() {
    if (!publicUrl || !canFinish || preparePending) return;
    const nextPassword = nfcPin.trim();
    const w = typeof window !== "undefined" ? (window as NativeWindow) : undefined;
    if (w?.__LYKA_IOS_APP__ && w.LykaNativeNFC?.writePairingPassword) {
      w.LykaNativeNFC.writePairingPassword(nextPassword, publicUrl);
      return;
    }
    setIsWriting(true);
    fetch("/api/pets/current/nfc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Falha ao concluir pareamento NFC.");
        }
        const maxAgeSeconds = 60 * 60 * 24 * 365;
        document.cookie = `cp_nfc_paired=1; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
        router.replace("/home");
        router.refresh();
      })
      .catch((error) => {
        setPublicUrlError(error instanceof Error ? error.message : "Falha ao concluir pareamento NFC.");
        setIsWriting(false);
      });
  }

  return (
    <AppShell tab="profile">
      <TopBar
        title="Parear Tag NFC"
        subtitle={step === "scan" ? "Escaneamento" : "Gravar na Tag"}
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
            {step === "scan" ? "Escanear Tag NFC" : "Gravacao na Tag NFC"}
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
            {!isIosNativeApp ? (
              <p className="mt-2 text-[11px] text-zinc-500">
                Modo web: apos confirmar o escaneamento, o app gera um PIN de 4 digitos e segue para gravar na tag.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-[12px] text-zinc-700">
            O app gera um PIN de 4 digitos e grava na Tag NFC junto com o endereco publico do pet.
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
          O PIN e criado pelo app nesta etapa e salvo na nuvem e na tag; voce nao precisa escolher nem digitar a senha. A leitura basica da tag continua publica.
        </p>
      </section>

      {step === "write" ? (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/40 px-4 py-6">
          <section className="w-full max-w-[420px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="mb-2">
              <h3 className="text-[15px] font-semibold text-zinc-900">Aproxime novamente o NFC</h3>
              <p className="mt-1 text-[12px] text-zinc-600">
                Toque em “Gravar na Tag NFC” e aproxime a tag para salvar o PIN de 4 digitos e o endereco publico do pet.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="text-[12px] font-semibold text-zinc-700">PIN da Tag NFC (gerado pelo app)</label>
              <input
                type="text"
                value={preparePending ? "····" : nfcPin}
                readOnly
                aria-busy={preparePending}
                aria-label="PIN da Tag NFC"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-center text-[16px] font-semibold tracking-[0.35em] text-zinc-900"
              />
            </form>

            {publicUrlError ? <p className="mb-3 mt-2 text-[11px] font-medium text-rose-600">{publicUrlError}</p> : null}

            <button
              type="button"
              onClick={handleWriteToNfc}
              disabled={isWriting || preparePending || !publicUrl || !canFinish}
              className="mt-2 w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isWriting ? "Aguardando aproximacao da Tag NFC..." : "Gravar na Tag NFC"}
            </button>

            <button
              type="button"
              onClick={() => setStep("scan")}
              disabled={isWriting}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Voltar
            </button>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
