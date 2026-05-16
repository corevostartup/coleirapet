"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconFile, IconHeart, IconHome, IconPin, IconUser } from "@/components/icons";

type Tab = "home" | "health" | "location" | "dados" | "profile";

function resolveTab(pathname: string): Tab {
  if (pathname.startsWith("/health")) return "health";
  if (pathname.startsWith("/location")) return "location";
  if (pathname.startsWith("/dados")) return "dados";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/tag-nfc")) return "profile";
  return "home";
}

/** `usePathname` só depois do mount — chamar no SSR/hidratação inicial quebra o boundary Loading/Suspense no Next 16. */
function UserBottomNavInner() {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith("/vet")) return null;
  if (pathname.startsWith("/lyka-admin-x7k9m2p4q8r1")) return null;

  const tab = resolveTab(pathname);
  const items = [
    { key: "home", label: "Home", href: "/home", Icon: IconHome },
    { key: "health", label: "Saude", href: "/health", Icon: IconHeart },
    { key: "location", label: "Local", href: "/location", Icon: IconPin },
    { key: "dados", label: "Dados", href: "/dados", Icon: IconFile },
    { key: "profile", label: "Perfil", href: "/profile", Icon: IconUser },
  ] as const;

  return (
    <nav
      className="appear-up fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[428px] -translate-x-1/2 rounded-[24px] border border-zinc-200 bg-white/92 px-1.5 py-1.5 shadow-[0_18px_35px_-25px_rgba(15,23,42,0.5)] backdrop-blur md:hidden"
      style={{ animationDelay: "420ms" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = tab === item.key;
          return (
            <li key={item.key}>
              <Link prefetch href={item.href} className={`block w-full rounded-[16px] px-1 py-2 text-center ${active ? "bg-emerald-50 text-emerald-700" : "text-zinc-500"}`}>
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

export function UserBottomNav() {
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!mounted) return null;
  return <UserBottomNavInner />;
}
