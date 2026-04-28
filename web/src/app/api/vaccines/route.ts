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

type VaccineStatus = "applied" | "pending";

type CreateVaccinePayload = {
  name?: string;
  status?: VaccineStatus;
  date?: string;
};

type UpdateVaccineStatusPayload = {
  id?: string;
  status?: VaccineStatus;
};

function toPtBrDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

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

    const vaccines = docs.map((doc) => {
      const data = doc.data() as {
        name?: string;
        status?: VaccineStatus;
        date?: string;
      };
      const status = data.status === "applied" ? "applied" : "pending";
      const date = typeof data.date === "string" ? data.date : "";

      return {
        id: doc.id,
        name: data.name ?? "Vacina",
        status,
        stateLabel: status === "applied" ? "Aplicada" : "Pendente",
        date,
        dateLabel: toPtBrDate(date),
      };
    });

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
    const ref = await petRef.collection(SUBCOLLECTION_VACCINES).add({
      name: name.slice(0, 80),
      status,
      date,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return NextResponse.json(
      {
        ok: true,
        vaccine: {
          id: ref.id,
          name: name.slice(0, 80),
          status,
          stateLabel: status === "applied" ? "Aplicada" : "Pendente",
          date,
          dateLabel: toPtBrDate(date),
        },
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

  let body: UpdateVaccineStatusPayload;
  try {
    body = (await request.json()) as UpdateVaccineStatusPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = body.status;
  if (!id) {
    return NextResponse.json({ error: "Id da vacina invalido" }, { status: 400 });
  }
  if (!status || !["applied", "pending"].includes(status)) {
    return NextResponse.json({ error: "Status invalido" }, { status: 400 });
  }

  try {
    const nowIso = new Date().toISOString();
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    const canonicalRef = petRef.collection(SUBCOLLECTION_VACCINES).doc(id);
    const legacyRef = petRef.collection(SUBCOLLECTION_VACCINES_LEGACY).doc(id);

    const canonicalSnap = await canonicalRef.get();
    const legacySnap = canonicalSnap.exists ? null : await legacyRef.get();
    const sourceData = (canonicalSnap.exists ? canonicalSnap.data() : legacySnap?.data()) as
      | { name?: string; date?: string; createdAt?: string }
      | undefined;

    if (!sourceData) {
      return NextResponse.json({ error: "Vacina nao encontrada" }, { status: 404 });
    }

    await canonicalRef.set(
      {
        ...(typeof sourceData.name === "string" ? { name: sourceData.name } : {}),
        ...(typeof sourceData.date === "string" ? { date: sourceData.date } : {}),
        ...(typeof sourceData.createdAt === "string" ? { createdAt: sourceData.createdAt } : { createdAt: nowIso }),
        status,
        updatedAt: nowIso,
      },
      { merge: true },
    );

    const refreshed = await canonicalRef.get();
    const data = (refreshed.data() ?? sourceData) as { name?: string; date?: string; status?: VaccineStatus };
    const date = typeof data.date === "string" ? data.date : "";
    const normalizedStatus = data.status === "applied" ? "applied" : "pending";

    return NextResponse.json({
      ok: true,
      vaccine: {
        id,
        name: typeof data.name === "string" && data.name.trim() ? data.name : "Vacina",
        status: normalizedStatus,
        stateLabel: normalizedStatus === "applied" ? "Aplicada" : "Pendente",
        date,
        dateLabel: toPtBrDate(date),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao atualizar status da vacina",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao atualizar vacina.",
      },
      { status: 500 },
    );
  }
}
