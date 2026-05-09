import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_VETERINARIANS, SUBCOLLECTION_VET_MEDICAL_RECORDS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

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

async function requireVetAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;

  const user = await getOrCreateCurrentUserProfile(uid);
  if (user.userType !== "vet") return null;
  return { uid };
}

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const petId = new URL(request.url).searchParams.get("petId")?.trim() ?? "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const snapshot = await db
      .collection(COLLECTION_VETERINARIANS)
      .doc(auth.uid)
      .collection(SUBCOLLECTION_VET_MEDICAL_RECORDS)
      .where("petId", "==", petId)
      .limit(200)
      .get();

    const records = snapshot.docs
      .map((doc) => {
        const data = doc.data() as {
          petId?: string;
          petName?: string;
          diagnosis?: string;
          note?: string;
          createdAt?: unknown;
        };
        const createdAtIso = isoFromFirestoreTime(data.createdAt);
        return {
          id: doc.id,
          petId: typeof data.petId === "string" ? data.petId : "",
          petName: typeof data.petName === "string" ? data.petName : "Pet",
          diagnosis: typeof data.diagnosis === "string" ? data.diagnosis : "Registro clinico",
          note: typeof data.note === "string" ? data.note : "",
          createdAtIso,
          when: formatDateTime(createdAtIso),
        };
      })
      .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));

    return NextResponse.json({ records });
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
    const ref = await db
      .collection(COLLECTION_VETERINARIANS)
      .doc(auth.uid)
      .collection(SUBCOLLECTION_VET_MEDICAL_RECORDS)
      .add({
        petId: petId.slice(0, 64),
        petName: petName.slice(0, 80),
        diagnosis: diagnosis.slice(0, 120),
        note: note.slice(0, 1200),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    const written = await ref.get();
    const data = written.data() as { createdAt?: unknown } | undefined;
    const createdAtIso = isoFromFirestoreTime(data?.createdAt);

    return NextResponse.json(
      {
        ok: true,
        record: {
          id: ref.id,
          petId: petId.slice(0, 64),
          petName: petName.slice(0, 80),
          diagnosis: diagnosis.slice(0, 120),
          note: note.slice(0, 1200),
          createdAtIso,
          when: formatDateTime(createdAtIso),
        },
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
