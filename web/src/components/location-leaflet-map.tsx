"use client";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

type Props = {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
  /** Disparado ao clicar no mapa (ex.: abrir modo expandido). Drag/pinar não dispara como clique único. */
  onMapClick?: () => void;
};

/**
 * Mapa Leaflet com tema alinhado ao app (tiles Carto Light + CSS em globals).
 * @see https://leafletjs.com/
 */
export function LocationLeafletMap({ lat, lng, zoom = 15, className, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const onMapClickRef = useLatest(onMapClick);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let invalidateTimer: number | undefined;

    void import("leaflet").then((leafletModule) => {
      const L = leafletModule.default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(container, {
        zoomControl: true,
        attributionControl: false,
      }).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "leaflet-app-marker",
        html: '<span class="leaflet-app-marker-dot" aria-hidden="true"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 22],
        popupAnchor: [0, -20],
      });

      L.marker([lat, lng], { icon: pinIcon }).addTo(map).bindPopup("Local aproximado da coleira");

      if (cancelled) {
        map.remove();
        return;
      }

      map.on("click", () => {
        onMapClickRef.current?.();
      });

      mapRef.current = map;

      requestAnimationFrame(() => map.invalidateSize());
      invalidateTimer = window.setTimeout(() => map.invalidateSize(), 280);
    });

    return () => {
      cancelled = true;
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, zoom]);

  return (
    <div
      ref={containerRef}
      className={`leaflet-map-app-theme ${className ?? ""}`.trim()}
      role="application"
      aria-label="Mapa interativo da localizacao"
      style={{ height: "100%", width: "100%", minHeight: "160px" }}
    />
  );
}
