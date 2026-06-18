import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { fetchHomeUpcomingEvents } from "@/lib/home/upcoming-events";
import { readPetIdFromRequestUrl, resolvePetContextForUser } from "@/lib/pets/resolve-pet-context";

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

export async function GET(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  try {
    const { petRef } = await resolvePetContextForUser(auth.uid, readPetIdFromRequestUrl(request));
    const events = await fetchHomeUpcomingEvents(petRef);
    return NextResponse.json({
      events: events.map(({ id, label, when, kind, source }) => ({ id, label, when, kind, source })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar proximos eventos",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
