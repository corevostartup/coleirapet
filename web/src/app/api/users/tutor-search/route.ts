import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { normalizeNameForSearch } from "@/lib/users/current";

type UserDoc = {
  userId?: string;
  UserID?: string;
  uid?: string;
  name?: string;
  email?: string;
  tutorCode?: string;
  searchName?: string;
  photoURL?: string;
  userPhotoUrl?: string;
  picture?: string;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parsePhotoUrl(...values: unknown[]) {
  for (const value of values) {
    const url = parseText(value);
    if (!url) continue;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  }
  return "";
}

function parseTutorCode(value: unknown) {
  const normalized = parseText(value).toUpperCase();
  if (!/^LYK-[A-Z0-9]{6}$/.test(normalized)) return "";
  return normalized;
}

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

function mapUser(docId: string, data: UserDoc) {
  return {
    uid: parseText(data.uid) || parseText(data.userId) || parseText(data.UserID) || docId,
    name: parseText(data.name, "Tutor sem nome"),
    tutorCode: parseTutorCode(data.tutorCode),
    photoUrl: parsePhotoUrl(data.photoURL, data.userPhotoUrl, data.picture),
  };
}

export async function GET(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const query = parseText(url.searchParams.get("q"));
  if (query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const db = getFirebaseAdminDb();
  const maybeCode = parseTutorCode(query);

  const docs = new Map<string, UserDoc>();
  if (maybeCode) {
    const byCode = await db.collection(COLLECTION_USER).where("tutorCode", "==", maybeCode).limit(6).get();
    for (const doc of byCode.docs) docs.set(doc.id, (doc.data() ?? {}) as UserDoc);
  }

  const normalizedSearch = normalizeNameForSearch(query);
  if (normalizedSearch) {
    const byName = await db
      .collection(COLLECTION_USER)
      .orderBy("searchName")
      .startAt(normalizedSearch)
      .endAt(`${normalizedSearch}\uf8ff`)
      .limit(20)
      .get();
    for (const doc of byName.docs) docs.set(doc.id, (doc.data() ?? {}) as UserDoc);
  }

  const users = Array.from(docs.entries())
    .map(([docId, data]) => mapUser(docId, data))
    .filter((user) => user.uid && user.uid !== auth.uid)
    .slice(0, 20);

  return NextResponse.json({ users });
}
