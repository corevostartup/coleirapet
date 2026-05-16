import Link from "next/link";
import { AppShell, TopBar } from "@/components/shell";
import { HealthWeightPanel } from "@/components/health-weight-panel";
import { IconChevronLeft } from "@/components/icons";

export const dynamic = "force-dynamic";

export default function HomePesoPage() {
  const back = (
    <Link
      href="/home"
      prefetch
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.97]"
      aria-label="Voltar"
    >
      <IconChevronLeft className="h-5 w-5" aria-hidden />
    </Link>
  );

  return (
    <AppShell tab="home">
      <TopBar title="Peso" subtitle="Registros e evolucao" leadingAction={back} action={null} />
      <HealthWeightPanel />
    </AppShell>
  );
}
