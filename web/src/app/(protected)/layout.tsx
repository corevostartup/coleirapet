import { requireSession } from "@/lib/auth/require-session";
import type { ReactNode } from "react";
import { UserBottomNav } from "@/components/user-bottom-nav";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <>
      {children}
      <UserBottomNav />
    </>
  );
}
