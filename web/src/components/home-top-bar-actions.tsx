"use client";

import { ProfilePetSwitcher } from "@/components/profile-pet-switcher";
import { TopBarNotificationsLink } from "@/components/top-bar-notifications-link";

type PetItem = {
  id: string;
  name: string;
  breed: string;
  image: string;
};

type Props = {
  currentPet: PetItem | null;
  initialPets: PetItem[];
  userPlan: "free" | "pro";
};

export function HomeTopBarActions({ currentPet, initialPets, userPlan }: Props) {
  return (
    <div className="flex items-center gap-2">
      <TopBarNotificationsLink />
      {currentPet ? (
        <ProfilePetSwitcher
          currentPet={currentPet}
          initialPets={initialPets.length > 0 ? initialPets : [currentPet]}
          userPlan={userPlan}
        />
      ) : null}
    </div>
  );
}
