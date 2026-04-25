import type { ReactNode } from "react";
import Link from "next/link";
import { IconHome } from "@/components/icons";
import { TopBar } from "@/components/shell";

export function VetShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-28 sm:px-6">
      <div className="mx-auto w-full max-w-[440px]">
        <TopBar
          title={title}
          subtitle={subtitle}
          action={
            <Link
              href="/home"
              className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold leading-snug text-zinc-800 shadow-sm transition hover:bg-zinc-50 sm:text-[12px]"
              aria-label="Voltar para area do usuario"
            >
              <IconHome className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              Area do usuario
            </Link>
          }
        />
        {children}
      </div>
    </main>
  );
}
