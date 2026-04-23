import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

type VaccineStatus = "applied" | "pending";

type CreateVaccinePayload = {
  name?: string;
  status?: VaccineStatus;
  date?: string;
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

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const db = getFirebaseAdminDb();
  const { petRef } = await getOrCreateCurrentPet(auth.uid);
  let snapshot = await petRef.collection("vaccines").orderBy("createdAt", "desc").get();

  if (snapshot.empty) {
    const legacySnapshot = await db.collection(COLLECTION_USER).doc(auth.uid).collection("vaccines").orderBy("createdAt", "desc").get();
    if (!legacySnapshot.empty) {
      const batch = db.batch();
      for (const legacyDoc of legacySnapshot.docs) {
        batch.set(petRef.collection("vaccines").doc(legacyDoc.id), legacyDoc.data(), { merge: true });
      }
      await batch.commit();
      snapshot = await petRef.collection("vaccines").orderBy("createdAt", "desc").get();
    }
  }

  const vaccines = snapshot.docs.map((doc) => {
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

  const nowIso = new Date().toISOString();
  const { petRef } = await getOrCreateCurrentPet(auth.uid);
  const ref = await petRef.collection("vaccines").add({
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
}
