import { cookies } from "next/headers";
import type { DocumentReference, Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import {
  COLLECTION_USER,
  SUBCOLLECTION_VACCINES,
  SUBCOLLECTION_VACCINES_LEGACY,
} from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentPet } from "@/lib/pets/current";
import type { VaccineStatus } from "@/lib/vaccines/vaccine-item";
import { vaccineFromDoc } from "@/lib/vaccines/vaccine-item";

type CreateVaccinePayload = {
  name?: string;
  status?: VaccineStatus;
  date?: string;
  veterinarian?: string;
  clinic?: string;
  notes?: string;
};

type UpdateVaccinePayload = {
  id?: string;
  status?: VaccineStatus;
  veterinarian?: string;
  clinic?: string;
  notes?: string;
};

function sliceText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

type VaccineSourceDoc = {
  name?: string;
  date?: string;
  status?: VaccineStatus;
  createdAt?: string;
  veterinarian?: string;
  clinic?: string;
  notes?: string;
};

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);

  if (!session || !uid) return null;
  return { session, uid };
}

async function readAndSortVaccineDocs(petRef: DocumentReference) {
  const snapshots = await Promise.all([
    petRef.collection(SUBCOLLECTION_VACCINES).get(),
    petRef.collection(SUBCOLLECTION_VACCINES_LEGACY).get(),
  ]);

  const deduped = new Map<string, QueryDocumentSnapshot>();
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      if (!deduped.has(doc.id)) deduped.set(doc.id, doc);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const aCreatedAt = typeof a.data().createdAt === "string" ? a.data().createdAt : "";
    const bCreatedAt = typeof b.data().createdAt === "string" ? b.data().createdAt : "";
    if (aCreatedAt === bCreatedAt) return b.id.localeCompare(a.id);
    return bCreatedAt.localeCompare(aCreatedAt);
  });
}

async function migrateLegacyVaccinesToPet(
  db: Firestore,
  uid: string,
  petRef: DocumentReference,
) {
  const legacySnapshots = await Promise.all([
    db.collection(COLLECTION_USER).doc(uid).collection(SUBCOLLECTION_VACCINES).get(),
    db.collection(COLLECTION_USER).doc(uid).collection(SUBCOLLECTION_VACCINES_LEGACY).get(),
  ]);
  const legacyDocs = legacySnapshots.flatMap((snapshot) => snapshot.docs);
  if (!legacyDocs.length) return;

  const batch = db.batch();
  for (const legacyDoc of legacyDocs) {
    batch.set(petRef.collection(SUBCOLLECTION_VACCINES).doc(legacyDoc.id), legacyDoc.data(), { merge: true });
  }
  await batch.commit();
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  try {
    const db = getFirebaseAdminDb();
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    let docs = await readAndSortVaccineDocs(petRef);

    if (!docs.length) {
      await migrateLegacyVaccinesToPet(db, auth.uid, petRef);
      docs = await readAndSortVaccineDocs(petRef);
    }

    const vaccines = docs.map((doc) => vaccineFromDoc(doc.id, doc.data() as VaccineSourceDoc));

    return NextResponse.json({ vaccines });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar vacinas",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao consultar vacinas.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  let body: CreateVaccinePayload;
  try {
    body = (await request.json()) as CreateVaccinePayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const name = body.name?.trim();
  const status = body.status;
  const date = body.date?.trim();
  const veterinarian = sliceText(body.veterinarian, 120);
  const clinic = sliceText(body.clinic, 120);
  const notes = sliceText(body.notes, 800);

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Nome da vacina invalido" }, { status: 400 });
  }
  if (!status || !["applied", "pending"].includes(status)) {
    return NextResponse.json({ error: "Status invalido" }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Data invalida" }, { status: 400 });
  }

  try {
    const nowIso = new Date().toISOString();
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    const payload: Record<string, unknown> = {
      name: name.slice(0, 80),
      status,
      date,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    if (veterinarian) payload.veterinarian = veterinarian;
    if (clinic) payload.clinic = clinic;
    if (notes) payload.notes = notes;

    const ref = await petRef.collection(SUBCOLLECTION_VACCINES).add(payload);
    const snap = await ref.get();

    return NextResponse.json(
      {
        ok: true,
        vaccine: vaccineFromDoc(ref.id, snap.data() as VaccineSourceDoc),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao cadastrar vacina",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao cadastrar vacina.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  let body: UpdateVaccinePayload;
  try {
    body = (await request.json()) as UpdateVaccinePayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Id da vacina invalido" }, { status: 400 });
  }

  const hasStatus = body.status !== undefined;
  const hasVet = body.veterinarian !== undefined;
  const hasClinic = body.clinic !== undefined;
  const hasNotes = body.notes !== undefined;

  if (!hasStatus && !hasVet && !hasClinic && !hasNotes) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  if (hasStatus && body.status !== "applied" && body.status !== "pending") {
    return NextResponse.json({ error: "Status invalido" }, { status: 400 });
  }

  try {
    const nowIso = new Date().toISOString();
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    const canonicalRef = petRef.collection(SUBCOLLECTION_VACCINES).doc(id);
    const legacyRef = petRef.collection(SUBCOLLECTION_VACCINES_LEGACY).doc(id);

    const canonicalSnap = await canonicalRef.get();
    const legacySnap = canonicalSnap.exists ? null : await legacyRef.get();
    const sourceData = (canonicalSnap.exists ? canonicalSnap.data() : legacySnap?.data()) as VaccineSourceDoc | undefined;

    if (!sourceData) {
      return NextResponse.json({ error: "Vacina nao encontrada" }, { status: 404 });
    }

    const nextStatus: VaccineStatus =
      hasStatus && (body.status === "applied" || body.status === "pending")
        ? body.status
        : sourceData.status === "applied"
          ? "applied"
          : "pending";

    const merged: Record<string, unknown> = {
      name: typeof sourceData.name === "string" ? sourceData.name : "Vacina",
      date: typeof sourceData.date === "string" ? sourceData.date : "",
      createdAt: typeof sourceData.createdAt === "string" ? sourceData.createdAt : nowIso,
      status: nextStatus,
      updatedAt: nowIso,
    };

    if (hasVet) merged.veterinarian = sliceText(body.veterinarian, 120);
    else if (typeof sourceData.veterinarian === "string") merged.veterinarian = sourceData.veterinarian;

    if (hasClinic) merged.clinic = sliceText(body.clinic, 120);
    else if (typeof sourceData.clinic === "string") merged.clinic = sourceData.clinic;

    if (hasNotes) merged.notes = sliceText(body.notes, 800);
    else if (typeof sourceData.notes === "string") merged.notes = sourceData.notes;

    await canonicalRef.set(merged, { merge: true });

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
