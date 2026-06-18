import { NextResponse } from "next/server";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/** Diagnostico rapido do runtime serverless (Firebase Admin + Firestore). */
export async function GET() {
  const startedAt = Date.now();
  try {
    const db = getFirebaseAdminDb();
    await db.collection("_health").limit(1).get();
    return NextResponse.json({
      ok: true,
      node: process.version,
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        node: process.version,
        ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 },
    );
  }
}
