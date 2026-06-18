import type { PetProfile } from "@/lib/pets/current";

export type TopBarQuickPetItem = {
  id: string;
  name: string;
  breed: string;
  image: string;
  canDeletePet?: boolean;
};

export type TopBarQuickPetSeed = {
  currentPetId: string;
  pets: TopBarQuickPetItem[];
};

export function toTopBarQuickPetSeed(
  data: { currentPetId: string; pets: PetProfile[] } | null | undefined,
): TopBarQuickPetSeed | undefined {
  if (!data?.pets?.length) return undefined;
  return {
    currentPetId: data.currentPetId,
    pets: data.pets.map((pet) => ({
      id: pet.id,
      name: pet.name,
      breed: pet.breed,
      image: pet.image,
      canDeletePet: pet.canDeletePet,
    })),
  };
}

export function singlePetTopBarSeed(pet: PetProfile | null | undefined): TopBarQuickPetSeed | undefined {
  if (!pet) return undefined;
  return {
    currentPetId: pet.id,
    pets: [
      {
        id: pet.id,
        name: pet.name,
        breed: pet.breed,
        image: pet.image,
        canDeletePet: pet.canDeletePet,
      },
    ],
  };
}
