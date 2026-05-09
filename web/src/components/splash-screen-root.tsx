"use client";

import { usePathname } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";

function shouldHideSplash(pathname: string) {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

export function SplashScreenRoot() {
  const pathname = usePathname() ?? "";
  if (shouldHideSplash(pathname)) return null;
  return <SplashScreen />;
}
