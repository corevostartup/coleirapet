import { NextResponse } from "next/server";
import { COLLECTION_PETS, SUBCOLLECTION_NFC_ACCESS_LOGS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type Body = {
  publicSlug?: string;
  lat?: number;
  lng?: number;
  accuracyM?: number;
};

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function compactAddressFromNominatim(payload: { address?: Record<string, unknown> }) {
  const address = payload.address ?? {};
  const road = pickFirstText(address.road, address.pedestrian, address.footway, address.path, address.cycleway);
  const number = pickFirstText(address.house_number);
  const suburb = pickFirstText(address.suburb, address.neighbourhood, address.quarter);
  const city = pickFirstText(address.city, address.town, address.village, address.municipality);
  const streetLine = pickFirstText(road && number ? `${road}, ${number}` : "", road);
  return [streetLine, suburb, city].filter(Boolean).join(" · ");
}

async function reverseGeocodeAddress(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Lyka/1.0 (support@lyka.app)",
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { address?: Record<string, unknown>; display_name?: string };
    const compactAddress = compactAddressFromNominatim(payload);
    return compactAddress || null;
  } catch {
    return null;
  }
}

function parseSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!/^[a-z0-9-]{8,64}$/.test(trimmed)) return null;
  return trimmed;
}

function parseLat(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < -90 || value > 90) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function parseLng(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < -180 || value > 180) return null;
  return Math.round(value * 1_000_000) / 1_000_000;
}

function parseAccuracy(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 50000) return null;
  return Math.round(value * 10) / 10;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const publicSlug = parseSlug(body.publicSlug);
  const lat = parseLat(body.lat);
  const lng = parseLng(body.lng);
  const accuracyM = parseAccuracy(body.accuracyM);

  if (!publicSlug || lat === null || lng === null || accuracyM === null) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const db = getFirebaseAdminDb();
  const query = await db.collection(COLLECTION_PETS).where("publicPageSlug", "==", publicSlug).limit(1).get();
  if (query.empty) {
    return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const petRef = query.docs[0].ref;
  const address = await reverseGeocodeAddress(lat, lng);
  const payload = {
    lastNfcAccessAt: nowIso,
    lastNfcAccessLat: lat,
    lastNfcAccessLng: lng,
    ...(address ? { lastNfcAccessAddress: address } : {}),
    ...(accuracyM !== undefined ? { lastNfcAccessAccuracyM: accuracyM } : {}),
    updatedAt: nowIso,
  };
  await petRef.set(payload, { merge: true });
  await petRef.collection(SUBCOLLECTION_NFC_ACCESS_LOGS).add({
    at: nowIso,
    lat,
    lng,
    ...(address ? { address } : {}),
    ...(accuracyM !== undefined ? { accuracyM } : {}),
    source: "public-nfc-page",
  });

  return NextResponse.json({ ok: true, savedAt: nowIso });
}
