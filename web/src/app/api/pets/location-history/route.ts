import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { SUBCOLLECTION_NFC_ACCESS_LOGS } from "@/lib/firebase/collections";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

function formatPtBrShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { petRef } = await getOrCreateCurrentPet(auth.uid);
  const snapshot = await petRef.collection(SUBCOLLECTION_NFC_ACCESS_LOGS).orderBy("at", "desc").limit(30).get();

  const history = snapshot.docs.map((doc) => {
    const data = doc.data() as {
      at?: string;
      lat?: number;
      lng?: number;
      accuracyM?: number;
      source?: string;
    };
    const at = typeof data.at === "string" ? data.at : "";
    return {
      id: doc.id,
      at,
      atLabel: formatPtBrShort(at),
      lat: typeof data.lat === "number" ? data.lat : null,
      lng: typeof data.lng === "number" ? data.lng : null,
      accuracyM: typeof data.accuracyM === "number" ? data.accuracyM : null,
      source: typeof data.source === "string" ? data.source : "",
    };
  });

  return NextResponse.json({ history });
}
