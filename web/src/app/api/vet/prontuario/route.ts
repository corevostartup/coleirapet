import { NextResponse } from "next/server";
import {
  COLLECTION_PETS,
  COLLECTION_VETERINARIANS,
  SUBCOLLECTION_PET_CLINICAL_RECORDS,
  SUBCOLLECTION_VET_MEDICAL_RECORDS,
} from "@/lib/firebase/collections";
import { getFirebaseAdminDb, getFirestoreFieldValue } from "@/lib/firebase/admin";
import { loadPetClinicalHistory } from "@/lib/pets/clinical-history";
import {
  createPrescribedByCache,
  enrichPrescribedBy,
  prescribedByForWrite,
  requireVetAuthContext,
  veterinarianFromAuth,
} from "@/lib/veterinarians/auth";

type CreateMedicalRecordPayload = {
  petId?: string;
  petName?: string;
  diagnosis?: string;
  note?: string;
};

function isoFromFirestoreTime(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value != null && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return "";
    }
  }
  return "";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function recordFromDoc(
  id: string,
  data: {
    petId?: string;
    petName?: string;
    diagnosis?: string;
    note?: string;
    prescribedByName?: string;
    prescribedByCrmv?: string;
    createdAt?: unknown;
  },
) {
  const createdAtIso = isoFromFirestoreTime(data.createdAt);
  return {
    id,
    petId: typeof data.petId === "string" ? data.petId : "",
    petName: typeof data.petName === "string" ? data.petName : "Pet",
    diagnosis: typeof data.diagnosis === "string" ? data.diagnosis : "Registro clinico",
    note: typeof data.note === "string" ? data.note : "",
    prescribedByName: typeof data.prescribedByName === "string" ? data.prescribedByName : "Veterinario",
    prescribedByCrmv: typeof data.prescribedByCrmv === "string" ? data.prescribedByCrmv : "Nao informado",
    createdAtIso,
    when: formatDateTime(createdAtIso),
  };
}

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const veterinarianOnly = url.searchParams.get("veterinarian") === "1";
  const petId = url.searchParams.get("petId")?.trim() ?? "";

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

    const history = await loadPetClinicalHistory(petRef, petId);
    const petData = petSnap.data() as { name?: string } | undefined;
    const resolvedPetName =
      typeof petData?.name === "string" && petData.name.trim() ? petData.name.trim() : "Pet";
    const fromPet = history
      .filter((item) => item.kind === "clinical")
      .map((item) => ({
        id: item.id.replace(/^clinical-/, ""),
        petId,
        petName: resolvedPetName,
        diagnosis: item.title,
        note: item.detail,
        prescribedByName: item.prescribedByName,
        prescribedByCrmv: item.prescribedByCrmv,
        createdAtIso: item.createdAtIso,
        when: item.when,
      }));

    const legacySnapshot = await db
      .collection(COLLECTION_VETERINARIANS)
      .doc(auth.uid)
      .collection(SUBCOLLECTION_VET_MEDICAL_RECORDS)
      .where("petId", "==", petId)
      .limit(200)
      .get();

    const authorCache = createPrescribedByCache(auth);
    const legacyIds = new Set(fromPet.map((item) => item.id));
    const legacyRecords = await Promise.all(
      legacySnapshot.docs
        .filter((doc) => !legacyIds.has(doc.id))
        .map(async (doc) => {
          const raw = doc.data() as Parameters<typeof recordFromDoc>[1] & { recordedByUid?: string };
          const author = await enrichPrescribedBy(raw, auth, authorCache);
          return recordFromDoc(doc.id, { ...raw, ...author });
        }),
    );

    const records = [...fromPet, ...legacyRecords].sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));

    return NextResponse.json({ records, veterinarian });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar prontuario",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao consultar prontuario.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: CreateMedicalRecordPayload;
  try {
    body = (await request.json()) as CreateMedicalRecordPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  const petName = typeof body.petName === "string" ? body.petName.trim() : "";
  const diagnosis = typeof body.diagnosis === "string" ? body.diagnosis.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!petId || petId.length < 3) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });
  if (!petName || petName.length < 2) return NextResponse.json({ error: "Nome do pet invalido" }, { status: 400 });
  if (!diagnosis || diagnosis.length < 2) return NextResponse.json({ error: "Diagnostico invalido" }, { status: 400 });
  if (!note || note.length < 2) return NextResponse.json({ error: "Evolucao invalida" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const prescribedBy = prescribedByForWrite(auth);
    const recordPayload = {
      kind: "clinical",
      petId: petId.slice(0, 64),
      petName: petName.slice(0, 80),
      diagnosis: diagnosis.slice(0, 120),
      note: note.slice(0, 1200),
      ...prescribedBy,
      recordedByUid: auth.uid,
      createdBy: "vet",
      createdAt: getFirestoreFieldValue().serverTimestamp(),
      updatedAt: getFirestoreFieldValue().serverTimestamp(),
    };

    const petRecordRef = await petRef.collection(SUBCOLLECTION_PET_CLINICAL_RECORDS).add(recordPayload);

    await db
      .collection(COLLECTION_VETERINARIANS)
      .doc(auth.uid)
      .collection(SUBCOLLECTION_VET_MEDICAL_RECORDS)
      .doc(petRecordRef.id)
      .set({
        petId: petId.slice(0, 64),
        petName: petName.slice(0, 80),
        diagnosis: diagnosis.slice(0, 120),
        note: note.slice(0, 1200),
        ...prescribedBy,
        recordedByUid: auth.uid,
        petClinicalRecordId: petRecordRef.id,
        createdAt: getFirestoreFieldValue().serverTimestamp(),
        updatedAt: getFirestoreFieldValue().serverTimestamp(),
      });

    const written = await petRecordRef.get();
    const data = written.data() as Parameters<typeof recordFromDoc>[1] | undefined;

    return NextResponse.json(
      {
        ok: true,
        record: recordFromDoc(petRecordRef.id, data ?? {}),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao adicionar prontuario",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao adicionar prontuario.",
      },
      { status: 500 },
    );
  }
}
