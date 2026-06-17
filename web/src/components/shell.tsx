import type { ComponentProps, ReactNode } from "react";
import { TopBarClient } from "@/components/top-bar-client";
import { UserAppShellLayout } from "@/components/user-app-shell-layout";

type Tab = "home" | "health" | "location" | "dados" | "profile";

/** Em telemovel mantem coluna estreita; a partir de md (tablet/iPad paisagem e desktop) grelha + menu lateral como na area medica. */
export function AppShell({ children, tab: _tab }: { children: ReactNode; tab?: Tab }) {
  return <UserAppShellLayout>{children}</UserAppShellLayout>;
}

export function TopBar(props: ComponentProps<typeof TopBarClient>) {
  return <TopBarClient {...props} />;
}
