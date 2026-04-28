import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { getOrCreateCurrentPet, invalidateCurrentPetCache } from "@/lib/pets/current";

type UpdateCurrentPetPayload = {
  name?: string;
  age?: number;
  weightKg?: number;
  sex?: string;
  size?: string;
  emergencyContact?: string;
  breed?: string;
  color?: string;
  microchipId?: string;
  notes?: string;
  publicFields?: {
    name?: boolean;
    breed?: boolean;
    color?: boolean;
    emergencyContact?: boolean;
    microchipId?: boolean;
    notes?: boolean;
  };
};

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);

  if (!session || !uid) return null;
  return { session, uid };
}

function parseOptionalText(value: unknown, maxLength: number) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > maxLength) return null;
  return trimmed;
}

function parseAge(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (!Number.isInteger(value) || value < 0 || value > 40) return null;
  return value;
}

function parseWeight(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 10) / 10;
  if (rounded < 0.1 || rounded > 130) return null;
  return rounded;
}

function parseOptionalBoolean(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") return null;
  return value;
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  try {
    const { pet } = await getOrCreateCurrentPet(auth.uid);
    return NextResponse.json({ pet });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar pet atual",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao carregar pet atual.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: UpdateCurrentPetPayload;
  try {
    body = (await request.json()) as UpdateCurrentPetPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const age = parseAge(body.age);
  const weightKg = parseWeight(body.weightKg);
  const name = parseOptionalText(body.name, 50);
  const sex = parseOptionalText(body.sex, 20);
  const size = parseOptionalText(body.size, 20);
  const emergencyContact = parseOptionalText(body.emergencyContact, 40);
  const breed = parseOptionalText(body.breed, 50);
  const color = parseOptionalText(body.color, 30);
  const microchipId = parseOptionalText(body.microchipId, 40);
  const notes = parseOptionalText(body.notes, 280);
  const publicName = parseOptionalBoolean(body.publicFields?.name);
  const publicBreed = parseOptionalBoolean(body.publicFields?.breed);
  const publicColor = parseOptionalBoolean(body.publicFields?.color);
  const publicEmergencyContact = parseOptionalBoolean(body.publicFields?.emergencyContact);
  const publicMicrochipId = parseOptionalBoolean(body.publicFields?.microchipId);
  const publicNotes = parseOptionalBoolean(body.publicFields?.notes);

  if (name === null) return NextResponse.json({ error: "Nome invalido" }, { status: 400 });
  if (age === null) return NextResponse.json({ error: "Idade invalida" }, { status: 400 });
  if (weightKg === null) return NextResponse.json({ error: "Peso invalido" }, { status: 400 });
  if (sex === null) return NextResponse.json({ error: "Sexo invalido" }, { status: 400 });
  if (size === null) return NextResponse.json({ error: "Porte invalido" }, { status: 400 });
  if (emergencyContact === null) return NextResponse.json({ error: "Contato de emergencia invalido" }, { status: 400 });
  if (breed === null) return NextResponse.json({ error: "Raca invalida" }, { status: 400 });
  if (color === null) return NextResponse.json({ error: "Cor invalida" }, { status: 400 });
  if (microchipId === null) return NextResponse.json({ error: "Microchip invalido" }, { status: 400 });
  if (notes === null) return NextResponse.json({ error: "Observacoes invalidas" }, { status: 400 });
  if (publicName === null) return NextResponse.json({ error: "Flag publica de nome invalida" }, { status: 400 });
  if (publicBreed === null) return NextResponse.json({ error: "Flag publica de raca invalida" }, { status: 400 });
  if (publicColor === null) return NextResponse.json({ error: "Flag publica de cor invalida" }, { status: 400 });
  if (publicEmergencyContact === null) return NextResponse.json({ error: "Flag publica de contato invalida" }, { status: 400 });
  if (publicMicrochipId === null) return NextResponse.json({ error: "Flag publica de microchip invalida" }, { status: 400 });
  if (publicNotes === null) return NextResponse.json({ error: "Flag publica de observacoes invalida" }, { status: 400 });

  const { petRef, pet } = await getOrCreateCurrentPet(auth.uid);
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (age !== undefined) updates.age = age;
  if (weightKg !== undefined) updates.weightKg = weightKg;
  if (sex !== undefined) updates.sex = sex;
  if (size !== undefined) updates.size = size;
  if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
  if (breed !== undefined) updates.breed = breed;
  if (color !== undefined) updates.color = color;
  if (microchipId !== undefined) updates.microchipId = microchipId;
  if (notes !== undefined) updates.notes = notes;

  const nextPublicFields = {
    name: pet.publicFields.name,
    breed: pet.publicFields.breed,
    color: pet.publicFields.color,
    emergencyContact: pet.publicFields.emergencyContact,
    microchipId: pet.publicFields.microchipId,
    notes: pet.publicFields.notes,
  };
  if (publicName !== undefined) nextPublicFields.name = publicName;
  if (publicBreed !== undefined) nextPublicFields.breed = publicBreed;
  if (publicColor !== undefined) nextPublicFields.color = publicColor;
  if (publicEmergencyContact !== undefined) nextPublicFields.emergencyContact = publicEmergencyContact;
  if (publicMicrochipId !== undefined) nextPublicFields.microchipId = publicMicrochipId;
  if (publicNotes !== undefined) nextPublicFields.notes = publicNotes;
  updates.publicFields = nextPublicFields;

  await petRef.set(updates, { merge: true });
  invalidateCurrentPetCache(auth.uid);
  const refreshed = await petRef.get();
  return NextResponse.json({
    ok: true,
    pet: {
      id: refreshed.id,
      ...(refreshed.data() ?? {}),
    },
  });
}
