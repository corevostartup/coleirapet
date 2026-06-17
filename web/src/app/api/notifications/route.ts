import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS, COLLECTION_USER, SUBCOLLECTION_PET_MEMBERS, SUBCOLLECTION_USER_NOTIFICATIONS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getPetAccessById } from "@/lib/pets/access";

type NotificationDoc = {
  type?: string;
  title?: string;
  body?: string;
  status?: string;
  unread?: boolean;
  createdAt?: string;
  readAt?: string;
  respondedAt?: string;
  petId?: string;
  petName?: string;
  inviterUid?: string;
  inviterName?: string;
  targetUid?: string;
};

type RespondPayload = {
  notificationId?: string;
  action?: "accept" | "cancel" | "mark_read";
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

function mapNotification(id: string, data: NotificationDoc) {
  const createdAt = parseText(data.createdAt);
  return {
    id,
    type: parseText(data.type, "info"),
    title: parseText(data.title, "Notificacao"),
    body: parseText(data.body),
    status: parseText(data.status, "info"),
    unread: data.unread === true,
    createdAt,
    when: createdAt ? new Date(createdAt).toLocaleString("pt-BR") : "Agora",
    petId: parseText(data.petId),
    petName: parseText(data.petName),
    inviterUid: parseText(data.inviterUid),
    inviterName: parseText(data.inviterName),
    targetUid: parseText(data.targetUid),
  };
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection(COLLECTION_USER)
    .doc(auth.uid)
    .collection(SUBCOLLECTION_USER_NOTIFICATIONS)
    .orderBy("createdAt", "desc")
    .limit(120)
    .get();

  const notifications = snapshot.docs.map((doc) => mapNotification(doc.id, (doc.data() ?? {}) as NotificationDoc));
  const unreadCount = notifications.filter((item) => item.unread).length;
  return NextResponse.json({ notifications, unreadCount });
}

export async function POST() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const db = getFirebaseAdminDb();
  const snapshot = await db
    .collection(COLLECTION_USER)
    .doc(auth.uid)
    .collection(SUBCOLLECTION_USER_NOTIFICATIONS)
    .where("unread", "==", true)
    .limit(200)
    .get();
  if (!snapshot.empty) {
    const batch = db.batch();
    const nowIso = new Date().toISOString();
    for (const doc of snapshot.docs) {
      batch.set(doc.ref, { unread: false, readAt: nowIso }, { merge: true });
    }
    await batch.commit();
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: RespondPayload;
  try {
    body = (await request.json()) as RespondPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const notificationId = parseText(body.notificationId);
  const action = body.action;
  if (!notificationId) return NextResponse.json({ error: "notificationId obrigatorio" }, { status: 400 });
  if (!action) return NextResponse.json({ error: "action obrigatoria" }, { status: 400 });

  const db = getFirebaseAdminDb();
  const notificationRef = db
    .collection(COLLECTION_USER)
    .doc(auth.uid)
    .collection(SUBCOLLECTION_USER_NOTIFICATIONS)
    .doc(notificationId);
  const notificationSnap = await notificationRef.get();
  if (!notificationSnap.exists) return NextResponse.json({ error: "Notificacao nao encontrada" }, { status: 404 });

  const data = (notificationSnap.data() ?? {}) as NotificationDoc;
  const nowIso = new Date().toISOString();

  if (action === "mark_read") {
    await notificationRef.set({ unread: false, readAt: nowIso }, { merge: true });
    return NextResponse.json({ ok: true });
  }

  if (parseText(data.type) !== "secondary_tutor_invite" || parseText(data.status) !== "pending") {
    return NextResponse.json({ error: "Notificacao nao aceita resposta." }, { status: 409 });
  }

  const petId = parseText(data.petId);
  const targetUid = parseText(data.targetUid);
  if (!petId || !targetUid || targetUid !== auth.uid) {
    return NextResponse.json({ error: "Convite invalido." }, { status: 400 });
  }

  const petRef = db.collection(COLLECTION_PETS).doc(petId);
  const memberRef = petRef.collection(SUBCOLLECTION_PET_MEMBERS).doc(auth.uid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    await notificationRef.set({ status: "cancelled", unread: false, respondedAt: nowIso, readAt: nowIso }, { merge: true });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  if (action === "cancel") {
    await memberRef.delete();
    await notificationRef.set({ status: "cancelled", unread: false, respondedAt: nowIso, readAt: nowIso }, { merge: true });
    return NextResponse.json({ ok: true, status: "cancelled" });
  }

  const petAccess = await getPetAccessById(auth.uid, petId);
  if (petAccess) {
    await notificationRef.set({ status: "accepted", unread: false, respondedAt: nowIso, readAt: nowIso }, { merge: true });
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  const memberStatus = parseText(memberSnap.data()?.status).toLowerCase();
  if (memberStatus !== "pending") {
    await notificationRef.set({ status: "accepted", unread: false, respondedAt: nowIso, readAt: nowIso }, { merge: true });
    return NextResponse.json({ ok: true, status: "accepted" });
  }

  await memberRef.set({ status: "active", updatedAt: nowIso }, { merge: true });
  const userRef = db.collection(COLLECTION_USER).doc(auth.uid);
  const userSnap = await userRef.get();
  const defaultPetId = parseText(userSnap.data()?.defaultPetId);
  if (!defaultPetId) {
    await userRef.set({ defaultPetId: petId }, { merge: true });
  }

  await notificationRef.set({ status: "accepted", unread: false, respondedAt: nowIso, readAt: nowIso }, { merge: true });
  return NextResponse.json({ ok: true, status: "accepted" });
}
