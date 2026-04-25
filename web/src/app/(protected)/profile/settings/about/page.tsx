import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { AppShell, TopBar } from "@/components/shell";
import { IconChevronLeft } from "@/components/icons";

export const metadata: Metadata = {
  title: "Sobre o app · Lyka",
};

export default function AboutAppPage() {
  return (
    <AppShell tab="profile">
      <TopBar
        title="Sobre o app"
        subtitle="Aplicativo"
        leadingAction={
          <Link
            href="/profile/settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            aria-label="Voltar as configuracoes"
          >
            <IconChevronLeft className="h-5 w-5" aria-hidden />
          </Link>
        }
        action={null}
      />

      <section
        className="appear-up mt-4 rounded-[26px] border border-zinc-200 bg-white p-5 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
        style={{ animationDelay: "60ms" }}
      >
        <div className="mb-5 flex justify-center">
          <div className="relative w-full max-w-[280px]">
            <Image
              src="/img/about-app-mascot.png"
              alt="Mascote Lyka"
              width={1024}
              height={682}
              className="h-auto w-full object-contain"
              sizes="(max-width: 440px) 90vw, 280px"
              priority
            />
          </div>
        </div>
        <p className="text-center text-[20px] font-semibold text-zinc-900">Lyka</p>
        <p className="mt-1 text-center text-[12px] text-zinc-500">Versao 0.1.0</p>
        <p className="mt-4 text-[13px] leading-relaxed text-zinc-600">
          Monitoramento, saude e seguranca do seu pet com a Lyka — dados em tempo real, vacinas, lembretes e
          contato de emergencia quando precisar.
        </p>
        <p className="mt-3 text-[12px] text-zinc-500">
          Em caso de duvidas, utilize os canais oficiais de suporte indicados pelo seu veterinario ou tutor.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <Image
            src="/img/corevo-startup-logo.png"
            alt="Corevo Startup"
            width={104}
            height={44}
            className="h-auto w-[104px] object-contain"
            sizes="104px"
          />
          <p className="text-center text-[12px] font-medium text-zinc-600">feito com ❤️ por corevo startup</p>
        </div>
      </section>
    </AppShell>
  );
}
