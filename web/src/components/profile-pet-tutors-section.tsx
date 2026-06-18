"use client";

import { useEffect, useState } from "react";
import PetTutorsManager from "@/components/pet-tutors-manager";

const CURRENT_PET_CHANGED_EVENT = "lyka-current-pet-changed";

type Props = {
  initialPetId: string;
  initialPetName: string;
  currentUserUid: string;
  currentTutorCode: string;
  userPlan: "free" | "pro";
};

/** Card de tutores sempre ligado ao pet selecionado no switcher. */
export function ProfilePetTutorsSection({
  initialPetId,
  initialPetName,
  currentUserUid,
  currentTutorCode,
  userPlan,
}: Props) {
  const [petId, setPetId] = useState(initialPetId);
  const [petName, setPetName] = useState(initialPetName);

  useEffect(() => {
    setPetId(initialPetId);
    setPetName(initialPetName);
  }, [initialPetId, initialPetName]);

  useEffect(() => {
    async function syncFromApi() {
      try {
        const res = await fetch("/api/pets/list", { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as {
          currentPetId?: string;
          pets?: Array<{ id: string; name: string }>;
        };
        const nextId =
          typeof payload.currentPetId === "string" && payload.currentPetId.trim()
            ? payload.currentPetId.trim()
            : "";
        if (!nextId) return;
        const nextPet = Array.isArray(payload.pets) ? payload.pets.find((item) => item.id === nextId) : undefined;
        setPetId(nextId);
        if (nextPet?.name?.trim()) setPetName(nextPet.name.trim());
      } catch {
        /* noop */
      }
    }

    function onPetChanged(event: Event) {
      const detail = (event as CustomEvent<{ petId?: string; petName?: string }>).detail;
      if (typeof detail?.petId === "string" && detail.petId.trim()) {
        setPetId(detail.petId.trim());
        if (typeof detail.petName === "string" && detail.petName.trim()) {
          setPetName(detail.petName.trim());
        }
      }
      void syncFromApi();
    }

    window.addEventListener("lyka-pet-data-updated", onPetChanged);
    window.addEventListener(CURRENT_PET_CHANGED_EVENT, onPetChanged);
    return () => {
      window.removeEventListener("lyka-pet-data-updated", onPetChanged);
      window.removeEventListener(CURRENT_PET_CHANGED_EVENT, onPetChanged);
    };
  }, []);

  if (!petId) return null;

  return (
    <PetTutorsManager
      key={petId}
      petId={petId}
      petName={petName}
      currentUserUid={currentUserUid}
      currentTutorCode={currentTutorCode}
      userPlan={userPlan}
    />
  );
}
