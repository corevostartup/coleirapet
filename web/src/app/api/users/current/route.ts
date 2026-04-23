import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_NAME_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserNameCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import { getCurrentVeterinarianProfile, upsertCurrentVeterinarianProfile } from "@/lib/veterinarians/current";

type UpdateCurrentUserPayload = {
  name?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  userType?: "Tutor" | "vet";
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
  const vet = parseVetPayload(body.veterinarian);

  if (name === null) return NextResponse.json({ error: "Nome invalido" }, { status: 400 });
  if (email === null) return NextResponse.json({ error: "Email invalido" }, { status: 400 });
  if (phone === null) return NextResponse.json({ error: "Telefone invalido" }, { status: 400 });
  if (birthDate === null) return NextResponse.json({ error: "Data de nascimento invalida" }, { status: 400 });
  if (userType === null) return NextResponse.json({ error: "Tipo de usuario invalido" }, { status: 400 });
  if (vet.crmv === null) return NextResponse.json({ error: "CRMV invalido" }, { status: 400 });
  if (vet.specialty === null) return NextResponse.json({ error: "Especialidade invalida" }, { status: 400 });
  if (vet.bio === null) return NextResponse.json({ error: "Bio invalida" }, { status: 400 });

  await getOrCreateCurrentUserProfile(auth.uid, { fallbackName: auth.fallbackName });

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

  const db = getFirebaseAdminDb();
  const ref = db.collection(COLLECTION_USER).doc(auth.uid);
  await ref.set(updates, { merge: true });

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
