import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Diagnostico do runtime serverless (Firebase Admin + Firestore). */
export async function GET() {
  const startedAt = Date.now();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("firebase-admin/app");
    const { getFirebaseAdminDb } = await import("@/lib/firebase/admin");
    const db = getFirebaseAdminDb();
    await db.collection("_health").limit(1).get();
    return NextResponse.json({
      ok: true,
      node: process.version,
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const stack = error instanceof Error ? error.stack?.split("\n").slice(0, 4).join("\n") : undefined;
    console.error("[lyka] health/server failed", error);
    return NextResponse.json(
      {
        ok: false,
        node: process.version,
        ms: Date.now() - startedAt,
        error: message,
        stack,
      },
      { status: 500 },
    );
  }
}
