import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS, SUBCOLLECTION_VACCINES, SUBCOLLECTION_VACCINES_LEGACY } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import { getCurrentVeterinarianProfile } from "@/lib/veterinarians/current";

type GetVaccinesParams = {
  petId?: string;
};

type CreateVaccinePayload = {
  petId?: string;
  name?: string;
  date?: string;
  nextDose?: string;
  observation?: string;
};

async function requireVetAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;

  const user = await getOrCreateCurrentUserProfile(uid);
  if (user.userType !== "vet") return null;
  return { uid, vetName: user.name || "Veterinario" };
}

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries()) as GetVaccinesParams;
  const petId = typeof params.petId === "string" ? params.petId.trim() : "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const snapshots = await Promise.all([
      petRef.collection(SUBCOLLECTION_VACCINES).get(),
      petRef.collection(SUBCOLLECTION_VACCINES_LEGACY).get(),
    ]);

    const deduped = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const snapshot of snapshots) {
      for (const doc of snapshot.docs) {
        if (!deduped.has(doc.id)) deduped.set(doc.id, doc);
      }
    }

    const vaccines = Array.from(deduped.values())
      .map((doc) => {
        const data = doc.data() as {
          name?: string;
          date?: string;
          nextDose?: string;
          observation?: string;
          prescribedByName?: string;
          prescribedByCrmv?: string;
          createdAt?: string;
        };
        return {
          id: doc.id,
          petId,
          name: typeof data.name === "string" ? data.name : "Vacina",
          date: typeof data.date === "string" ? data.date : "",
          nextDose: typeof data.nextDose === "string" ? data.nextDose : "Nao informado",
          observation: typeof data.observation === "string" ? data.observation : "",
          prescribedByName: typeof data.prescribedByName === "string" ? data.prescribedByName : "Veterinario",
          prescribedByCrmv: typeof data.prescribedByCrmv === "string" ? data.prescribedByCrmv : "Nao informado",
          createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ vaccines });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar vacinas",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao carregar vacinas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: CreateVaccinePayload;
  try {
    body = (await request.json()) as CreateVaccinePayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const nextDose = typeof body.nextDose === "string" ? body.nextDose.trim() : "";
  const observation = typeof body.observation === "string" ? body.observation.trim() : "";

  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });
  if (!name || name.length < 2) return NextResponse.json({ error: "Nome da vacina invalido" }, { status: 400 });
  if (!date || date.length < 4) return NextResponse.json({ error: "Data da aplicacao invalida" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const vetProfile = await getCurrentVeterinarianProfile(auth.uid);
    const prescribedByCrmv = vetProfile?.crmv?.trim() || "Nao informado";
    const nowIso = new Date().toISOString();

    const ref = await petRef.collection(SUBCOLLECTION_VACCINES).add({
      name: name.slice(0, 80),
      date: date.slice(0, 20),
      nextDose: (nextDose || "Nao informado").slice(0, 40),
      observation: observation.slice(0, 400),
      prescribedByName: auth.vetName.slice(0, 80),
      prescribedByCrmv: prescribedByCrmv.slice(0, 40),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return NextResponse.json(
      {
        ok: true,
        vaccine: {
          id: ref.id,
          petId,
          name: name.slice(0, 80),
          date: date.slice(0, 20),
          nextDose: (nextDose || "Nao informado").slice(0, 40),
          observation: observation.slice(0, 400),
          prescribedByName: auth.vetName.slice(0, 80),
          prescribedByCrmv: prescribedByCrmv.slice(0, 40),
          createdAt: nowIso,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao adicionar vacina",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao adicionar vacina.",
      },
      { status: 500 },
    );
  }
}
