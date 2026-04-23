"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell, TopBar } from "@/components/shell";
import { IconChevronLeft, IconCollar, IconShield } from "@/components/icons";

export default function TagNfcReadTestPage() {
  const [tested, setTested] = useState(false);

  return (
    <AppShell tab="profile">
      <TopBar
        title="Testar leitura"
        subtitle="Tag NFC"
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
          <h3 className="text-[14px] font-semibold text-zinc-900">Como testar</h3>
          <IconCollar className="h-5 w-5 text-emerald-700" aria-hidden />
        </div>
        <p className="text-[12px] text-zinc-700">Aproxime a Tag NFC do celular e toque em Iniciar teste de leitura.</p>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "100ms" }}>
        <button
          type="button"
          onClick={() => setTested(true)}
          className="w-full rounded-2xl bg-emerald-600 px-3 py-2.5 text-[13px] font-semibold text-white transition hover:bg-emerald-700"
        >
          Iniciar teste de leitura
        </button>

        {tested ? (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-emerald-800">Leitura detectada</p>
              <IconShield className="h-4.5 w-4.5 text-emerald-700" aria-hidden />
            </div>
            <p className="text-[11px] text-emerald-700">Tag NFC lida com sucesso. Dados publicos acessiveis normalmente.</p>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-zinc-500">Teste rapido sem alterar configuracoes da tag.</p>
        )}
      </section>
    </AppShell>
  );
}
