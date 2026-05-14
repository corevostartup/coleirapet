import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Verificar e-mail · Lyka",
};

export default function VerifyLayout({ children }: { children: ReactNode }) {
  return children;
}
