import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { DeleteAccountButton } from "@/components/delete-account-button";
import { AppShell, TopBar } from "@/components/shell";
import { IconBell, IconChevronLeft, IconNotificationSettings } from "@/components/icons";

export const metadata: Metadata = {
  title: "Configuracoes · Lyka",
};

function SettingsRow({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-3 text-left transition hover:border-zinc-300 hover:bg-zinc-50"
    >
      {icon ? <span className="shrink-0 text-zinc-500">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-zinc-900">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] text-zinc-500">{description}</span> : null}
      </span>
      <span className="shrink-0 text-lg font-light text-zinc-300" aria-hidden>
        ›
      </span>
    </Link>
  );
}

export default function ProfileSettingsPage() {
  return (
    <AppShell tab="profile">
      <TopBar
        title="Configuracoes"
        subtitle="Conta"
        leadingAction={
          <Link
            href="/profile"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            aria-label="Voltar ao perfil"
          >
            <IconChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        }
        action={null}
      />

      <p className="appear-up mt-1 px-0.5 text-[12px] text-zinc-600" style={{ animationDelay: "40ms" }}>
        Legal, notificacoes e informacoes do aplicativo.
      </p>

      <section className="appear-up mt-4" style={{ animationDelay: "80ms" }}>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Legal</h2>
        <div className="space-y-2">
          <SettingsRow href="/terms?from=settings" label="Termos de Uso" description="Condicoes de uso da plataforma" />
          <SettingsRow
            href="/privacy?from=settings"
            label="Politica de Privacidade"
            description="Como tratamos seus dados"
          />
        </div>
      </section>

      <section className="appear-up mt-5" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Notificacoes e preferencias</h2>
        <div className="space-y-2">
          <SettingsRow
            href="/notifications/settings"
            label="Preferencias de notificacao"
            description="Alertas de saude, local e vacinas"
            icon={<IconNotificationSettings className="h-5 w-5" aria-hidden />}
          />
          <SettingsRow
            href="/notifications"
            label="Centro de notificacoes"
            description="Historico e avisos recentes"
            icon={<IconBell className="h-5 w-5" aria-hidden />}
          />
        </div>
      </section>

      <section className="appear-up mt-5" style={{ animationDelay: "160ms" }}>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Aplicativo</h2>
        <div className="space-y-2">
          <SettingsRow href="/profile/settings?option=language" label="Linguagem" description="Selecionar idioma do app" />
          <SettingsRow href="/profile/settings/about" label="Sobre o app" description="Versao e informacoes" />
        </div>
      </section>

      <section className="appear-up mt-5" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Conta</h2>
        <DeleteAccountButton />
      </section>
    </AppShell>
  );
}
