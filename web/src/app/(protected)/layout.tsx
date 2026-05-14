import { requireSession } from "@/lib/auth/require-session";
import { EmailVerificationGate } from "@/components/email-verification-gate";
import { UserBottomNav } from "@/components/user-bottom-nav";
import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession();
  return (
    <>
      <EmailVerificationGate />
      {children}
      <UserBottomNav />
    </>
  );
}
