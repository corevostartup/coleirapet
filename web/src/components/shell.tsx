import type { ReactNode } from "react";
import { UserAppShellLayout } from "@/components/user-app-shell-layout";

type Tab = "home" | "health" | "location" | "dados" | "profile";

/** Em telemovel mantem coluna estreita; a partir de md (tablet/iPad paisagem e desktop) grelha + menu lateral como na area medica. */
export function AppShell({ children, tab: _tab }: { children: ReactNode; tab?: Tab }) {
  return <UserAppShellLayout>{children}</UserAppShellLayout>;
}
