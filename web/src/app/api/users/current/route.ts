import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_USER_NAME_COOKIE,
  AUTH_USER_PHOTO_COOKIE,
  AUTH_USER_UID_COOKIE,
  USER_PROFILE_EMAIL_PLACEHOLDER,
} from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserNameCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS, COLLECTION_USER, COLLECTION_VETERINARIANS } from "@/lib/firebase/collections";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { invalidateCurrentPetCache } from "@/lib/pets/current";
import { getOrCreateCurrentUserProfile, invalidateCurrentUserProfileCache } from "@/lib/users/current";
import { getCurrentVeterinarianProfile, upsertCurrentVeterinarianProfile } from "@/lib/veterinarians/current";

type UpdateCurrentUserPayload = {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  userType?: "Tutor" | "vet";
  plan?: "free" | "pro";
  veterinarian?: {
    crmv?: string;
    specialty?: string;
    bio?: string;
  };
};

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  const fallbackName = parseAuthUserNameCookie(jar.get(AUTH_USER_NAME_COOKIE)?.value);
  if (!session || !uid) return null;
  return { session, uid, fallbackName: fallbackName ?? undefined };
}

async function deleteCollectionTree(collectionRef: FirebaseFirestore.CollectionReference): Promise<void> {
  const snapshot = await collectionRef.get();
  for (const doc of snapshot.docs) {
    await deleteDocTree(doc.ref);
  }
}

async function deleteDocTree(docRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const subcollections = await docRef.listCollections();
  for (const subcollection of subcollections) {
    await deleteCollectionTree(subcollection);
  }
  await docRef.delete();
}

function clearAuthCookies(response: NextResponse) {
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  };
  response.cookies.set(AUTH_SESSION_COOKIE, "", cookieOptions);
  response.cookies.set(AUTH_USER_NAME_COOKIE, "", cookieOptions);
  response.cookies.set(AUTH_USER_PHOTO_COOKIE, "", cookieOptions);
  response.cookies.set(AUTH_USER_UID_COOKIE, "", cookieOptions);
}

function parseOptionalText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

function parseEmail(value: unknown) {
  const email = parseOptionalText(value, 160);
  if (email === undefined || email === null || email === "") return email;
  if (email === USER_PROFILE_EMAIL_PLACEHOLDER) return email;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function parseBirthDate(value: unknown) {
  const date = parseOptionalText(value, 10);
  if (date === undefined || date === null || date === "") return date;
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function parseUserType(value: unknown) {
  if (value === undefined) return undefined;
  if (value === "Tutor") return "Tutor";
  if (value === "vet" || value === "Vet") return "vet";
  return null;
}

function parsePlan(value: unknown) {
  if (value === undefined) return undefined;
  if (value === "free") return "free";
  if (value === "pro") return "pro";
  return null;
}

function parseVetPayload(value: unknown) {
  if (value === undefined) return { crmv: undefined, specialty: undefined, bio: undefined } as const;
  const data = (value ?? {}) as { crmv?: unknown; specialty?: unknown; bio?: unknown };
  const crmv = parseOptionalText(data.crmv, 40);
  const specialty = parseOptionalText(data.specialty, 80);
  const bio = parseOptionalText(data.bio, 500);
  return { crmv, specialty, bio } as const;
}

function toPublicVeterinarian(
  veterinarian: Awaited<ReturnType<typeof getCurrentVeterinarianProfile>> | Awaited<ReturnType<typeof upsertCurrentVeterinarianProfile>>,
) {
  if (!veterinarian) return null;
  return {
    crmv: veterinarian.crmv,
    specialty: veterinarian.specialty,
    validationStatus: veterinarian.validationStatus,
    bio: veterinarian.bio,
  };
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  const user = await getOrCreateCurrentUserProfile(auth.uid, { fallbackName: auth.fallbackName });
  const veterinarian = user.userType === "vet" ? await getCurrentVeterinarianProfile(auth.uid) : null;
  return NextResponse.json({ user, veterinarian: toPublicVeterinarian(veterinarian) });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: UpdateCurrentUserPayload;
  try {
    body = (await request.json()) as UpdateCurrentUserPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const name = parseOptionalText(body.name, 80);
  const email = parseEmail(body.email);
  const phone = parseOptionalText(body.phone, 30);
  const birthDate = parseBirthDate(body.birthDate);
  const userType = parseUserType(body.userType);
  const plan = parsePlan(body.plan);
  const vet = parseVetPayload(body.veterinarian);

  if (name === null) return NextResponse.json({ error: "Nome invalido" }, { status: 400 });
  if (email === null) return NextResponse.json({ error: "Email invalido" }, { status: 400 });
  if (phone === null) return NextResponse.json({ error: "Telefone invalido" }, { status: 400 });
  if (birthDate === null) return NextResponse.json({ error: "Data de nascimento invalida" }, { status: 400 });
  if (userType === null) return NextResponse.json({ error: "Tipo de usuario invalido" }, { status: 400 });
  if (plan === null) return NextResponse.json({ error: "Plano invalido" }, { status: 400 });
  if (vet.crmv === null) return NextResponse.json({ error: "CRMV invalido" }, { status: 400 });
  if (vet.specialty === null) return NextResponse.json({ error: "Especialidade invalida" }, { status: 400 });
  if (vet.bio === null) return NextResponse.json({ error: "Bio invalida" }, { status: 400 });

  const existingUser = await getOrCreateCurrentUserProfile(auth.uid, { fallbackName: auth.fallbackName });
  if (userType === "vet" && existingUser.userType !== "vet") {
    return NextResponse.json(
      { error: "Cadastro como veterinario esta temporariamente indisponivel." },
      { status: 403 },
    );
  }

  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = {
    updatedAt: nowIso,
    userId: auth.uid,
    UserID: auth.uid,
  };
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (birthDate !== undefined) updates.birthDate = birthDate;
  if (userType !== undefined) updates.userType = userType;
  if (plan !== undefined) updates.plan = plan;

  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_USER).doc(auth.uid);
  await ref.set(updates, { merge: true });
  invalidateCurrentUserProfileCache(auth.uid);

  const user = await getOrCreateCurrentUserProfile(auth.uid, { fallbackName: auth.fallbackName });
  const nextType = userType ?? user.userType;
  const veterinarian =
    nextType === "vet"
      ? await upsertCurrentVeterinarianProfile(auth.uid, {
          crmv: vet.crmv,
          specialty: vet.specialty,
          bio: vet.bio,
        })
      : null;

  return NextResponse.json({ ok: true, user, veterinarian: toPublicVeterinarian(veterinarian) });
}

export async function DELETE() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const db = getFirebaseAdminDb();
  const petsSnapshot = await db.collection(COLLECTION_PETS).where("ownerId", "==", auth.uid).get();

  for (const petDoc of petsSnapshot.docs) {
    await deleteDocTree(petDoc.ref);
  }

  await db.collection(COLLECTION_VETERINARIANS).doc(auth.uid).delete().catch(() => null);
  await db.collection(COLLECTION_USER).doc(auth.uid).delete().catch(() => null);
  invalidateCurrentUserProfileCache(auth.uid);
  invalidateCurrentPetCache(auth.uid);

  try {
    await getFirebaseAdminAuth().deleteUser(auth.uid);
  } catch {
    // Ignora quando o UID nao existir mais no Firebase Auth.
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);
  return response;
}
