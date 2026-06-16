"use client";

import "leaflet/dist/leaflet.css";

import type { DivIcon, LayerGroup, LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { buildPetMapPinHtml, buildPetMapPopupHtml } from "@/lib/map/locus-poi-pin";
import { searchPetMapPoisAround, type PetMapPoi, type PetMapPoiCategory } from "@/lib/map/pet-map-pois";

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
  /** Ajusta o zoom para incluir clínicas/hotéis/creches carregados (padrão Locus: POIs no viewport). */
  fitPoisInView?: boolean;
};

const POI_CATEGORIES: PetMapPoiCategory[] = ["veterinary", "dog_hotel", "dog_daycare"];

function buildPinIcons(L: typeof import("leaflet").default) {
  return Object.fromEntries(
    POI_CATEGORIES.map((category) => [
      category,
      L.divIcon({
        className: "lyka-poi-marker",
        html: buildPetMapPinHtml(category),
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      }),
    ]),
  ) as Partial<Record<PetMapPoiCategory, DivIcon>>;
}

export function VeterinaryClinicsLeafletMap({
  lat,
  lng,
  zoom = 15,
  className,
  zoomControl = true,
  onMapClick,
  ariaLabel = "Mapa de clinicas veterinarias",
  fitPoisInView = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersLayerRef = useRef<LayerGroup | null>(null);
  const pinIconsRef = useRef<Partial<Record<PetMapPoiCategory, DivIcon>>>({});
  const poisRef = useRef<PetMapPoi[]>([]);
  const hasFitBoundsRef = useRef(false);
  const onMapClickRef = useLatest(onMapClick);
  const centerRef = useLatest({ lat, lng, zoom, fitPoisInView });
  const [pois, setPois] = useState<PetMapPoi[]>([]);
  const [mapReady, setMapReady] = useState(false);

  poisRef.current = pois;

  useEffect(() => {
    let cancelled = false;

    async function loadPois() {
      try {
        const results = await searchPetMapPoisAround(lat, lng);
        if (!cancelled) {
          hasFitBoundsRef.current = false;
          setPois(results);
        }
      } catch {
        /* noop */
      }
    }

    void loadPois();

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let invalidateTimer: number | undefined;
    void import("leaflet").then((mod) => {
      const L = mod.default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(container, {
        zoomControl,
        attributionControl: false,
      }).setView([lat, lng], zoom);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      pinIconsRef.current = buildPinIcons(L);

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
      hasFitBoundsRef.current = false;
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      if (markersLayerRef.current) {
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      pinIconsRef.current = {};
    };
  }, [zoomControl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const { lat: centerLat, lng: centerLng, zoom: maxZoom, fitPoisInView: shouldFit } = centerRef.current;

    if (!shouldFit || pois.length === 0) {
      map.setView([centerLat, centerLng], maxZoom, { animate: false });
      return;
    }

    if (hasFitBoundsRef.current) return;

    void import("leaflet").then((mod) => {
      if (!mapRef.current) return;
      const L = mod.default;
      const points: LatLngBoundsExpression = [
        [centerLat, centerLng],
        ...pois.map((poi) => [poi.lat, poi.lng] as [number, number]),
      ];
      const bounds = L.latLngBounds(points).pad(0.14);
      mapRef.current.fitBounds(bounds, {
        maxZoom: Math.min(maxZoom, 15),
        animate: false,
        padding: [18, 18],
      });
      hasFitBoundsRef.current = true;
      requestAnimationFrame(() => mapRef.current?.invalidateSize());
    });
  }, [lat, lng, zoom, pois, mapReady, fitPoisInView]);

  useEffect(() => {
    const map = mapRef.current;
    const icons = pinIconsRef.current;
    if (!map || !mapReady || Object.keys(icons).length === 0) return;

    void import("leaflet").then((mod) => {
      if (!mapRef.current) return;
      const L = mod.default;

      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current.remove();
        markersLayerRef.current = null;
      }

      const group = L.layerGroup();
      const currentPois = poisRef.current;

      for (const poi of currentPois) {
        const icon = icons[poi.category];
        if (!icon) continue;

        const marker = L.marker([poi.lat, poi.lng], { icon, zIndexOffset: 100 });
        marker.bindPopup(buildPetMapPopupHtml(poi), {
          className: "lyka-popup lyka-popup--poi",
          maxWidth: 240,
        });
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
        });
        group.addLayer(marker);
      }

      group.addTo(mapRef.current);
      markersLayerRef.current = group;
    });
  }, [pois, mapReady]);

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
