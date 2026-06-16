"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ProfilePetSwitcher } from "@/components/profile-pet-switcher";
import { TopBarNotificationsLink } from "@/components/top-bar-notifications-link";

type PetItem = {
  id: string;
  name: string;
  breed: string;
  image: string;
};

type PetsListPayload = {
  currentPetId?: string;
  pets?: PetItem[];
};

type CurrentUserPayload = {
  user?: { plan?: "free" | "pro" };
};

export function TopBarUserQuickActions() {
  const pathname = usePathname();
  const [pets, setPets] = useState<PetItem[]>([]);
  const [currentPetId, setCurrentPetId] = useState("");
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");

  const isHiddenContext =
    pathname?.startsWith("/lyka-admin-x7k9m2p4q8r1") ||
    pathname?.startsWith("/vet") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/criar-conta");

  useEffect(() => {
    if (isHiddenContext) return;
    let cancelled = false;

    async function loadQuickData() {
      try {
        const [petsRes, userRes] = await Promise.all([
          fetch("/api/pets/list", { cache: "no-store" }),
          fetch("/api/users/current", { cache: "no-store" }),
        ]);

        if (!cancelled && petsRes.ok) {
          const payload = (await petsRes.json()) as PetsListPayload;
          setPets(Array.isArray(payload.pets) ? payload.pets : []);
          setCurrentPetId(typeof payload.currentPetId === "string" ? payload.currentPetId : "");
        }

        if (!cancelled && userRes.ok) {
          const payload = (await userRes.json()) as CurrentUserPayload;
          setUserPlan(payload.user?.plan === "pro" ? "pro" : "free");
        }
      } catch {
        /* noop */
      }
    }

    void loadQuickData();
    return () => {
      cancelled = true;
    };
  }, [isHiddenContext]);

  const currentPet = useMemo(() => {
    if (pets.length === 0) return null;
    return pets.find((item) => item.id === currentPetId) ?? pets[0];
  }, [currentPetId, pets]);

  if (isHiddenContext) return null;

  return (
    <div className="flex items-center gap-2">
      <TopBarNotificationsLink />
      {currentPet ? <ProfilePetSwitcher currentPet={currentPet} initialPets={pets} userPlan={userPlan} /> : null}
    </div>
  );
}
