"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCollar, IconFile, IconHome, IconPin, IconUser } from "@/components/icons";
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
  const pathname = usePathname() ?? "";
  const desktopMenu = [
    { label: "Pets", href: "/vet/pets", Icon: IconCollar },
    { label: "Prontuario", href: "/vet/prontuario", Icon: IconFile },
    { label: "Atendimentos", href: "/vet/atendidos", Icon: IconUser },
    { label: "Clinicas", href: "/vet/clinicas", Icon: IconPin },
  ] as const;

  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-28 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
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

        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block xl:col-span-2">
            <nav className="sticky top-4 rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)]">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Menu medico</p>
              <ul className="space-y-1">
                {desktopMenu.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-medium transition ${
                          active ? "bg-emerald-50 text-emerald-800" : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800"
                        }`}
                      >
                        <item.Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div className="w-full max-w-[440px] lg:col-span-9 lg:max-w-none xl:col-span-10">{children}</div>
        </div>
      </div>
    </main>
  );
}
