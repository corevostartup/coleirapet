import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

type PairPayload = {
  nfcId?: string;
};

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

function parseNfcId(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return "";
  if (!/^[A-Z0-9_-]{4,64}$/.test(trimmed)) return "";
  return trimmed;
}

function generateNfcId() {
  return `NFC-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

async function ensureUniqueNfcId(db: FirebaseFirestore.Firestore, petId: string, candidate: string) {
  const duplicated = await db.collection(COLLECTION_PETS).where("nfcId", "==", candidate).limit(1).get();
  if (duplicated.empty) return true;
  return duplicated.docs[0]?.id === petId;
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: PairPayload = {};
  try {
    body = (await request.json()) as PairPayload;
  } catch {
    body = {};
  }

  const db = getFirebaseAdminDb();
  const { petRef, pet } = await getOrCreateCurrentPet(auth.uid);
  const preferredNfcId = parseNfcId(body.nfcId);

  let chosenNfcId = "";
  if (preferredNfcId) {
    const ok = await ensureUniqueNfcId(db, pet.id, preferredNfcId);
    if (!ok) return NextResponse.json({ error: "nfcId ja vinculado a outro pet" }, { status: 409 });
    chosenNfcId = preferredNfcId;
  } else {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateNfcId();
      const ok = await ensureUniqueNfcId(db, pet.id, candidate);
      if (ok) {
        chosenNfcId = candidate;
        break;
      }
    }
    if (!chosenNfcId) return NextResponse.json({ error: "Falha ao gerar nfcId unico" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  await petRef.set({ nfcId: chosenNfcId, nfcPairedAt: nowIso, updatedAt: nowIso }, { merge: true });

  return NextResponse.json({ ok: true, nfcId: chosenNfcId, nfcPairedAt: nowIso });
}

