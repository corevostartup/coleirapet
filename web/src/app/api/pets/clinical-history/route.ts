import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { loadPetClinicalHistory } from "@/lib/pets/clinical-history";
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
    const requestedPetId = readPetIdFromRequestUrl(request);
    const { petRef, petId } = await resolvePetContextForUser(auth.uid, requestedPetId);
    const history = await loadPetClinicalHistory(petRef, petId);
    return NextResponse.json({ history, petId });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar historico clinico",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao consultar historico clinico.",
      },
      { status: 500 },
    );
  }
}
