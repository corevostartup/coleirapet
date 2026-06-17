"use client";

import type { ReactNode } from "react";
import { TopBarClient, UserAppShellLayout } from "@/components/user-app-shell-layout";

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
  showNotifications = true,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
  /** Pass `null` para omitir o sino padrao a direita. */
  action?: ReactNode | null;
  leadingAction?: ReactNode;
  /** Quando false, não renderiza o sino padrão. */
  showNotifications?: boolean;
}) {
  return (
    <TopBarClient
      title={title}
      subtitle={subtitle}
      action={action}
      leadingAction={leadingAction}
      showNotifications={showNotifications}
    >
      {children}
    </TopBarClient>
  );
}
