import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { createOwnedPet, listOwnedPets, setCurrentPet } from "@/lib/pets/current";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

type SwitchPetPayload = {
  petId?: string;
};

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const data = await listOwnedPets(auth.uid);
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: SwitchPetPayload;
  try {
    body = (await request.json()) as SwitchPetPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  if (!petId) return NextResponse.json({ error: "Pet invalido" }, { status: 400 });

  const pet = await setCurrentPet(auth.uid, petId);
  if (!pet) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

  const data = await listOwnedPets(auth.uid);
  return NextResponse.json({ ok: true, ...data });
}

export async function POST() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const user = await getOrCreateCurrentUserProfile(auth.uid);
  if (user.plan !== "pro") {
    return NextResponse.json(
      {
        error: "Plano Free permite apenas 1 pet. Assine o Premium para liberar pets ilimitados.",
        requiresUpgrade: true,
      },
      { status: 403 },
    );
  }

  await createOwnedPet(auth.uid);
  const data = await listOwnedPets(auth.uid);
  return NextResponse.json({ ok: true, ...data }, { status: 201 });
}
