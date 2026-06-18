import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_USER, SUBCOLLECTION_PET_MEMBERS, SUBCOLLECTION_USER_NOTIFICATIONS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getPetAccessById } from "@/lib/pets/access";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

type UserDoc = {
  uid?: string;
  userId?: string;
  UserID?: string;
  name?: string;
  email?: string;
  tutorCode?: string;
  photoURL?: string;
  userPhotoUrl?: string;
  picture?: string;
};

type MemberDoc = {
  uid?: string;
  role?: string;
  status?: string;
  permissions?: {
    editBasicData?: boolean;
    deletePet?: boolean;
    pairNfc?: boolean;
  };
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PetDoc = {
  ownerId?: string;
  name?: string;
};

type CreateMemberPayload = {
  petId?: string;
  targetUserId?: string;
  targetTutorCode?: string;
};

type RemoveMemberPayload = {
  petId?: string;
  targetUserId?: string;
};

function parseText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function parseTutorCode(value: unknown) {
  const normalized = parseText(value).toUpperCase();
  if (!/^LYK-[A-Z0-9]{6}$/.test(normalized)) return "";
  return normalized;
}

function parsePhotoUrl(...values: unknown[]) {
  for (const value of values) {
    const url = parseText(value);
    if (!url) continue;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  }
  return "";
}

function mapUser(uid: string, data: UserDoc) {
  return {
    uid,
    name: parseText(data.name, "Tutor sem nome"),
    email: parseText(data.email, "Sem email"),
    tutorCode: parseTutorCode(data.tutorCode),
    photoUrl: parsePhotoUrl(data.photoURL, data.userPhotoUrl, data.picture),
  };
}

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

async function resolveUserDocByIdOrAlias(userId: string) {
  const normalized = parseText(userId);
  if (!normalized) return null;
  const db = getFirebaseAdminDb();

  const directRef = db.collection(COLLECTION_USER).doc(normalized);
  const directSnap = await directRef.get();
  if (directSnap.exists) return directSnap;

  const byUserId = await db.collection(COLLECTION_USER).where("userId", "==", normalized).limit(1).get();
  if (!byUserId.empty) return byUserId.docs[0];

  const byLegacyId = await db.collection(COLLECTION_USER).where("UserID", "==", normalized).limit(1).get();
  if (!byLegacyId.empty) return byLegacyId.docs[0];

  const byUid = await db.collection(COLLECTION_USER).where("uid", "==", normalized).limit(1).get();
  if (!byUid.empty) return byUid.docs[0];

  return null;
}

async function resolveUserDocByTutorCode(tutorCode: string) {
  const normalized = parseTutorCode(tutorCode);
  if (!normalized) return null;
  const db = getFirebaseAdminDb();
  const byCode = await db.collection(COLLECTION_USER).where("tutorCode", "==", normalized).limit(1).get();
  if (byCode.empty) return null;
  return byCode.docs[0];
}

async function fetchMemberUsers(uidList: string[]) {
  const db = getFirebaseAdminDb();
  const unique = Array.from(new Set(uidList.map((uid) => parseText(uid)).filter(Boolean)));
  const out = new Map<string, ReturnType<typeof mapUser>>();
  await Promise.all(
    unique.map(async (uid) => {
      const doc = await resolveUserDocByIdOrAlias(uid);
      if (!doc) return;
      const data = (doc.data() ?? {}) as UserDoc;
      const canonicalUid = parseText(data.uid) || parseText(data.userId) || parseText(data.UserID) || doc.id;
      out.set(uid, mapUser(canonicalUid, data));
      out.set(canonicalUid, mapUser(canonicalUid, data));
    }),
  );
  return out;
}

export async function GET(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const petId = parseText(url.searchParams.get("petId"));
  if (!petId) return NextResponse.json({ error: "petId obrigatorio" }, { status: 400 });

  const access = await getPetAccessById(auth.uid, petId);
  if (!access) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

  const ownerId = parseText(access.petData.ownerId);
  const membersSnap = await access.petRef.collection(SUBCOLLECTION_PET_MEMBERS).where("status", "==", "active").get();
  const memberDocs = membersSnap.docs.map((doc) => ({ uid: doc.id, ...(doc.data() as MemberDoc) }));
  const userMap = await fetchMemberUsers([ownerId, ...memberDocs.map((item) => parseText(item.uid))]);

  const items = [];
  if (ownerId) {
    const ownerUser = userMap.get(ownerId);
    items.push({
      uid: ownerId,
      role: "primary",
      canEditBasicData: true,
      canDeletePet: true,
      canPairNfc: true,
      user: ownerUser ?? { uid: ownerId, name: "Tutor principal", email: "", tutorCode: "", photoUrl: "" },
    });
  }

  for (const member of memberDocs) {
    const uid = parseText(member.uid);
    if (!uid || uid === ownerId) continue;
    const role = parseText(member.role).toLowerCase();
    if (role !== "secondary") continue;
    items.push({
      uid,
      role: "secondary",
      canEditBasicData: member.permissions?.editBasicData !== false,
      canDeletePet: member.permissions?.deletePet === true,
      canPairNfc: member.permissions?.pairNfc === true,
      user: userMap.get(uid) ?? { uid, name: "Tutor", email: "", tutorCode: "", photoUrl: "" },
    });
  }

  return NextResponse.json({ members: items, currentRole: access.access.role });
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: CreateMemberPayload;
  try {
    body = (await request.json()) as CreateMemberPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = parseText(body.petId);
  if (!petId) return NextResponse.json({ error: "petId obrigatorio" }, { status: 400 });

  const access = await getPetAccessById(auth.uid, petId);
  if (!access) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });
  if (!access.access.canManageTutors) {
    return NextResponse.json({ error: "Apenas tutor principal pode adicionar tutores." }, { status: 403 });
  }

  const principal = await getOrCreateCurrentUserProfile(auth.uid);
  if (principal.plan !== "pro") {
    return NextResponse.json(
      { error: "Apenas conta Pro pode adicionar tutores secundarios.", requiresUpgrade: true },
      { status: 403 },
    );
  }

  const petData = access.petData as PetDoc;
  const ownerId = parseText(petData.ownerId);
  const petName = parseText(petData.name, "pet");
  const targetDoc =
    (parseText(body.targetUserId) ? await resolveUserDocByIdOrAlias(parseText(body.targetUserId)) : null) ??
    (parseTutorCode(body.targetTutorCode) ? await resolveUserDocByTutorCode(parseTutorCode(body.targetTutorCode)) : null);

  if (!targetDoc) return NextResponse.json({ error: "Tutor nao encontrado." }, { status: 404 });
  const targetData = (targetDoc.data() ?? {}) as UserDoc;
  const targetUid = parseText(targetData.uid) || parseText(targetData.userId) || parseText(targetData.UserID) || targetDoc.id;
  if (!targetUid) return NextResponse.json({ error: "Tutor invalido." }, { status: 400 });
  if (targetUid === ownerId) return NextResponse.json({ error: "Tutor principal nao pode ser adicionado como secundario." }, { status: 400 });

  const memberRef = access.petRef.collection(SUBCOLLECTION_PET_MEMBERS).doc(targetUid);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    const currentStatus = parseText(memberSnap.data()?.status).toLowerCase();
    if (currentStatus === "active") {
      return NextResponse.json({ error: "Tutor ja vinculado a este pet." }, { status: 409 });
    }
    if (currentStatus === "pending") {
      return NextResponse.json({ error: "Ja existe convite pendente para este tutor." }, { status: 409 });
    }
  }

  const nowIso = new Date().toISOString();
  const db = getFirebaseAdminDb();
  const actorSnap = await db.collection(COLLECTION_USER).doc(auth.uid).get();
  const actorData = (actorSnap.data() ?? {}) as UserDoc;
  const actorName = parseText(actorData.name, "Tutor principal");

  await memberRef.set(
    {
      uid: targetUid,
      role: "secondary",
      status: "pending",
      permissions: {
        editBasicData: true,
        deletePet: false,
        pairNfc: false,
      },
      addedBy: auth.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    { merge: true },
  );

  await db.collection(COLLECTION_USER).doc(targetUid).collection(SUBCOLLECTION_USER_NOTIFICATIONS).add({
    type: "secondary_tutor_invite",
    title: "Convite para tutor secundario",
    body: `Voce foi adicionado como tutor secundario de ${petName} por ${actorName}.`,
    status: "pending",
    unread: true,
    createdAt: nowIso,
    petId,
    petName,
    inviterUid: auth.uid,
    inviterName: actorName,
    targetUid,
  });

  return NextResponse.json({ ok: true, targetUid, pendingApproval: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: RemoveMemberPayload;
  try {
    body = (await request.json()) as RemoveMemberPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = parseText(body.petId);
  if (!petId) return NextResponse.json({ error: "petId obrigatorio" }, { status: 400 });
  const access = await getPetAccessById(auth.uid, petId);
  if (!access) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

  const ownerId = parseText(access.petData.ownerId);
  const targetUid = parseText(body.targetUserId) || auth.uid;

  if (targetUid === ownerId) {
    return NextResponse.json({ error: "Tutor principal nao pode ser removido." }, { status: 400 });
  }

  if (targetUid !== auth.uid && !access.access.canManageTutors) {
    return NextResponse.json({ error: "Apenas tutor principal pode remover outro tutor." }, { status: 403 });
  }

  const memberRef = access.petRef.collection(SUBCOLLECTION_PET_MEMBERS).doc(targetUid);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    return NextResponse.json({ error: "Tutor secundario nao encontrado." }, { status: 404 });
  }

  await memberRef.delete();
  return NextResponse.json({ ok: true });
}
