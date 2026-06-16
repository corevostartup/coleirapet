import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_ADMIN_LOGS, COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type UserDoc = {
  name?: string;
  email?: string;
};

type CreateAdminLogPayload = {
  action?: string;
  area?: string;
  message?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  metadata?: Record<string, unknown>;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

async function requireAuth() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION_ADMIN_LOGS).orderBy("createdAt", "desc").limit(300).get();
  const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() ?? {}) }));
  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: CreateAdminLogPayload;
  try {
    body = (await request.json()) as CreateAdminLogPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const action = parseText(body.action);
  const area = parseText(body.area, "admin");
  const message = parseText(body.message);
  if (!action || !message) {
    return NextResponse.json({ error: "action e message sao obrigatorios" }, { status: 400 });
  }

  const db = getFirebaseAdminDb();
  const actorSnap = await db.collection(COLLECTION_USER).doc(auth.uid).get();
  const actor = (actorSnap.data() ?? {}) as UserDoc;
  const nowIso = new Date().toISOString();

  const ref = await db.collection(COLLECTION_ADMIN_LOGS).add({
    createdAt: nowIso,
    action,
    area,
    message,
    actorUid: auth.uid,
    actorName: parseText(actor.name, "Administrador"),
    actorEmail: parseText(actor.email),
    targetUserId: parseText(body.targetUserId),
    targetUserName: parseText(body.targetUserName),
    targetUserEmail: parseText(body.targetUserEmail),
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ ok: true, id: ref.id });
}
