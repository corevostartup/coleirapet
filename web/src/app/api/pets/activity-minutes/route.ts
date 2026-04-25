import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { SUBCOLLECTION_ACTIVITY_MINUTES } from "@/lib/firebase/collections";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

type CreatePayload = {
  date?: string;
  minutes?: number;
};

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

function formatPtBrDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { petRef } = await getOrCreateCurrentPet(auth.uid);
  const snapshot = await petRef.collection(SUBCOLLECTION_ACTIVITY_MINUTES).orderBy("date", "desc").limit(30).get();

  const entries = snapshot.docs.map((doc) => {
    const data = doc.data() as { date?: string; minutes?: number };
    const date = typeof data.date === "string" ? data.date : "";
    const minutes = typeof data.minutes === "number" ? data.minutes : 0;
    return {
      id: doc.id,
      date,
      dateLabel: formatPtBrDate(date),
      minutes,
    };
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: CreatePayload;
  try {
    body = (await request.json()) as CreatePayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date.trim() : "";
  const minutes = body.minutes;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Data invalida" }, { status: 400 });
  }
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0 || minutes > 1440) {
    return NextResponse.json({ error: "Minutos invalidos" }, { status: 400 });
  }

  const { petRef } = await getOrCreateCurrentPet(auth.uid);
  const nowIso = new Date().toISOString();
  const docId = date;
  await petRef.collection(SUBCOLLECTION_ACTIVITY_MINUTES).doc(docId).set(
    {
      date,
      minutes: Math.round(minutes),
      updatedAt: nowIso,
      createdAt: nowIso,
    },
    { merge: true },
  );

  return NextResponse.json(
    {
      ok: true,
      entry: {
        id: docId,
        date,
        dateLabel: formatPtBrDate(date),
        minutes: Math.round(minutes),
      },
    },
    { status: 201 },
  );
}
