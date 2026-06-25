import { NextResponse } from "next/server";
import { COLLECTION_PETS, SUBCOLLECTION_VACCINES, SUBCOLLECTION_VACCINES_LEGACY } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import {
  createPrescribedByCache,
  enrichPrescribedBy,
  prescribedByForWrite,
  requireVetAuthContext,
  veterinarianFromAuth,
} from "@/lib/veterinarians/auth";
import { canVetEditVaccineStatus } from "@/lib/vaccines/vaccine-access";
import type { VaccineStatus } from "@/lib/vaccines/vaccine-item";
import { vaccineFromDoc } from "@/lib/vaccines/vaccine-item";

type GetVaccinesParams = {
  petId?: string;
  veterinarian?: string;
};

type CreateVaccinePayload = {
  petId?: string;
  name?: string;
  date?: string;
  nextDose?: string;
  observation?: string;
};

type UpdateVaccinePayload = {
  petId?: string;
  id?: string;
  status?: VaccineStatus;
};

type VaccineSourceDoc = {
  name?: string;
  date?: string;
  status?: VaccineStatus;
  createdBy?: string;
  createdByUid?: string;
  prescribedByName?: string;
  prescribedByCrmv?: string;
  nextDose?: string;
  observation?: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries()) as GetVaccinesParams;
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

    const authorCache = createPrescribedByCache(auth);
    const vaccines = await Promise.all(
      Array.from(deduped.values()).map(async (doc) => {
        const data = doc.data() as VaccineSourceDoc & { observation?: string; createdAt?: string };
        const author = await enrichPrescribedBy(data, auth, authorCache);
        return {
          id: doc.id,
          petId,
          name: typeof data.name === "string" ? data.name : "Vacina",
          date: typeof data.date === "string" ? data.date : "",
          nextDose: typeof data.nextDose === "string" ? data.nextDose : "Nao informado",
          observation: typeof data.observation === "string" ? data.observation : "",
          prescribedByName: author.prescribedByName,
          prescribedByCrmv: author.prescribedByCrmv,
          createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
        };
      }),
    );

    vaccines.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({ vaccines, veterinarian });
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

    const prescribedBy = prescribedByForWrite(auth);
    const veterinarianLabel =
      prescribedBy.prescribedByCrmv !== "Nao informado"
        ? `${prescribedBy.prescribedByName} · CRMV ${prescribedBy.prescribedByCrmv}`
        : prescribedBy.prescribedByName;
    const nowIso = new Date().toISOString();

    const ref = await petRef.collection(SUBCOLLECTION_VACCINES).add({
      name: name.slice(0, 80),
      status: "applied",
      date: date.slice(0, 20),
      nextDose: (nextDose || "Nao informado").slice(0, 40),
      observation: observation.slice(0, 400),
      notes: observation.slice(0, 400),
      veterinarian: veterinarianLabel.slice(0, 120),
      ...prescribedBy,
      createdBy: "vet",
      createdByUid: auth.uid,
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
        error: "Falha ao adicionar vacina",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao adicionar vacina.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: UpdateVaccinePayload;
  try {
    body = (await request.json()) as UpdateVaccinePayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });
  if (!id) return NextResponse.json({ error: "Id da vacina invalido" }, { status: 400 });
  if (body.status !== "applied" && body.status !== "pending") {
    return NextResponse.json({ error: "Status invalido" }, { status: 400 });
  }

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const canonicalRef = petRef.collection(SUBCOLLECTION_VACCINES).doc(id);
    const legacyRef = petRef.collection(SUBCOLLECTION_VACCINES_LEGACY).doc(id);
    const canonicalSnap = await canonicalRef.get();
    const legacySnap = canonicalSnap.exists ? null : await legacyRef.get();
    const sourceData = (canonicalSnap.exists ? canonicalSnap.data() : legacySnap?.data()) as VaccineSourceDoc | undefined;

    if (!sourceData) {
      return NextResponse.json({ error: "Vacina nao encontrada" }, { status: 404 });
    }

    if (!canVetEditVaccineStatus(sourceData, auth.uid)) {
      return NextResponse.json(
        { error: "Apenas o veterinario que cadastrou esta vacina pode alterar o status." },
        { status: 403 },
      );
    }

    const nowIso = new Date().toISOString();
    await canonicalRef.set(
      {
        ...sourceData,
        status: body.status,
        updatedAt: nowIso,
      },
      { merge: true },
    );

    const refreshed = await canonicalRef.get();
    return NextResponse.json({
      ok: true,
      vaccine: vaccineFromDoc(id, refreshed.data() as VaccineSourceDoc),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao atualizar vacina",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao atualizar vacina.",
      },
      { status: 500 },
    );
  }
}
