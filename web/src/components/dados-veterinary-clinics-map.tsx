"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { VeterinaryClinicsLeafletMap } from "@/components/veterinary-clinics-leaflet-map";
import { location } from "@/lib/mock";

const DESKTOP_LAYOUT_MQ = "(min-width: 768px)";

/** Metade da altura do card de mapa na tela Localizacao. */
const MAP_SHELL_HEIGHT =
  "h-[100px] w-full min-h-[100px] sm:h-[120px] sm:min-h-[120px] md:h-[min(26vh,220px)] md:min-h-[160px] lg:h-[200px] lg:min-h-[180px]";

export function DadosVeterinaryClinicsMap() {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: location.lat, lng: location.lng });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_LAYOUT_MQ);
    const update = () => setIsDesktopLayout(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMapCenter() {
      try {
        const res = await fetch("/api/pets/current");
        if (!res.ok) return;
        const data = (await res.json()) as {
          pet?: { lastNfcAccessLat?: number | null; lastNfcAccessLng?: number | null };
        };
        const lat = data.pet?.lastNfcAccessLat;
        const lng = data.pet?.lastNfcAccessLng;
        if (typeof lat === "number" && typeof lng === "number" && !cancelled) {
          setMapCenter({ lat, lng });
        }
      } catch {
        /* noop */
      }
    }

    void loadMapCenter();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (mapFullscreen) {
      root.setAttribute("data-lyka-vet-map-fullscreen", "");
    } else {
      root.removeAttribute("data-lyka-vet-map-fullscreen");
    }
    return () => root.removeAttribute("data-lyka-vet-map-fullscreen");
  }, [mapFullscreen]);

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

  const openFullscreen = () => setMapFullscreen(true);

  const mapShell = (
    <div className={`relative isolate overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 ${MAP_SHELL_HEIGHT}`}>
      <div className="absolute inset-0 z-0 min-h-0">
        <VeterinaryClinicsLeafletMap
          lat={mapCenter.lat}
          lng={mapCenter.lng}
          zoom={isDesktopLayout ? 14 : 15}
          zoomControl={isDesktopLayout}
          className={`h-full w-full ${MAP_SHELL_HEIGHT}`}
          onMapClick={isDesktopLayout ? undefined : openFullscreen}
          ariaLabel="Mapa de clinicas veterinarias"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1200]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden />
        <div className="pointer-events-auto absolute inset-x-3 bottom-3 flex justify-center md:inset-x-4 md:bottom-4">
          <button
            type="button"
            onClick={openFullscreen}
            className="w-full max-w-[280px] rounded-xl border border-white/30 bg-white/20 px-3 py-2 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-white/30 sm:text-[12px]"
          >
            Clínicas e Serviços
          </button>
        </div>
      </div>
    </div>
  );

  const mapPlaceholder = (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 ${MAP_SHELL_HEIGHT}`}
      aria-hidden
    >
      <div className="h-full w-full animate-pulse bg-zinc-100" />
    </div>
  );

  const fullscreenOverlay =
    mounted &&
    mapFullscreen &&
    createPortal(
      <div className="fixed inset-0 z-[40] isolate bg-[var(--surface-soft)] touch-manipulation">
        <div className="absolute inset-0 z-0 min-h-0">
          <VeterinaryClinicsLeafletMap
            lat={mapCenter.lat}
            lng={mapCenter.lng}
            zoom={15}
            zoomControl={false}
            className="h-full min-h-[100dvh] w-full"
            ariaLabel="Mapa de clinicas veterinarias"
          />
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
            style={{
              bottom: isDesktopLayout
                ? "max(1.5rem, env(safe-area-inset-bottom))"
                : "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)",
            }}
          >
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
      {mounted ? mapShell : mapPlaceholder}

      {fullscreenOverlay}
    </>
  );
}
