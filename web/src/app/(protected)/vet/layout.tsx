import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/require-session";
import { requireVetUser } from "@/lib/auth/require-vet-user";
import { VetBottomNav } from "@/components/vet-bottom-nav";

export default async function VetLayout({ children }: { children: ReactNode }) {
  await requireSession();
  await requireVetUser();
  return (
    <>
      {children}
      <VetBottomNav />
    </>
  );
}
