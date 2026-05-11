import type { ReactNode } from "react";
import { VetBottomNav } from "@/components/vet-bottom-nav";
import { requireSession } from "@/lib/auth/require-session";
import { requireVetUser } from "@/lib/auth/require-vet-user";

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
