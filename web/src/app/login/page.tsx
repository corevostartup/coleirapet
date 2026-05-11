import type { Metadata } from "next";

import { LoginScreenLoader } from "./login-screen-loader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar · Lyka",
};

export default function LoginPage() {
  return <LoginScreenLoader />;
}
