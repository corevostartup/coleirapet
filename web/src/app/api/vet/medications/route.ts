import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS, SUBCOLLECTION_MEDICATION_REMINDERS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import { getCurrentVeterinarianProfile } from "@/lib/veterinarians/current";

type GetMedicationsParams = {
  petId?: string;
};

type CreateMedicationPayload = {
  petId?: string;
  name?: string;
  dosage?: string;
  duration?: string;
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

  const params = Object.fromEntries(new URL(request.url).searchParams.entries()) as GetMedicationsParams;
  const petId = typeof params.petId === "string" ? params.petId.trim() : "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const snapshot = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).limit(250).get();
    const medications = snapshot.docs
      .map((doc) => {
        const data = doc.data() as {
          name?: string;
          dose?: string;
          duration?: string;
          observation?: string;
          prescribedByName?: string;
          prescribedByCrmv?: string;
          createdAt?: string;
        };
        return {
          id: doc.id,
          petId,
          name: typeof data.name === "string" ? data.name : "Medicacao",
          dosage: typeof data.dose === "string" ? data.dose : "Dose nao informada",
          duration: typeof data.duration === "string" ? data.duration : "Nao informado",
          observation: typeof data.observation === "string" ? data.observation : "",
          prescribedByName: typeof data.prescribedByName === "string" ? data.prescribedByName : "Veterinario",
          prescribedByCrmv: typeof data.prescribedByCrmv === "string" ? data.prescribedByCrmv : "Nao informado",
          createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ medications });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar medicacoes",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao carregar medicacoes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: CreateMedicationPayload;
  try {
    body = (await request.json()) as CreateMedicationPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const dosage = typeof body.dosage === "string" ? body.dosage.trim() : "";
  const duration = typeof body.duration === "string" ? body.duration.trim() : "";
  const observation = typeof body.observation === "string" ? body.observation.trim() : "";

  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });
  if (!name || name.length < 2) return NextResponse.json({ error: "Nome da medicacao invalido" }, { status: 400 });
  if (!dosage || dosage.length < 2) return NextResponse.json({ error: "Dose invalida" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const vetProfile = await getCurrentVeterinarianProfile(auth.uid);
    const prescribedByCrmv = vetProfile?.crmv?.trim() || "Nao informado";
    const nowIso = new Date().toISOString();

    const ref = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).add({
      name: name.slice(0, 80),
      dose: dosage.slice(0, 80),
      duration: (duration || "Nao informado").slice(0, 40),
      observation: observation.slice(0, 400),
      prescribedByName: auth.vetName.slice(0, 80),
      prescribedByCrmv: prescribedByCrmv.slice(0, 40),
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return NextResponse.json(
      {
        ok: true,
        medication: {
          id: ref.id,
          petId,
          name: name.slice(0, 80),
          dosage: dosage.slice(0, 80),
          duration: (duration || "Nao informado").slice(0, 40),
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
        error: "Falha ao adicionar medicacao",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao adicionar medicacao.",
      },
      { status: 500 },
    );
  }
}
