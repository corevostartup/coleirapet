import { getOrCreateCurrentPet, listOwnedPets } from "@/lib/pets/current";
import { singlePetTopBarSeed, toTopBarQuickPetSeed, type TopBarQuickPetSeed } from "@/lib/pets/top-bar-seed";

/** Dados do pet atual para o TopBar (lista completa + fallback do pet corrente). */
export async function loadTopBarQuickPetSeed(uid: string | null | undefined): Promise<TopBarQuickPetSeed | undefined> {
  if (!uid) return undefined;

  try {
    const petList = await listOwnedPets(uid);
    const fromList = toTopBarQuickPetSeed(petList);
    if (fromList) return fromList;
  } catch {
    /* tenta pet atual */
  }

  try {
    const { pet } = await getOrCreateCurrentPet(uid);
    return singlePetTopBarSeed(pet);
  } catch {
    return undefined;
  }
}
