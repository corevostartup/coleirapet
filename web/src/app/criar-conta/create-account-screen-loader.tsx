"use client";

import dynamic from "next/dynamic";

const CreateAccountScreen = dynamic(
  () => import("@/components/login/create-account-screen").then((m) => ({ default: m.CreateAccountScreen })),
  {
    ssr: false,
    loading: () => (
      <main className="ios-safe-top min-h-screen bg-black lg:min-h-0" aria-busy="true" aria-label="A carregar cadastro" />
    ),
  },
);

export function CreateAccountScreenLoader() {
  return <CreateAccountScreen />;
}
