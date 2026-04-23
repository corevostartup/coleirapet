"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const SplashScreen = dynamic(() => import("@/components/splash-screen").then((m) => m.SplashScreen), {
  ssr: false,
});

function shouldHideSplash(pathname: string) {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

export function SplashScreenRoot() {
  const pathname = usePathname() ?? "";
  if (shouldHideSplash(pathname)) return null;
  return <SplashScreen />;
}
