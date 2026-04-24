"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { IconPin, IconShield } from "@/components/icons";
import { LocationLeafletMap } from "@/components/location-leaflet-map";

type Props = {
  addressLabel: string;
  updateLabel: string;
  lat: number | null;
  lng: number | null;
  animationDelay?: string;
};

function isCoordinateLikeAddress(value: string | null | undefined) {
  if (!value) return false;
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

export function HomeLocationSecurityCard({ addressLabel, updateLabel, lat, lng, animationDelay = "300ms" }: Props) {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const canOpenMap = typeof lat === "number" && typeof lng === "number";
  const [resolvedAddressLabel, setResolvedAddressLabel] = useState(addressLabel);

  useEffect(() => setMounted(true), []);
  useEffect(() => setResolvedAddressLabel(addressLabel), [addressLabel]);

  useEffect(() => {
    if (!canOpenMap) return;
    if (resolvedAddressLabel && resolvedAddressLabel !== "Endereco ainda nao disponivel" && !isCoordinateLikeAddress(resolvedAddressLabel)) return;
    let cancelled = false;

    async function resolveAddress() {
      try {
        const res = await fetch(`/api/pets/reverse-geocode?lat=${lat}&lng=${lng}`);
        if (!res.ok) return;
        const data = (await res.json()) as { address?: string };
        const address = typeof data.address === "string" ? data.address.trim() : "";
        if (!address || cancelled) return;
        setResolvedAddressLabel(address);
      } catch {
        /* noop */
      }
    }

    resolveAddress();
    return () => {
      cancelled = true;
    };
  }, [canOpenMap, lat, lng, resolvedAddressLabel]);

  useEffect(() => {
    if (!mapFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mapFullscreen]);

  useEffect(() => {
    if (!mapFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapFullscreen]);

  const fullscreenOverlay =
    mounted &&
    mapFullscreen &&
    canOpenMap &&
    createPortal(
      <div className="fixed inset-0 z-[40] isolate bg-[var(--surface-soft)] touch-manipulation">
        <div className="absolute inset-0 z-0 min-h-0">
          <LocationLeafletMap lat={lat} lng={lng} zoom={17} className="h-full min-h-[100dvh] w-full" />
        </div>

        <div className="pointer-events-none absolute inset-0 z-[1200]">
          <button
            type="button"
            aria-label="Sair da tela cheia"
            className="pointer-events-auto fixed right-4 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-700 shadow-[0_12px_28px_-20px_rgba(17,24,39,0.35)] backdrop-blur transition hover:bg-zinc-50"
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
            onClick={() => setMapFullscreen(false)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div
            className="pointer-events-auto fixed left-1/2 flex w-[min(428px,calc(100%-1.5rem))] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col gap-2 px-1"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)" }}
          >
            <div className="rounded-2xl border border-zinc-200 bg-white/90 p-3 shadow-sm backdrop-blur-md">
              <div className="flex items-start gap-2">
                <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-zinc-900">{resolvedAddressLabel}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{updateLabel}</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="w-full rounded-2xl border border-emerald-200/90 bg-emerald-50/95 py-3 text-[13px] font-semibold text-emerald-900 shadow-[0_12px_28px_-22px_rgba(16,24,18,0.35)] backdrop-blur-md transition active:scale-[0.99] hover:bg-emerald-100/90"
              onClick={() => setMapFullscreen(false)}
            >
              Sair da tela cheia
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Localizacao e seguranca</h3>
          <IconShield className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
          <button
            type="button"
            disabled={!canOpenMap}
            onClick={() => setMapFullscreen(true)}
            className="flex w-full items-start gap-2 text-left disabled:cursor-not-allowed"
          >
            <IconPin className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-700" />
            <div>
              <p className="text-[13px] font-medium text-emerald-800">{resolvedAddressLabel}</p>
              <p className="mt-0.5 text-[11px] text-emerald-700">{updateLabel}</p>
              <p className="mt-1 text-[10px] font-medium text-emerald-700/80">{canOpenMap ? "Toque para abrir mapa em tela cheia" : ""}</p>
            </div>
          </button>
        </div>
      </section>

      {fullscreenOverlay}
    </>
  );
}
