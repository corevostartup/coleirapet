import { LoginScreen } from "@/components/login/login-screen";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar · Lyka",
};

export default function LoginPage() {
  return <LoginScreen />;
}
