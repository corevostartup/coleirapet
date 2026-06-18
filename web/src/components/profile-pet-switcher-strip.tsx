"use client";

import ProfilePetSwitcher from "@/components/profile-pet-switcher";
import { PetAvatarImage } from "@/components/pet-avatar-image";
import type { TopBarQuickPetSeed } from "@/lib/pets/top-bar-seed";

type Props = {
  seed?: TopBarQuickPetSeed;
  userPlan: "free" | "pro";
};

/** Faixa de troca de pet na tela Perfil — foto real + menu quando ha mais de um pet. */
export function ProfilePetSwitcherStrip({ seed, userPlan }: Props) {
  if (!seed?.pets?.length) return null;

  const currentPet = seed.pets.find((item) => item.id === seed.currentPetId) ?? seed.pets[0];

  return (
    <section
      className="appear-up mt-2 flex items-center gap-3 rounded-[22px] border border-zinc-200 bg-white px-3 py-2.5 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)]"
      style={{ animationDelay: "40ms" }}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50">
        <PetAvatarImage
          src={currentPet.image}
          alt={`Foto de ${currentPet.name}`}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Pet atual</p>
        <p className="truncate text-[14px] font-semibold text-zinc-900">{currentPet.name}</p>
        <p className="truncate text-[11px] text-zinc-500">{currentPet.breed || "Sem raca"}</p>
      </div>
      <ProfilePetSwitcher currentPet={currentPet} initialPets={seed.pets} userPlan={userPlan} />
    </section>
  );
}
