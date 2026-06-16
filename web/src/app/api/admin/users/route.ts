import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_ADMIN_LOGS, COLLECTION_PETS, COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

type UserType = "Tutor" | "vet";
type UserPlan = "free" | "pro";
type UserStatus = "ativo" | "inativo";

type AdminUserItem = {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  plan: UserPlan;
  userType: UserType;
  status: UserStatus;
  joinedAt: string;
};

type UserDoc = {
  userId?: string;
  UserID?: string;
  uid?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  userPhotoUrl?: string;
  picture?: string;
  userType?: string;
  plan?: string;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string;
};

type UpdatePlanPayload = {
  userId?: string;
  plan?: UserPlan;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseUserType(value: unknown): UserType {
  if (typeof value !== "string") return "Tutor";
  return value.trim().toLowerCase() === "vet" ? "vet" : "Tutor";
}

function parseUserPlan(value: unknown): UserPlan {
  if (typeof value !== "string") return "free";
  return value.trim().toLowerCase() === "pro" ? "pro" : "free";
}

function parseIsoDate(value: unknown) {
  const raw = parseText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function parsePhotoUrl(...values: unknown[]) {
  for (const value of values) {
    const url = parseText(value);
    if (!url) continue;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
  }
  return "";
}

function toAdminUserItem(docId: string, data: UserDoc): AdminUserItem {
  const id = parseText(data.userId) || parseText(data.UserID) || parseText(data.uid) || docId;
  const name = parseText(data.name) || "Sem nome";
  const email = parseText(data.email) || "Sem email";
  const createdAt = parseIsoDate(data.createdAt) || parseIsoDate(data.CreatedAt) || "";
  const updatedAt = parseIsoDate(data.updatedAt);
  const status: UserStatus = updatedAt ? "ativo" : "inativo";

  return {
    id,
    name,
    email,
    photoUrl: parsePhotoUrl(data.photoURL, data.userPhotoUrl, data.picture),
    plan: parseUserPlan(data.plan),
    userType: parseUserType(data.userType),
    status,
    joinedAt: createdAt || "Sem data",
  };
}

async function requireAuth() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

async function resolveUserDocRef(userId: string) {
  const db = getFirebaseAdminDb();
  const directRef = db.collection(COLLECTION_USER).doc(userId);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directRef;

  const byUserId = await db.collection(COLLECTION_USER).where("userId", "==", userId).limit(1).get();
  if (!byUserId.empty) return byUserId.docs[0].ref;

  const byLegacyUserId = await db.collection(COLLECTION_USER).where("UserID", "==", userId).limit(1).get();
  if (!byLegacyUserId.empty) return byLegacyUserId.docs[0].ref;

  const byUid = await db.collection(COLLECTION_USER).where("uid", "==", userId).limit(1).get();
  if (!byUid.empty) return byUid.docs[0].ref;

  return null;
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION_USER).orderBy("createdAt", "desc").limit(500).get();
  const users = snapshot.docs.map((doc) => toAdminUserItem(doc.id, (doc.data() ?? {}) as UserDoc));
  const totalPets = await getTotalPetsCount(db);

  return NextResponse.json({ users, totalPets });
}

async function getTotalPetsCount(db: ReturnType<typeof getFirebaseAdminDb>) {
  try {
    const aggregate = await db.collection(COLLECTION_PETS).count().get();
    return aggregate.data().count;
  } catch {
    const fallback = await db.collection(COLLECTION_PETS).get();
    return fallback.size;
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: UpdatePlanPayload;
  try {
    body = (await request.json()) as UpdatePlanPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const userId = parseText(body.userId);
  const nextPlan = parseUserPlan(body.plan);
  if (!userId) return NextResponse.json({ error: "userId obrigatorio" }, { status: 400 });
  if (!body.plan || (body.plan !== "free" && body.plan !== "pro")) {
    return NextResponse.json({ error: "Plano invalido" }, { status: 400 });
  }

  const db = getFirebaseAdminDb();
  const targetRef = await resolveUserDocRef(userId);
  if (!targetRef) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });

  const beforeSnap = await targetRef.get();
  if (!beforeSnap.exists) return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
  const beforeData = (beforeSnap.data() ?? {}) as UserDoc;
  const previousPlan = parseUserPlan(beforeData.plan);
  const nowIso = new Date().toISOString();

  await targetRef.set({ plan: nextPlan, updatedAt: nowIso }, { merge: true });

  const actorSnap = await db.collection(COLLECTION_USER).doc(auth.uid).get();
  const actorData = (actorSnap.data() ?? {}) as UserDoc;

  await db.collection(COLLECTION_ADMIN_LOGS).add({
    createdAt: nowIso,
    action: "subscription_changed",
    area: "admin_users",
    message: `Troca de assinatura para ${nextPlan}`,
    actorUid: auth.uid,
    actorName: parseText(actorData.name, "Administrador"),
    actorEmail: parseText(actorData.email),
    targetUserId: userId,
    targetUserName: parseText(beforeData.name, "Sem nome"),
    targetUserEmail: parseText(beforeData.email),
    metadata: {
      previousPlan,
      nextPlan,
    },
  });

  const afterSnap = await targetRef.get();
  const updated = toAdminUserItem(afterSnap.id, (afterSnap.data() ?? {}) as UserDoc);
  return NextResponse.json({ ok: true, user: updated });
}
