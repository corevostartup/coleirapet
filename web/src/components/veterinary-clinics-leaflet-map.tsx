"use client";

import "leaflet/dist/leaflet.css";

import type { DivIcon, LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { buildVetClinicPinHtml, buildVetClinicPopupHtml } from "@/lib/map/locus-poi-pin";
import { searchVeterinaryClinicsAround, type VeterinaryClinicPoi } from "@/lib/map/veterinary-clinics-poi";

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
  zoomControl?: boolean;
  onMapClick?: () => void;
  ariaLabel?: string;
};

export function VeterinaryClinicsLeafletMap({
  lat,
  lng,
  zoom = 15,
  className,
  zoomControl = true,
  onMapClick,
  ariaLabel = "Mapa de clinicas veterinarias",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const clinicIconRef = useRef<DivIcon | null>(null);
  const onMapClickRef = useLatest(onMapClick);
  const [clinics, setClinics] = useState<VeterinaryClinicPoi[]>([]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void searchVeterinaryClinicsAround(lat, lng, { signal: controller.signal }).then((items) => {
      if (!cancelled) setClinics(items);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lng]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let invalidateTimer: number | undefined;

    void import("leaflet").then((leafletModule) => {
      const L = leafletModule.default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(container, {
        zoomControl,
        attributionControl: false,
      }).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      clinicIconRef.current = L.divIcon({
        className: "lyka-poi-marker",
        html: buildVetClinicPinHtml(),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      map.on("click", () => {
        onMapClickRef.current?.();
      });

      mapRef.current = map;
      setMapReady(true);

      requestAnimationFrame(() => map.invalidateSize());
      invalidateTimer = window.setTimeout(() => map.invalidateSize(), 280);
    });

    return () => {
      cancelled = true;
      setMapReady(false);
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      if (markersLayerRef.current) {
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      clinicIconRef.current = null;
    };
  }, [zoomControl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([lat, lng], zoom, { animate: false });
  }, [lat, lng, zoom]);

  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    const icon = clinicIconRef.current;
    if (!map || !icon) return;

    void import("leaflet").then((leafletModule) => {
      const L = leafletModule.default;

      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current.remove();
      }

      const group = L.layerGroup();

      for (const clinic of clinics) {
        const marker = L.marker([clinic.lat, clinic.lng], { icon, zIndexOffset: -200 });
        marker.bindPopup(buildVetClinicPopupHtml(clinic), {
          className: "lyka-popup lyka-popup--poi",
          maxWidth: 240,
        });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
        });
        group.addLayer(marker);
      }

      group.addTo(map);
      markersLayerRef.current = group;
    });
  }, [clinics, mapReady]);

  return (
    <div
      ref={containerRef}
      className={`leaflet-map-app-theme ${className ?? ""}`.trim()}
      role="application"
      aria-label={ariaLabel}
      style={{ height: "100%", width: "100%", minHeight: "160px" }}
    />
  );
}
