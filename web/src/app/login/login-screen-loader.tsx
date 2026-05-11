"use client";

import dynamic from "next/dynamic";

const LoginScreen = dynamic(
  () => import("@/components/login/login-screen").then((m) => ({ default: m.LoginScreen })),
  {
    ssr: false,
    loading: () => (
      <main className="ios-safe-top min-h-screen bg-black lg:min-h-0" aria-busy="true" aria-label="A carregar login" />
    ),
  },
);

export function LoginScreenLoader() {
  return <LoginScreen />;
}
