const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export type VeterinaryClinicPoi = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
};

function boundsAround(lat: number, lng: number, radiusKm = 2.2) {
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

function buildQuery(b: ReturnType<typeof boundsAround>, limit: number) {
  const bbox = `${b.south},${b.west},${b.north},${b.east}`;
  return `[out:json][timeout:25];(node["amenity"="veterinary"](${bbox});way["amenity"="veterinary"](${bbox}););out center ${limit};`;
}

async function fetchOverpass(query: string, signal?: AbortSignal) {
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { elements?: unknown[] };
      if (Array.isArray(data.elements)) return data.elements;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
    }
  }
  return [];
}

type OverpassElement = {
  id?: number | string;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

function elementToClinic(el: OverpassElement, index: number): VeterinaryClinicPoi | null {
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const tags = el.tags ?? {};
  const title = tags.name || tags["name:pt"] || "Clinica veterinaria";
  const street = tags["addr:street"] || "";
  const number = tags["addr:housenumber"] || "";
  const suburb = tags["addr:suburb"] || tags["addr:neighbourhood"] || "";
  const address = [street, number].filter(Boolean).join(", ") || suburb;

  return {
    id: String(el.id ?? `${lat},${lng},${index}`),
    title,
    address,
    lat,
    lng,
  };
}

/** Busca clinicas veterinarias (OSM amenity=veterinary) ao redor de um ponto. */
export async function searchVeterinaryClinicsAround(
  lat: number,
  lng: number,
  options?: { radiusKm?: number; limit?: number; signal?: AbortSignal },
): Promise<VeterinaryClinicPoi[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 80);
  const b = boundsAround(lat, lng, options?.radiusKm ?? 2.2);
  const query = buildQuery(b, limit);

  try {
    const elements = (await fetchOverpass(query, options?.signal)) as OverpassElement[];
    const seen = new Set<string>();
    const items: VeterinaryClinicPoi[] = [];

    for (let i = 0; i < elements.length; i++) {
      const item = elementToClinic(elements[i], i);
      if (!item) continue;
      const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
      if (items.length >= limit) break;
    }

    return items;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return [];
  }
}
