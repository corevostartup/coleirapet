import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { isLegacyUiDemoPetName } from "@/lib/pets/legacy-ui-demo-pets";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import { finalizeAppointmentForPet } from "@/lib/veterinarians/appointments";
import {
  finishActiveConsultation,
  pushRecentConsultation,
  readRecentConsultations,
  readVetPetSession,
} from "@/lib/veterinarians/pet-session";

type PetDoc = {
  ownerId?: string;
  petIdentity?: string;
  name?: string;
  breed?: string;
  image?: string;
  age?: unknown;
  weightKg?: unknown;
  updatedAt?: string;
  notes?: string;
};

const SEARCH_LIMIT = 20;

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

function formatPtBrDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

async function loadAllRealPets() {
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTION_PETS).limit(500).get();

  return snapshot.docs
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
        notes: toText(data.notes),
      };
    })
    .filter((pet) => pet.ownerId.length > 0)
    .filter((pet) => pet.name.length > 0)
    .filter((pet) => !isDemoPetId(pet.id))
    .filter((pet) => !isLegacyUiDemoPetName(pet.name));
}

async function resolveTutorNames(ownerIds: string[]) {
  const unique = [...new Set(ownerIds.filter(Boolean))];
  const map = new Map<string, string>();
  await Promise.all(
    unique.map(async (ownerId) => {
      try {
        const user = await getOrCreateCurrentUserProfile(ownerId);
        const name = user.name?.trim();
        const email = user.email?.trim();
        map.set(ownerId, name || email || "Tutor(a)");
      } catch {
        map.set(ownerId, "Tutor(a)");
      }
    }),
  );
  return map;
}

function matchesSearch(
  pet: { id: string; petIdentity: string; name: string; breed: string },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    pet.id.toLowerCase().includes(q) ||
    pet.petIdentity.toLowerCase().includes(q) ||
    pet.name.toLowerCase().includes(q) ||
    pet.breed.toLowerCase().includes(q)
  );
}

async function enrichPets(
  pets: Awaited<ReturnType<typeof loadAllRealPets>>,
  consultedAtByPetId?: Map<string, string>,
) {
  const tutorNames = await resolveTutorNames(pets.map((pet) => pet.ownerId));
  return pets.map((pet) => ({
    id: pet.id,
    ownerId: pet.ownerId,
    petIdentity: pet.petIdentity,
    name: pet.name,
    tutorName: tutorNames.get(pet.ownerId) ?? "Tutor(a)",
    breed: pet.breed || "Raca nao informada",
    image: pet.image,
    age: pet.age,
    weightKg: pet.weightKg,
    notes: pet.notes,
    consultedAt: consultedAtByPetId?.get(pet.id) ?? null,
    consultedAtLabel: consultedAtByPetId?.get(pet.id) ? formatPtBrDateTime(consultedAtByPetId.get(pet.id)!) : null,
  }));
}

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const recentOnly = url.searchParams.get("recent") === "1";
  const activeOnly = url.searchParams.get("active") === "1";
  const petId = url.searchParams.get("petId")?.trim() ?? "";

  try {
    if (activeOnly) {
      const session = await readVetPetSession(auth.uid);
      if (!session.activePetId) return NextResponse.json({ pet: null });

      const all = await loadAllRealPets();
      const pet = all.find((item) => item.id === session.activePetId);
      if (!pet) return NextResponse.json({ pet: null });

      const consultedAtByPetId = session.activePetSelectedAt
        ? new Map([[session.activePetId, session.activePetSelectedAt]])
        : undefined;
      const [enriched] = await enrichPets([pet], consultedAtByPetId);
      return NextResponse.json({ pet: enriched });
    }

    if (petId) {
      const all = await loadAllRealPets();
      const pet = all.find((item) => item.id === petId);
      if (!pet) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });
      const [enriched] = await enrichPets([pet]);
      return NextResponse.json({ pet: enriched });
    }

    if (recentOnly) {
      const recent = await readRecentConsultations(auth.uid);
      if (!recent.length) return NextResponse.json({ pets: [] });

      const all = await loadAllRealPets();
      const byId = new Map(all.map((pet) => [pet.id, pet]));
      const consultedAtByPetId = new Map(recent.map((item) => [item.petId, item.consultedAt]));
      const ordered = recent.map((item) => byId.get(item.petId)).filter(Boolean) as typeof all;
      const pets = await enrichPets(ordered, consultedAtByPetId);
      return NextResponse.json({ pets });
    }

    const minQueryLength = /^[A-Z0-9]{8}$/i.test(q) ? 1 : 2;
    if (q.length < minQueryLength) {
      return NextResponse.json({ pets: [] });
    }

    const all = await loadAllRealPets();
    const matched = all.filter((pet) => matchesSearch(pet, q)).slice(0, SEARCH_LIMIT);
    const pets = await enrichPets(matched);
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

export async function POST(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: { petId?: string };
  try {
    body = (await request.json()) as { petId?: string };
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });

  try {
    const all = await loadAllRealPets();
    const pet = all.find((item) => item.id === petId);
    if (!pet) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    await pushRecentConsultation(auth.uid, petId);
    const nowIso = new Date().toISOString();
    const consultedAtByPetId = new Map([[petId, nowIso]]);
    const [enriched] = await enrichPets([pet], consultedAtByPetId);

    return NextResponse.json({ ok: true, pet: enriched });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao registrar consulta",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao registrar consulta.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: { petId?: string };
  try {
    body = (await request.json()) as { petId?: string };
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";

  try {
    const result = await finishActiveConsultation(auth.uid, petId || undefined);
    await finalizeAppointmentForPet(auth.uid, result.petId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao finalizar atendimento.";
    const status = message.includes("em andamento") ? 409 : 400;
    return NextResponse.json(
      {
        error: "Falha ao finalizar atendimento",
        detail: message,
      },
      { status },
    );
  }
}
