import type { DocumentReference } from "firebase-admin/firestore";
import { getPetAccessById } from "@/lib/pets/access";
import { getOrCreateCurrentPet, listOwnedPets } from "@/lib/pets/current";

export type ResolvedPetContext = {
  petRef: DocumentReference;
  petId: string;
};

/** Pet explicito ou pet atual da lista (mesma fonte do switcher do TopBar). */
export async function resolvePetContextForUser(
  uid: string,
  requestedPetId?: string | null,
): Promise<ResolvedPetContext> {
  const normalizedRequested = typeof requestedPetId === "string" ? requestedPetId.trim() : "";
  if (normalizedRequested) {
    const access = await getPetAccessById(uid, normalizedRequested);
    if (!access) throw new Error("Pet nao encontrado ou sem acesso.");
    return { petRef: access.petRef, petId: normalizedRequested };
  }

  const owned = await listOwnedPets(uid, { readOnly: true });
  const currentPetId = owned.currentPetId || owned.pets[0]?.id || "";
  if (currentPetId) {
    const access = await getPetAccessById(uid, currentPetId);
    if (access) return { petRef: access.petRef, petId: currentPetId };
  }

  const created = await getOrCreateCurrentPet(uid);
  return { petRef: created.petRef, petId: created.pet.id };
}

export function readPetIdFromRequestUrl(request: Request) {
  const petId = new URL(request.url).searchParams.get("petId");
  return typeof petId === "string" && petId.trim() ? petId.trim() : null;
}
