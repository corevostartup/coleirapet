import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { COLLECTION_PETS, SUBCOLLECTION_FINDER_MESSAGES } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type Body = {
  petId?: string;
  token?: string;
  message?: string;
  senderLabel?: string;
};

function parsePetId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || t.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(t)) return null;
  return t;
}

function parseToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t || t.length > 128) return null;
  return t;
}

function parseMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  if (t.length > 600) return null;
  return t;
}

function parseSenderLabel(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const t = value.trim().slice(0, 80);
  return t || undefined;
}

function tokensEqual(stored: string, given: string) {
  try {
    const a = Buffer.from(stored, "utf8");
    const b = Buffer.from(given, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = parsePetId(body.petId);
  const token = parseToken(body.token);
  const message = parseMessage(body.message);
  const senderLabel = parseSenderLabel(body.senderLabel);

  if (!petId || !token || !message) {
    return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
  }

  const db = getFirebaseAdminDb();
  const petRef = db.collection(COLLECTION_PETS).doc(petId);
  const petSnap = await petRef.get();
  if (!petSnap.exists) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const stored =
    typeof (petSnap.data() as { finderShareToken?: string })?.finderShareToken === "string"
      ? (petSnap.data() as { finderShareToken: string }).finderShareToken.trim()
      : "";

  if (!stored || !tokensEqual(stored, token)) {
    return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();
  const ref = await petRef.collection(SUBCOLLECTION_FINDER_MESSAGES).add({
    body: message,
    ...(senderLabel ? { senderLabel } : {}),
    createdAt: nowIso,
  });

  return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
}
