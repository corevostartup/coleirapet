import { NextResponse } from "next/server";
import { COLLECTION_PETS, SUBCOLLECTION_MEDICATION_REMINDERS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import {
  createPrescribedByCache,
  enrichPrescribedBy,
  prescribedByForWrite,
  requireVetAuthContext,
  veterinarianFromAuth,
} from "@/lib/veterinarians/auth";

type GetMedicationsParams = {
  petId?: string;
  veterinarian?: string;
};

type CreateMedicationPayload = {
  petId?: string;
  name?: string;
  dosage?: string;
  duration?: string;
  observation?: string;
};

type MedicationSourceDoc = {
  name?: string;
  dose?: string;
  duration?: string;
  observation?: string;
  prescribedByName?: string;
  prescribedByCrmv?: string;
  createdByUid?: string;
  createdAt?: string;
};

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries()) as GetMedicationsParams;
  const veterinarianOnly = params.veterinarian === "1";
  const petId = typeof params.petId === "string" ? params.petId.trim() : "";
  const veterinarian = veterinarianFromAuth(auth);

  if (veterinarianOnly) {
    return NextResponse.json({ veterinarian });
  }

  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const snapshot = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).limit(250).get();
    const authorCache = createPrescribedByCache(auth);
    const medications = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as MedicationSourceDoc;
        const author = await enrichPrescribedBy(data, auth, authorCache);
        return {
          id: doc.id,
          petId,
          name: typeof data.name === "string" ? data.name : "Medicacao",
          dosage: typeof data.dose === "string" ? data.dose : "Dose nao informada",
          duration: typeof data.duration === "string" ? data.duration : "Nao informado",
          observation: typeof data.observation === "string" ? data.observation : "",
          prescribedByName: author.prescribedByName,
          prescribedByCrmv: author.prescribedByCrmv,
          createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
        };
      }),
    );

    medications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ medications, veterinarian });
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

    const prescribedBy = prescribedByForWrite(auth);
    const nowIso = new Date().toISOString();

    const ref = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).add({
      name: name.slice(0, 80),
      dose: dosage.slice(0, 80),
      duration: (duration || "Nao informado").slice(0, 40),
      observation: observation.slice(0, 400),
      ...prescribedBy,
      createdBy: "vet",
      createdByUid: auth.uid,
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
          prescribedByName: prescribedBy.prescribedByName,
          prescribedByCrmv: prescribedBy.prescribedByCrmv,
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
