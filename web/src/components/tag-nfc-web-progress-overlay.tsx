"use client";

import { useEffect, useState } from "react";

/**
 * Durante cargas do WKWebView nas rotas `/tag-nfc/*`, a splash completa fica ocultada;
 * este overlay mostra apenas o mascote flutuante e a barra (mesmo contrato `lyka-wk-load-progress`).
 */
export function TagNfcWebProgressOverlay() {
  const [wkProgress, setWkProgress] = useState(0);
  const [wkProgressFromNative, setWkProgressFromNative] = useState(false);

  useEffect(() => {
    const onProgress = (ev: Event) => {
      const detail = (ev as CustomEvent<number>).detail;
      const n = typeof detail === "number" && Number.isFinite(detail) ? Math.min(1, Math.max(0, detail)) : 0;
      setWkProgressFromNative(true);
      setWkProgress(n);
    };
    window.addEventListener("lyka-wk-load-progress", onProgress as EventListener);
    return () => window.removeEventListener("lyka-wk-load-progress", onProgress as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as Window & { __LYKA_IOS_APP__?: boolean };
    if (w.__LYKA_IOS_APP__) return;
    const done = () => {
      setWkProgress(1);
      setWkProgressFromNative(true);
    };
    if (document.readyState === "complete") done();
    else window.addEventListener("load", done, { once: true });
  }, []);

  if (wkProgress >= 0.995) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[6000] flex flex-col items-center justify-center bg-transparent"
      aria-busy
      aria-label="Carregando"
    >
      <div className="splash-logo-float relative z-[1] flex w-[min(76vw,280px)] max-w-full flex-col items-center">
        <div className="relative aspect-square w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- overlay leve; sem next/image */}
          <img
            src="/coleira-splash-logo.png"
            alt=""
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_40px_rgba(34,197,94,0.18)]"
            width={280}
            height={280}
            decoding="async"
            aria-hidden
          />
        </div>

        <div
          className="tag-nfc-wk-load-track mt-8"
          role="progressbar"
          aria-label="Carregando"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={wkProgressFromNative ? Math.round(wkProgress * 100) : undefined}
        >
          <div
            className="tag-nfc-wk-load-fill"
            style={{ width: wkProgressFromNative ? `${Math.max(1, wkProgress * 100)}%` : "0%" }}
          />
          {!wkProgressFromNative ? <div className="tag-nfc-wk-load-shimmer" aria-hidden /> : null}
        </div>
      </div>
    </div>
  );
}
