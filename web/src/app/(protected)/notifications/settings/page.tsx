"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell, TopBar } from "@/components/shell";
import { IconChevronLeft } from "@/components/icons";

export default function NotificationSettingsPage() {
  const [lykaSaude, setLykaSaude] = useState(true);
  const [localizacao, setLocalizacao] = useState(true);
  const [vacinas, setVacinas] = useState(false);
  const [marketing, setMarketing] = useState(false);

  return (
    <AppShell tab="home">
      <TopBar
        title="Configuracao de notificacoes"
        subtitle="Conta"
        leadingAction={
          <Link
            href="/notifications"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            aria-label="Voltar para notificacoes"
          >
            <IconChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        }
        action={null}
      />

      <p className="appear-up mt-2 px-1 text-[12px] leading-snug text-zinc-600" style={{ animationDelay: "40ms" }}>
        Escolha quais alertas deseja receber no app. Em breve estas preferencias serao salvas na conta.
      </p>

      <section className="appear-up mt-4 space-y-2 rounded-[26px] bg-white p-3 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <ToggleRow
          label="Lyka e saude"
          description="Batimento, atividade e eventos da coleira"
          checked={lykaSaude}
          onChange={setLykaSaude}
        />
        <ToggleRow
          label="Localizacao"
          description="Zona segura e atualizacoes de local"
          checked={localizacao}
          onChange={setLocalizacao}
        />
        <ToggleRow
          label="Vacinas e consultas"
          description="Lembretes de calendario veterinario"
          checked={vacinas}
          onChange={setVacinas}
        />
        <ToggleRow
          label="Novidades Lyka"
          description="Dicas e atualizacoes do produto"
          checked={marketing}
          onChange={setMarketing}
          last
        />
      </section>
    </AppShell>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  last,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-3 px-2 py-3 ${last ? "" : "border-b border-zinc-100"}`}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-zinc-900">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-zinc-300 accent-emerald-600"
      />
    </label>
  );
}
