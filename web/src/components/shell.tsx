import type { ReactNode } from "react";
import Link from "next/link";
import { IconBell, IconFile, IconHeart, IconHome, IconPin, IconUser } from "@/components/icons";

type Tab = "home" | "health" | "location" | "dados" | "profile";

export function AppShell({ children, tab }: { children: ReactNode; tab: Tab }) {
  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-28 sm:px-6">
      <div className="mx-auto w-full max-w-[440px]">
        {children}
        <BottomNav tab={tab} />
      </div>
    </main>
  );
}

export function TopBar({
  title,
  subtitle,
  children,
  action,
  leadingAction,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
  /** Pass `null` para omitir o sino padrao a direita. */
  action?: ReactNode | null;
  leadingAction?: ReactNode;
}) {
  const defaultBell = (
    <Link
      href="/notifications"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:text-zinc-900"
      aria-label="Notificacoes"
    >
      <IconBell className="h-5 w-5" />
      <span className="pulse-soft absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
    </Link>
  );

  return (
    <header className="glass-card appear-up relative z-[1800] rounded-[28px] px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {leadingAction ? <div className="shrink-0">{leadingAction}</div> : null}
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide text-zinc-500">{subtitle}</p>
            <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight text-zinc-900">{title}</h1>
          </div>
        </div>
        {action !== undefined ? action : defaultBell}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}

function BottomNav({ tab }: { tab: Tab }) {
  const items = [
    { key: "home", label: "Home", href: "/", Icon: IconHome },
    { key: "health", label: "Saude", href: "/health", Icon: IconHeart },
    { key: "location", label: "Local", href: "/location", Icon: IconPin },
    { key: "dados", label: "Dados", href: "/dados", Icon: IconFile },
    { key: "profile", label: "Perfil", href: "/profile", Icon: IconUser },
  ] as const;

  return (
    <nav
      className="appear-up fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[428px] -translate-x-1/2 rounded-[24px] border border-zinc-200 bg-white/92 px-1.5 py-1.5 shadow-[0_18px_35px_-25px_rgba(15,23,42,0.5)] backdrop-blur"
      style={{ animationDelay: "420ms" }}
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = tab === item.key;
          return (
            <li key={item.key}>
              <Link href={item.href} className={`block w-full rounded-[16px] px-1 py-2 text-center ${active ? "bg-emerald-50 text-emerald-700" : "text-zinc-500"}`}>
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