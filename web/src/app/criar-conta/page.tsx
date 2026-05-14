import type { Metadata } from "next";

import { CreateAccountScreenLoader } from "./create-account-screen-loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar conta · Lyka",
};

export default function CriarContaPage() {
  return <CreateAccountScreenLoader />;
}
