import type { ReactNode } from "react";
import { TopBarNotificationsLink } from "@/components/top-bar-notifications-link";

type Tab = "home" | "health" | "location" | "dados" | "profile";

export function AppShell({ children }: { children: ReactNode; tab?: Tab }) {
  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-28 sm:px-6">
      <div className="mx-auto w-full max-w-[440px]">
        {children}
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
  const defaultBell = <TopBarNotificationsLink />;

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