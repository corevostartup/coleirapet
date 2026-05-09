import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { isLegacyUiDemoPetName } from "@/lib/pets/legacy-ui-demo-pets";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

type PetDoc = {
  ownerId?: string;
  petIdentity?: string;
  name?: string;
  breed?: string;
  image?: string;
  age?: unknown;
  weightKg?: unknown;
  updatedAt?: string;
};

function isDemoPetId(petId: string) {
  const id = petId.trim().toLowerCase();
  return id.startsWith("demo-") || id === "demo-max" || id === "demo-nina" || id === "demo-thor";
}

function toNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function toPetIdentity(value: unknown, fallback: string) {
  const normalized = toText(value).toUpperCase();
  if (!normalized) return fallback;
  if (!/^[A-Z0-9]{8}$/.test(normalized)) return fallback;
  return normalized;
}

async function requireVetAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;

  const user = await getOrCreateCurrentUserProfile(uid);
  if (user.userType !== "vet") return null;
  return { uid };
}

export async function GET() {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  try {
    const db = getFirebaseAdminDb();
    const snapshot = await db.collection(COLLECTION_PETS).limit(500).get();

    const pets = snapshot.docs
      .map((doc) => {
        const data = (doc.data() ?? {}) as PetDoc;
        const name = toText(data.name);
        return {
          id: doc.id,
          ownerId: toText(data.ownerId),
          petIdentity: toPetIdentity(data.petIdentity, doc.id),
          name,
          breed: toText(data.breed),
          image: toText(data.image),
          age: toNumberOrNull(data.age),
          weightKg: toNumberOrNull(data.weightKg),
          updatedAt: toText(data.updatedAt),
        };
      })
      .filter((pet) => pet.ownerId.length > 0)
      .filter((pet) => pet.name.length > 0)
      .filter((pet) => !isDemoPetId(pet.id))
      .filter((pet) => !isLegacyUiDemoPetName(pet.name))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return NextResponse.json({ pets });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao listar pets",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao listar pets.",
      },
      { status: 500 },
    );
  }
}
