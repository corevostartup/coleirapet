"use client";

import { useCallback, useEffect, useState } from "react";

const CURRENT_PET_CHANGED_EVENT = "lyka-current-pet-changed";
const PET_DATA_UPDATED_EVENT = "lyka-pet-data-updated";

export type SelectedPetSnapshot = {
  petId: string;
  petName: string;
};

async function fetchSelectedPetFromApi(): Promise<SelectedPetSnapshot | null> {
  const res = await fetch("/api/pets/list", { cache: "no-store" });
  if (!res.ok) return null;
  const payload = (await res.json()) as {
    currentPetId?: string;
    pets?: Array<{ id: string; name?: string }>;
  };
  const petId = typeof payload.currentPetId === "string" ? payload.currentPetId.trim() : "";
  if (!petId) return null;
  const pet = Array.isArray(payload.pets) ? payload.pets.find((item) => item.id === petId) : undefined;
  return {
    petId,
    petName: typeof pet?.name === "string" && pet.name.trim() ? pet.name.trim() : "",
  };
}

/** Pet selecionado no TopBar — reage a troca e a atualizacoes de dados. */
export function useSelectedPet(initial?: Partial<SelectedPetSnapshot>) {
  const [petId, setPetId] = useState(initial?.petId?.trim() ?? "");
  const [petName, setPetName] = useState(initial?.petName?.trim() ?? "");

  const applySnapshot = useCallback((snapshot: SelectedPetSnapshot | null) => {
    if (!snapshot?.petId) return;
    setPetId(snapshot.petId);
    if (snapshot.petName) setPetName(snapshot.petName);
  }, []);

  useEffect(() => {
    if (initial?.petId?.trim()) setPetId(initial.petId.trim());
    if (initial?.petName?.trim()) setPetName(initial.petName.trim());
  }, [initial?.petId, initial?.petName]);

  useEffect(() => {
    void fetchSelectedPetFromApi().then(applySnapshot);

    function onPetChanged(event: Event) {
      const detail = (event as CustomEvent<{ petId?: string; petName?: string }>).detail;
      if (typeof detail?.petId === "string" && detail.petId.trim()) {
        setPetId(detail.petId.trim());
        if (typeof detail?.petName === "string" && detail.petName.trim()) {
          setPetName(detail.petName.trim());
        }
      }
      void fetchSelectedPetFromApi().then(applySnapshot);
    }

    window.addEventListener(CURRENT_PET_CHANGED_EVENT, onPetChanged);
    window.addEventListener(PET_DATA_UPDATED_EVENT, onPetChanged);
    return () => {
      window.removeEventListener(CURRENT_PET_CHANGED_EVENT, onPetChanged);
      window.removeEventListener(PET_DATA_UPDATED_EVENT, onPetChanged);
    };
  }, [applySnapshot]);

  return { petId, petName };
}

export function petMetricsQuery(petId: string) {
  return petId ? `?petId=${encodeURIComponent(petId)}` : "";
}
