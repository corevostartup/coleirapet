"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconCollar, IconFile, IconPin, IconUser } from "@/components/icons";

type VetTab = "pets" | "prontuario" | "atendidos" | "clinicas";

function resolveVetTab(pathname: string): VetTab {
  if (pathname.startsWith("/vet/prontuario")) return "prontuario";
  if (pathname.startsWith("/vet/atendidos")) return "atendidos";
  if (pathname.startsWith("/vet/clinicas")) return "clinicas";
  return "pets";
}

/** `usePathname` só após mount (ver UserBottomNav). */
function VetBottomNavInner() {
  const pathname = usePathname() ?? "";

  if (!pathname.startsWith("/vet")) return null;

  const tab = resolveVetTab(pathname);
  const items = [
    { key: "pets", label: "Pets", href: "/vet/pets", Icon: IconCollar },
    { key: "prontuario", label: "Prontuario", href: "/vet/prontuario", Icon: IconFile },
    { key: "atendidos", label: "Atendimentos", href: "/vet/atendidos", Icon: IconUser },
    { key: "clinicas", label: "Clinicas", href: "/vet/clinicas", Icon: IconPin },
  ] as const;

  return (
    <nav
      className="appear-up fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[428px] -translate-x-1/2 rounded-[24px] border border-zinc-200 bg-white/92 px-1.5 py-1.5 shadow-[0_18px_35px_-25px_rgba(15,23,42,0.5)] backdrop-blur lg:hidden"
      style={{ animationDelay: "420ms" }}
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active = tab === item.key;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={`block w-full rounded-[16px] px-1 py-2 text-center ${active ? "bg-emerald-50 text-emerald-700" : "text-zinc-500"}`}
              >
                <item.Icon className="mx-auto h-[18px] w-[18px]" />
                <span className="mt-1 block text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function VetBottomNav() {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) return null;
  return <VetBottomNavInner />;
}
