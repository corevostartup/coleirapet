import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { SUBCOLLECTION_MEDICATION_REMINDERS } from "@/lib/firebase/collections";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

type CreateMedicationReminderPayload = {
  name?: string;
  dose?: string;
  time?: string;
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
    const snapshot = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).orderBy("createdAt", "desc").limit(30).get();

    const reminders = snapshot.docs.map((doc) => {
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
    const nowIso = new Date().toISOString();
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    const ref = await petRef.collection(SUBCOLLECTION_MEDICATION_REMINDERS).add({
      name: name.slice(0, 80),
      dose: dose.slice(0, 80),
      time,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

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
