import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { SUBCOLLECTION_MEDICATION_REMINDERS } from "@/lib/firebase/collections";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

/** Persistência: `Pets/{petId}/medicationReminders/{docId}` (Firebase Admin SDK; não depende do cliente). */

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

function reminderDocSortKey(data: { createdAt?: unknown; updatedAt?: unknown }) {
  return isoFromFirestoreTime(data.createdAt) || isoFromFirestoreTime(data.updatedAt) || "";
}

type CreateMedicationReminderPayload = {
  name?: string;
  dose?: string;
  time?: string;
};

type UpdateMedicationReminderPayload = CreateMedicationReminderPayload & {
  id?: string;
};

function formatTimeLabel(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return value;
  return `${value}h`;
}

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  try {
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    /** Sem `orderBy` no servidor: evita falha por índice ausente e inclui docs legados sem `createdAt`. Ordenação no processo. */
    const snapshot = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).limit(120).get();
    const sorted = [...snapshot.docs].sort((a, b) =>
      reminderDocSortKey(b.data()).localeCompare(reminderDocSortKey(a.data())),
    );
    const top = sorted.slice(0, 30);

    const reminders = top.map((doc) => {
      const data = doc.data() as { name?: string; dose?: string; time?: string };
      const name = typeof data.name === "string" ? data.name.trim() : "";
      const dose = typeof data.dose === "string" ? data.dose.trim() : "";
      const time = typeof data.time === "string" ? data.time.trim() : "";
      return {
        id: doc.id,
        name: name || "Medicacao",
        dose: dose || "Dose nao informada",
        time,
        timeLabel: formatTimeLabel(time),
      };
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar lembretes",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao consultar lembretes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: CreateMedicationReminderPayload;
  try {
    body = (await request.json()) as CreateMedicationReminderPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const dose = typeof body.dose === "string" ? body.dose.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";

  if (!name || name.length < 2) return NextResponse.json({ error: "Nome da medicacao invalido" }, { status: 400 });
  if (!dose || dose.length < 2) return NextResponse.json({ error: "Dose invalida" }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: "Horario invalido" }, { status: 400 });

  try {
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    const ref = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).add({
      name: name.slice(0, 80),
      dose: dose.slice(0, 80),
      time,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const written = await ref.get();
    if (!written.exists) {
      return NextResponse.json(
        { error: "Gravacao nao confirmada no Firestore.", detail: "Documento ausente apos create." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        reminder: {
          id: ref.id,
          name: name.slice(0, 80),
          dose: dose.slice(0, 80),
          time,
          timeLabel: formatTimeLabel(time),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao cadastrar lembrete",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao cadastrar lembrete.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: UpdateMedicationReminderPayload;
  try {
    body = (await request.json()) as UpdateMedicationReminderPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const dose = typeof body.dose === "string" ? body.dose.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";

  if (!id) return NextResponse.json({ error: "Id do lembrete invalido" }, { status: 400 });
  if (!name || name.length < 2) return NextResponse.json({ error: "Nome da medicacao invalido" }, { status: 400 });
  if (!dose || dose.length < 2) return NextResponse.json({ error: "Dose invalida" }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: "Horario invalido" }, { status: 400 });

  try {
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    const docRef = petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Lembrete nao encontrado" }, { status: 404 });
    }

    await docRef.update({
      name: name.slice(0, 80),
      dose: dose.slice(0, 80),
      time,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const after = await docRef.get();
    if (!after.exists) {
      return NextResponse.json(
        { error: "Atualizacao nao confirmada no Firestore.", detail: "Documento ausente apos update." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      reminder: {
        id,
        name: name.slice(0, 80),
        dose: dose.slice(0, 80),
        time,
        timeLabel: formatTimeLabel(time),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao atualizar lembrete",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao atualizar lembrete.",
      },
      { status: 500 },
    );
  }
}
