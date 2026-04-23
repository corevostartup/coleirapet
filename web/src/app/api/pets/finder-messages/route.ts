import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { SUBCOLLECTION_FINDER_MESSAGES } from "@/lib/firebase/collections";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);

  if (!session || !uid) return null;
  return { session, uid };
}

function formatPtBrShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { petRef } = await getOrCreateCurrentPet(auth.uid);
  const snapshot = await petRef.collection(SUBCOLLECTION_FINDER_MESSAGES).orderBy("createdAt", "desc").limit(40).get();

  const messages = snapshot.docs.map((doc) => {
    const data = doc.data() as { body?: string; senderLabel?: string; createdAt?: string };
    const createdAt = typeof data.createdAt === "string" ? data.createdAt : "";
    return {
      id: doc.id,
      body: typeof data.body === "string" ? data.body : "",
      senderLabel: typeof data.senderLabel === "string" ? data.senderLabel.trim() : "",
      createdAt,
      createdAtLabel: formatPtBrShort(createdAt),
    };
  });

  return NextResponse.json({ messages });
}
