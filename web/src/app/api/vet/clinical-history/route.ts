import { NextResponse } from "next/server";
import { COLLECTION_PETS } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { loadPetClinicalHistory } from "@/lib/pets/clinical-history";
import { requireVetAuthContext, veterinarianFromAuth } from "@/lib/veterinarians/auth";

export async function GET(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const petId = new URL(request.url).searchParams.get("petId")?.trim() ?? "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });

  try {
    const db = getFirebaseAdminDb();
    const petRef = db.collection(COLLECTION_PETS).doc(petId);
    const petSnap = await petRef.get();
    if (!petSnap.exists) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const history = await loadPetClinicalHistory(petRef, petId);
    return NextResponse.json({ history, petId, veterinarian: veterinarianFromAuth(auth) });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar historico clinico",
        detail: error instanceof Error ? error.message : "Erro desconhecido ao consultar historico clinico.",
      },
      { status: 500 },
    );
  }
}
