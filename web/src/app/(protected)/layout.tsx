import { requireSession } from "@/lib/auth/require-session";
import { UserBottomNav } from "@/components/user-bottom-nav";
import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <>
      {children}
      <UserBottomNav />
    </>
  );
}
