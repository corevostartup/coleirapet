"use client";

import dynamic from "next/dynamic";

const SplashScreen = dynamic(() => import("@/components/splash-screen").then((m) => m.SplashScreen), {
  ssr: false,
});

export function SplashScreenRoot() {
  return <SplashScreen />;
}
