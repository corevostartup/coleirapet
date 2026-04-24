import { NextResponse } from "next/server";
import { COLLECTION_PETS, SUBCOLLECTION_NFC_ACCESS_LOGS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type Body = {
  publicSlug?: string;
  lat?: number;
  lng?: number;
  accuracyM?: number;
};

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
  const payload = {
    lastNfcAccessAt: nowIso,
    lastNfcAccessLat: lat,
    lastNfcAccessLng: lng,
    ...(accuracyM !== undefined ? { lastNfcAccessAccuracyM: accuracyM } : {}),
    updatedAt: nowIso,
  };
  await petRef.set(payload, { merge: true });
  await petRef.collection(SUBCOLLECTION_NFC_ACCESS_LOGS).add({
    at: nowIso,
    lat,
    lng,
    ...(accuracyM !== undefined ? { accuracyM } : {}),
    source: "public-nfc-page",
  });

  return NextResponse.json({ ok: true, savedAt: nowIso });
}
