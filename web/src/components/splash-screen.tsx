"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/** Posicoes fixas para evitar diferencas de hidratacao e manter estrelas espalhadas. */
const STARS = [
  { t: 6, l: 10, d: 0.1, s: 2 },
  { t: 11, l: 78, d: 0.45, s: 1 },
  { t: 18, l: 44, d: 0.82, s: 1 },
  { t: 24, l: 91, d: 0.22, s: 2 },
  { t: 31, l: 23, d: 1.1, s: 1 },
  { t: 38, l: 67, d: 0.05, s: 2 },
  { t: 44, l: 52, d: 0.68, s: 1 },
  { t: 52, l: 8, d: 1.35, s: 1 },
  { t: 58, l: 88, d: 0.55, s: 2 },
  { t: 63, l: 35, d: 0.92, s: 1 },
  { t: 71, l: 61, d: 0.28, s: 1 },
  { t: 76, l: 15, d: 1.52, s: 2 },
  { t: 82, l: 72, d: 0.38, s: 1 },
  { t: 9, l: 56, d: 1.22, s: 1 },
  { t: 27, l: 96, d: 0.65, s: 1 },
  { t: 41, l: 3, d: 1.42, s: 2 },
  { t: 55, l: 41, d: 0.18, s: 1 },
  { t: 68, l: 84, d: 0.98, s: 1 },
  { t: 79, l: 29, d: 1.62, s: 2 },
  { t: 14, l: 63, d: 0.72, s: 1 },
  { t: 47, l: 19, d: 1.08, s: 1 },
  { t: 89, l: 47, d: 0.42, s: 1 },
  { t: 5, l: 33, d: 1.28, s: 2 },
  { t: 33, l: 74, d: 0.15, s: 1 },
  { t: 61, l: 6, d: 0.88, s: 1 },
  { t: 73, l: 93, d: 1.48, s: 2 },
  { t: 21, l: 86, d: 0.58, s: 1 },
  { t: 85, l: 18, d: 1.18, s: 1 },
  { t: 36, l: 58, d: 0.32, s: 2 },
  { t: 94, l: 65, d: 0.95, s: 1 },
];

const DISPLAY_MS = 2600;
const FADE_MS = 520;

export function SplashScreen() {
  /** Sempre inicia em "show" (SSR + cliente alinhados) — cada carga completa do documento mostra a splash primeiro. */
  const [phase, setPhase] = useState<"show" | "exit" | "gone">("show");

  useEffect(() => {
    if (phase !== "show") return;
    const id = window.setTimeout(() => setPhase("exit"), DISPLAY_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "show" || phase === "exit") {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
  }, [phase]);

  useEffect(() => {
    if (phase !== "exit") return;
    const id = window.setTimeout(() => setPhase("gone"), FADE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      className={`splash-screen-root fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-black transition-opacity ease-out ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: phase === "exit" ? `${FADE_MS}ms` : "280ms" }}
      aria-hidden
    >
      <div className="splash-nebula pointer-events-none absolute inset-[-20%] opacity-70" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {STARS.map((star, i) => (
          <span
            key={i}
            className="splash-star absolute rounded-full bg-white"
            style={{
              top: `${star.t}%`,
              left: `${star.l}%`,
              width: star.s,
              height: star.s,
              animationDelay: `${star.d}s`,
            }}
          />
        ))}
      </div>

      <div className="splash-orbit-ring pointer-events-none absolute aspect-square w-[min(124vw,420px)] rounded-full border border-white/[0.06]" />

      <div className="splash-logo-float relative z-[1] flex w-[min(76vw,280px)] flex-col items-center">
        <div className="relative aspect-square w-full">
          <Image
            src="/coleira-splash-logo.png"
            alt="Lyka"
            fill
            className="object-contain drop-shadow-[0_12px_40px_rgba(34,197,94,0.18)]"
            priority
            sizes="280px"
          />
        </div>

        <div className="splash-hud mt-8 flex gap-2.5" aria-hidden>
          <span className="splash-hud-dot" style={{ animationDelay: "0ms" }} />
          <span className="splash-hud-dot" style={{ animationDelay: "180ms" }} />
          <span className="splash-hud-dot" style={{ animationDelay: "360ms" }} />
        </div>
      </div>
    </div>
  );
}
