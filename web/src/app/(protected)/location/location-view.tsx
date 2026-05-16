"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { LocationLeafletMap } from "@/components/location-leaflet-map";
import { AppShell, TopBar } from "@/components/shell";
import { IconCollar, IconMessages, IconPin, IconShield } from "@/components/icons";
import { location, locationPageDevices } from "@/lib/mock";

type FinderMessageItem = {
  id: string;
  body: string;
  senderLabel: string;
  createdAt: string;
  createdAtLabel: string;
};

type LocationHistoryItem = {
  id: string;
  at: string;
  atLabel: string;
  address: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  source: string;
};

type CurrentPetLocation = {
  lat: number;
  lng: number;
  addressLabel: string;
  lastUpdateLabel: string;
};

function formatPtBrDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Atualizado recentemente";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatLatLngLabel(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function LocationAddressCard({ point }: { point: CurrentPetLocation }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 p-3 shadow-sm backdrop-blur-md">
      <div className="flex items-start gap-2">
        <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-zinc-900">{point.addressLabel}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">{point.lastUpdateLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function LocationView() {
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [finderMessages, setFinderMessages] = useState<FinderMessageItem[]>([]);
  const [locationHistory, setLocationHistory] = useState<LocationHistoryItem[]>([]);
  const [isNfcPaired, setIsNfcPaired] = useState(false);
  const [petLocation, setPetLocation] = useState<CurrentPetLocation>({
    lat: location.lat,
    lng: location.lng,
    addressLabel: "Nenhuma localizacao registrada",
    lastUpdateLabel: "Aguardando compartilhamento de localizacao via NFC",
  });
  const disconnectedDevices = locationPageDevices.map((device) => ({
    ...device,
    status: device.name === "Tag NFC" && isNfcPaired ? "Conectado" : "Desconectado",
  }));

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (locationHistory.length === 0) return;
    const pending = locationHistory.filter((item) => !item.address && typeof item.lat === "number" && typeof item.lng === "number");
    if (pending.length === 0) return;
    let cancelled = false;

    async function fillMissingAddresses() {
      for (const item of pending) {
        try {
          const res = await fetch(`/api/pets/reverse-geocode?lat=${item.lat}&lng=${item.lng}`);
          if (!res.ok) continue;
          const data = (await res.json()) as { address?: string };
          const address = typeof data.address === "string" ? data.address.trim() : "";
          if (!address || cancelled) continue;
          setLocationHistory((prev) =>
            prev.map((row) => (row.id === item.id ? { ...row, address } : row)),
          );
        } catch {
          /* noop */
        }
      }
    }

    void fillMissingAddresses();
    return () => {
      cancelled = true;
    };
  }, [locationHistory]);

  useEffect(() => {
    let cancelled = false;

    async function loadLocationHistory() {
      try {
        const res = await fetch("/api/pets/location-history");
        if (!res.ok) return;
        const data = (await res.json()) as { history?: LocationHistoryItem[] };
        if (!cancelled) setLocationHistory(data.history ?? []);
      } catch {
        /* noop */
      }
    }

    loadLocationHistory();
    const interval = setInterval(loadLocationHistory, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentPetLocation() {
      try {
        const res = await fetch("/api/pets/current");
        if (!res.ok) return;
        const data = (await res.json()) as {
          pet?: {
            nfcId?: string | null;
            lastNfcAccessLat?: number | null;
            lastNfcAccessLng?: number | null;
            lastNfcAccessAt?: string | null;
            lastNfcAccessAddress?: string | null;
          };
        };
        if (!cancelled) setIsNfcPaired(Boolean(data.pet?.nfcId?.trim()));
        const lat = data.pet?.lastNfcAccessLat;
        const lng = data.pet?.lastNfcAccessLng;
        if (typeof lat !== "number" || typeof lng !== "number") {
          if (!cancelled) {
            setPetLocation((prev) => ({
              ...prev,
              addressLabel: "Nenhuma localizacao registrada",
              lastUpdateLabel: "Aguardando compartilhamento de localizacao via NFC",
            }));
          }
          return;
        }
        const label = data.pet?.lastNfcAccessAt
          ? `Ultimo acesso NFC: ${formatPtBrDateTime(data.pet.lastNfcAccessAt)}`
          : "Ultimo acesso NFC registrado";
        if (!cancelled) {
          setPetLocation({
            lat,
            lng,
            addressLabel: data.pet?.lastNfcAccessAddress?.trim() || "Endereco ainda nao disponivel",
            lastUpdateLabel: label,
          });
        }
      } catch {
        /* noop */
      }
    }

    loadCurrentPetLocation();
    const interval = setInterval(loadCurrentPetLocation, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function reverseGeocode() {
      try {
        const res = await fetch(`/api/pets/reverse-geocode?lat=${petLocation.lat}&lng=${petLocation.lng}`);
        if (!res.ok) return;
        const data = (await res.json()) as { address?: string };
        const address = typeof data.address === "string" ? data.address.trim() : "";
        if (!address || cancelled) return;
        setPetLocation((prev) => ({ ...prev, addressLabel: address }));
      } catch {
        /* noop */
      }
    }

    reverseGeocode();
    return () => {
      cancelled = true;
    };
  }, [petLocation.lat, petLocation.lng]);

  useEffect(() => {
    let cancelled = false;

    async function loadFinderMessages() {
      try {
        const res = await fetch("/api/pets/finder-messages");
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: FinderMessageItem[] };
        if (!cancelled) setFinderMessages(data.messages ?? []);
      } catch {
        /* noop */
      }
    }

    loadFinderMessages();
    const interval = setInterval(loadFinderMessages, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
    createPortal(
      <div className="fixed inset-0 z-[40] isolate bg-[var(--surface-soft)] touch-manipulation">
        {/* Mapa: Leaflet usa panes ate z-index 700 e controles ate ~1000 — UI fica numa camada acima */}
        <div className="absolute inset-0 z-0 min-h-0">
          <LocationLeafletMap
            lat={petLocation.lat}
            lng={petLocation.lng}
            zoom={17}
            zoomControl={false}
            className="h-full min-h-[100dvh] w-full"
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
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)" }}
          >
            <LocationAddressCard point={petLocation} />
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
    <AppShell tab="location">
      {!mapFullscreen ? (
        <>
          <TopBar title="Localizacao" subtitle="Rastreamento inteligente" />

          <section
            data-lyka-shell-span="full"
            className="appear-up mt-3 overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
            style={{ animationDelay: "80ms" }}
          >
            <div className="relative isolate h-[200px] w-full overflow-hidden md:h-[min(42vh,320px)]">
              <div className="absolute inset-0 z-0 min-h-0">
                <LocationLeafletMap
                  lat={petLocation.lat}
                  lng={petLocation.lng}
                  zoom={16}
                  className="h-full w-full min-h-[200px] md:min-h-[min(42vh,320px)]"
                  onMapClick={() => setMapFullscreen(true)}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 z-[1200]">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" aria-hidden />
                <div className="pointer-events-auto absolute inset-x-3 bottom-3">
                  <LocationAddressCard point={petLocation} />
                </div>
              </div>
            </div>
          </section>

          <div
            data-lyka-shell-span="full"
            className="appear-up grid grid-cols-1 gap-2 md:grid-cols-2 md:items-start md:gap-2"
            style={{ animationDelay: "140ms" }}
          >
            <section className="min-w-0 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-zinc-900">Status da coleira</h3>
                <IconCollar className="h-5 w-5 text-zinc-600" />
              </div>
              <div className="space-y-2 text-[12px] text-zinc-700">
                <p>Distancia atual: {location.distance}</p>
                <p>Bateria: {location.battery}%</p>
                <p>Zona segura principal: {location.safeZone}</p>
              </div>
            </section>

            <section className="min-w-0 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-zinc-900">Dispositivos conectados</h3>
                <IconShield className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="space-y-2">
                {disconnectedDevices.map((device) => {
                  const connected = device.status === "Conectado";
                  const isTagNfc = device.name === "Tag NFC";
                  return (
                    <article
                      key={device.name}
                      className={`rounded-2xl border px-3 py-2.5 ${
                        connected ? "border-zinc-200 bg-zinc-50" : "border-zinc-200/90 bg-zinc-50/80 opacity-95"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[12px] font-medium text-zinc-800">{device.name}</p>
                        <p className="text-[11px] text-zinc-500">{device.battery ?? "—"}</p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className={`text-[11px] ${connected ? "text-emerald-600" : "text-zinc-500"}`}>{device.status}</p>
                        {isTagNfc ? (
                          <Link
                            href="/tag-nfc"
                            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                          >
                            Gerenciar
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <section
            data-lyka-shell-span="full"
            className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
            style={{ animationDelay: "185ms" }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-zinc-900">Mensagens</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                  Quando alguem ler a tag NFC em modo pet perdido, pode enviar um aviso — aparece aqui.
                </p>
              </div>
              <IconMessages className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            </div>

            {finderMessages.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
                Nenhuma mensagem.
              </p>
            ) : (
              <ul className="space-y-2">
                {finderMessages.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50/90 px-3 py-2.5 shadow-[0_8px_20px_-18px_rgba(10,16,13,0.45)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] leading-snug text-zinc-800">{m.body}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                      <time dateTime={m.createdAt}>{m.createdAtLabel}</time>
                      {m.senderLabel ? (
                        <>
                          <span aria-hidden className="text-zinc-300">
                            ·
                          </span>
                          <span>{m.senderLabel}</span>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            data-lyka-shell-span="full"
            className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
            style={{ animationDelay: "200ms" }}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-semibold text-zinc-900">Historico de localizacao</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">Ultimos pontos compartilhados por leitura NFC.</p>
              </div>
              <IconPin className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            </div>

            {locationHistory.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
                Nenhum ponto registrado.
              </p>
            ) : (
              <ul className="space-y-2">
                {locationHistory.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/90 px-3 py-2.5">
                    <p className="text-[12px] font-medium text-zinc-800">{item.address || "Endereco indisponivel"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-500">
                      <time dateTime={item.at}>{item.atLabel}</time>
                      {typeof item.accuracyM === "number" ? (
                        <>
                          <span aria-hidden className="text-zinc-300">
                            ·
                          </span>
                          <span>Precisao {Math.round(item.accuracyM)}m</span>
                        </>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {fullscreenOverlay}
    </AppShell>
  );
}
