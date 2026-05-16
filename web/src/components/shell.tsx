import type { ReactNode } from "react";
import { TopBarNotificationsLink } from "@/components/top-bar-notifications-link";
import { UserAppShellLayout } from "@/components/user-app-shell-layout";

type Tab = "home" | "health" | "location" | "dados" | "profile";

/** Em telemovel mantem coluna estreita; a partir de md (tablet/iPad paisagem e desktop) grelha + menu lateral como na area medica. */
export function AppShell({ children, tab: _tab }: { children: ReactNode; tab?: Tab }) {
  return <UserAppShellLayout>{children}</UserAppShellLayout>;
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
    <header className="glass-card appear-up relative z-[1800] rounded-[28px] px-4 py-3 md:px-5 md:py-3.5">
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