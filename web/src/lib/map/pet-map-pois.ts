const PHOTON_ENDPOINT = "https://photon.komoot.io/api/";
const PHOTON_USER_AGENT = "LykaPetApp/1.0 (pet-map; +https://lyka.app)";
const PHOTON_TIMEOUT_MS = 12_000;

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const OVERPASS_USER_AGENT = PHOTON_USER_AGENT;
const OVERPASS_TIMEOUT_MS = 15_000;

const POI_CACHE_TTL_MS = 10 * 60 * 1000;

export type PetMapPoiCategory = "veterinary" | "dog_hotel" | "dog_daycare";

export type PetMapPoi = {
  id: string;
  category: PetMapPoiCategory;
  title: string;
  address: string;
  lat: number;
  lng: number;
};

type PoiCacheEntry = { at: number; pois: PetMapPoi[] };
const poiCache = new Map<string, PoiCacheEntry>();

type Bounds = { south: number; north: number; west: number; east: number };

type PhotonFeature = {
  properties?: {
    osm_type?: string;
    osm_id?: number | string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    locality?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

const PHOTON_SEARCHES: Array<{ q: string; osm_tag?: string }> = [
  { q: "veterinaria", osm_tag: "amenity:veterinary" },
  { q: "clinica veterinaria", osm_tag: "amenity:veterinary" },
  { q: "pet hotel", osm_tag: "amenity:animal_boarding" },
  { q: "hotel pet" },
  { q: "hospedagem pet" },
  { q: "creche pet" },
  { q: "creche cachorro" },
];

function boundsAround(lat: number, lng: number, radiusKm = 5): Bounds {
  const dLat = radiusKm / 111;
  const cos = Math.cos((lat * Math.PI) / 180);
  const dLng = radiusKm / (111 * Math.max(cos, 0.2));
  return {
    south: lat - dLat,
    north: lat + dLat,
    west: lng - dLng,
    east: lng + dLng,
  };
}

function photonBbox(b: Bounds) {
  return `${b.west},${b.south},${b.east},${b.north}`;
}

function cacheKey(lat: number, lng: number, radiusKm: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)},${radiusKm}`;
}

function readCache(key: string): PetMapPoi[] | null {
  const hit = poiCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > POI_CACHE_TTL_MS) {
    poiCache.delete(key);
    return null;
  }
  return hit.pois;
}

function writeCache(key: string, pois: PetMapPoi[]) {
  poiCache.set(key, { at: Date.now(), pois });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLng = (lng2 - lng1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isAbortError(err: unknown) {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

const HOTEL_NAME_RE = /hotel|hospedagem|boarding|hostel/i;
const VET_NAME_RE = /vet|veterin|cl[ií]nica|clinica|pet\s?shop/i;

function classifyCategory(tags: Record<string, string>): PetMapPoiCategory | null {
  const amenity = tags.amenity ?? "";
  const healthcare = tags.healthcare ?? "";
  const shop = tags.shop ?? "";
  const boarding = (tags.boarding ?? "").toLowerCase();
  const name = (tags.name || tags["name:pt"] || "").toLowerCase();

  if (amenity === "veterinary" || healthcare === "veterinary") return "veterinary";

  if (amenity === "animal_boarding") {
    if (boarding === "day" || /creche|day\s?care|daycare|di[aá]ria/i.test(name)) {
      return "dog_daycare";
    }
    return "dog_hotel";
  }

  if (shop === "pet_grooming") {
    if (/creche|day\s?care|daycare|di[aá]ria/i.test(name)) return "dog_daycare";
    return null;
  }

  if (/creche|day\s?care|daycare|di[aá]ria/i.test(name)) return "dog_daycare";
  if (HOTEL_NAME_RE.test(name) && /pet|cachorro|dog|animal/i.test(name)) return "dog_hotel";
  if (VET_NAME_RE.test(name)) return "veterinary";

  return null;
}

function defaultTitle(category: PetMapPoiCategory) {
  if (category === "veterinary") return "Clinica veterinaria";
  if (category === "dog_hotel") return "Hotel para cachorros";
  return "Creche para cachorros";
}

function buildAddress(props: NonNullable<PhotonFeature["properties"]>) {
  const streetLine = [props.street, props.housenumber].filter(Boolean).join(", ");
  return streetLine || props.district || props.locality || props.city || "";
}

function photonFeatureToPoi(feature: PhotonFeature, index: number): PetMapPoi | null {
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const [lng, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const props = feature.properties ?? {};
  const tags: Record<string, string> = {};
  if (props.osm_key && props.osm_value) tags[props.osm_key] = props.osm_value;
  if (props.name) tags.name = props.name;

  const category = classifyCategory(tags);
  if (!category) return null;

  const title = props.name?.trim() || defaultTitle(category);
  const osmId = props.osm_id ?? `${lat},${lng}`;

  return {
    id: `${category}-photon-${props.osm_type ?? "x"}-${osmId}-${index}`,
    category,
    title,
    address: buildAddress(props),
    lat,
    lng,
  };
}

async function fetchPhotonSearch(
  lat: number,
  lng: number,
  b: Bounds,
  search: { q: string; osm_tag?: string },
) {
  const params = new URLSearchParams({
    q: search.q,
    lat: String(lat),
    lon: String(lng),
    limit: "25",
    location_bias_scale: "0.2",
    bbox: photonBbox(b),
  });
  if (search.osm_tag) params.set("osm_tag", search.osm_tag);

  const res = await fetch(`${PHOTON_ENDPOINT}?${params.toString()}`, {
    headers: { "User-Agent": PHOTON_USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS),
  });
  if (!res.ok) return [] as PhotonFeature[];

  const data = (await res.json()) as { features?: PhotonFeature[] };
  return Array.isArray(data.features) ? data.features : [];
}

async function fetchPhotonPois(lat: number, lng: number, b: Bounds, radiusKm: number) {
  const batches = await Promise.all(
    PHOTON_SEARCHES.map((search) => fetchPhotonSearch(lat, lng, b, search)),
  );

  const seen = new Set<string>();
  const items: PetMapPoi[] = [];
  let index = 0;

  for (const features of batches) {
    for (const feature of features) {
      const poi = photonFeatureToPoi(feature, index++);
      if (!poi) continue;
      if (haversineKm(lat, lng, poi.lat, poi.lng) > radiusKm) continue;

      const dedupeKey = `${poi.category}:${poi.lat.toFixed(5)},${poi.lng.toFixed(5)}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      items.push(poi);
    }
  }

  return items;
}

function buildOverpassAroundQuery(lat: number, lng: number, radiusM: number, limit: number) {
  const around = `around:${radiusM},${lat},${lng}`;
  return `[out:json][timeout:12];(
    node["amenity"="veterinary"](${around});
    node["healthcare"="veterinary"](${around});
    node["amenity"="animal_boarding"](${around});
    node["shop"="pet_grooming"](${around});
  );out body ${limit};`;
}

type OverpassElement = {
  id?: number | string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

function overpassElementToPoi(el: OverpassElement, index: number): PetMapPoi | null {
  const lat = el.lat;
  const lng = el.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const tags = el.tags ?? {};
  const category = classifyCategory(tags);
  if (!category) return null;

  const title = tags.name || tags["name:pt"] || defaultTitle(category);
  const street = tags["addr:street"] || "";
  const number = tags["addr:housenumber"] || "";
  const suburb = tags["addr:suburb"] || tags["addr:neighbourhood"] || "";
  const address = [street, number].filter(Boolean).join(", ") || suburb;

  return {
    id: `${category}-osm-${el.id ?? `${lat},${lng},${index}`}`,
    category,
    title,
    address,
    lat,
    lng,
  };
}

async function fetchOverpassFallback(
  lat: number,
  lng: number,
  radiusKm: number,
  limit: number,
): Promise<PetMapPoi[]> {
  const query = buildOverpassAroundQuery(lat, lng, Math.round(radiusKm * 1000), limit);

  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": OVERPASS_USER_AGENT,
          Accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as { elements?: OverpassElement[] };
      if (!Array.isArray(data.elements)) continue;

      const seen = new Set<string>();
      const items: PetMapPoi[] = [];

      for (let i = 0; i < data.elements.length; i++) {
        const item = overpassElementToPoi(data.elements[i], i);
        if (!item) continue;
        const dedupeKey = `${item.category}:${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        items.push(item);
        if (items.length >= limit) break;
      }

      return items;
    } catch (err) {
      if (isAbortError(err)) continue;
    }
  }

  return [];
}

function mergePois(primary: PetMapPoi[], extra: PetMapPoi[], limit: number) {
  const seen = new Set(primary.map((p) => `${p.category}:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`));
  const merged = [...primary];

  for (const item of extra) {
    const key = `${item.category}:${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }

  return merged;
}

/** Busca clinicas, hoteis e creches para cachorros ao redor de um ponto. */
export async function searchPetMapPoisAround(
  lat: number,
  lng: number,
  options?: { radiusKm?: number; limit?: number },
): Promise<PetMapPoi[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const radiusKm = options?.radiusKm ?? 5;
  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 120);
  const key = cacheKey(lat, lng, radiusKm);
  const cached = readCache(key);
  if (cached) return cached;

  const bounds = boundsAround(lat, lng, radiusKm);

  try {
    let items = await fetchPhotonPois(lat, lng, bounds, radiusKm);

    if (items.length < 3) {
      const fallback = await fetchOverpassFallback(lat, lng, radiusKm, limit);
      items = mergePois(items, fallback, limit);
    }

    items = items.slice(0, limit);
    writeCache(key, items);
    return items;
  } catch {
    return [];
  }
}
