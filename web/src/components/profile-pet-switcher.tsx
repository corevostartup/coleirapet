"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getPetImageOrDefault } from "@/lib/pets/image";
import { filterLegacyUiDemoPetsFromSwitcherList } from "@/lib/pets/legacy-ui-demo-pets";

type PetItem = {
  id: string;
  name: string;
  breed: string;
  image: string;
};

type Props = {
  currentPet: PetItem;
  initialPets: PetItem[];
};

/** Evita itens duplicados por id no seletor. */
function dedupePetsByIdentity(pets: PetItem[]): PetItem[] {
  const seen = new Set<string>();
  const out: PetItem[] = [];
  for (const pet of pets) {
    const key = pet.id.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pet);
  }
  return out;
}

function preparePetsList(pets: PetItem[]) {
  return filterLegacyUiDemoPetsFromSwitcherList(dedupePetsByIdentity(pets));
}

export function ProfilePetSwitcher({ currentPet, initialPets }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busyPetId, setBusyPetId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pets, setPets] = useState(() => preparePetsList(initialPets));
  const [selectedPetId, setSelectedPetId] = useState(currentPet.id);

  useEffect(() => {
    setPets(preparePetsList(initialPets));
  }, [initialPets]);

  useEffect(() => {
    if (pets.length === 0) return;
    if (pets.some((p) => p.id === selectedPetId)) return;
    if (pets.some((p) => p.id === currentPet.id)) {
      setSelectedPetId(currentPet.id);
      return;
    }
    setSelectedPetId(pets[0].id);
  }, [pets, selectedPetId, currentPet.id]);

  const selectedPet = useMemo(() => pets.find((item) => item.id === selectedPetId) ?? currentPet, [currentPet, pets, selectedPetId]);

  async function switchPet(petId: string) {
    if (petId === selectedPetId || busyPetId) {
      setOpen(false);
      return;
    }

    setHint(null);
    setBusyPetId(petId);
    try {
      const res = await fetch("/api/pets/list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId }),
      });

      const payload = (await res.json().catch(() => null)) as
        | {
            error?: string;
            currentPetId?: string;
            pets?: PetItem[];
          }
        | null;

      if (!res.ok) throw new Error(payload?.error ?? "Nao foi possivel trocar de pet.");

      setSelectedPetId(payload?.currentPetId ?? petId);
      if (Array.isArray(payload?.pets)) setPets(preparePetsList(payload.pets as PetItem[]));
      setOpen(false);
      {
        const path = typeof window !== "undefined" ? window.location.pathname : pathname;
        const next = new URLSearchParams(
          typeof window !== "undefined" ? window.location.search : "",
        );
        next.set("_r", String(Date.now()));
        const q = next.toString();
        await router.replace(q ? `${path}?${q}` : `${path}?_r=${Date.now()}`);
        router.refresh();
      }
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Falha ao trocar pet.");
    } finally {
      setBusyPetId(null);
    }
  }

  async function createNewPet() {
    if (busyPetId) return;
    setHint(null);
    setBusyPetId("new-pet");
    try {
      const res = await fetch("/api/pets/list", { method: "POST" });
      const payload = (await res.json().catch(() => null)) as
        | {
            error?: string;
            currentPetId?: string;
            pets?: PetItem[];
          }
        | null;
      if (!res.ok) throw new Error(payload?.error ?? "Nao foi possivel criar novo pet.");

      const nextPets = Array.isArray(payload?.pets) ? preparePetsList(payload.pets as PetItem[]) : pets;
      setPets(nextPets);
      setSelectedPetId(payload?.currentPetId ?? nextPets[0]?.id ?? selectedPetId);
      setOpen(false);
      window.location.assign(`/profile?newPet=1&t=${Date.now()}`);
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Falha ao criar novo pet.");
    } finally {
      setBusyPetId(null);
    }
  }

  return (
    <div className="relative z-[1900]">
      <button
        type="button"
        aria-label="Selecionar outro pet"
        className="relative h-11 w-11 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm"
        onClick={() => setOpen((value) => !value)}
      >
        <Image src={getPetImageOrDefault(selectedPet.image)} alt={`Foto de ${selectedPet.name}`} fill className="object-cover" sizes="44px" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[2000] w-[min(300px,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-[0_22px_40px_-28px_rgba(15,23,42,0.45)]">
          <p className="px-1 pb-2 text-[11px] font-medium text-zinc-500">Trocar pet</p>
          <ul className="space-y-1.5">
            {pets.map((pet) => {
              const active = pet.id === selectedPetId;
              const isSaving = busyPetId === pet.id;
              return (
                <li key={pet.id}>
                  <button
                    type="button"
                    onClick={() => void switchPet(pet.id)}
                    disabled={Boolean(busyPetId)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left transition ${
                      active ? "border-emerald-200 bg-emerald-50/70" : "border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100"
                    }`}
                  >
                    <span className="relative h-9 w-9 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                      <Image src={getPetImageOrDefault(pet.image)} alt={`Foto de ${pet.name}`} fill className="object-cover" sizes="36px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-semibold text-zinc-800">{pet.name}</span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        {pet.breed || "Sem raca"}
                      </span>
                    </span>
                    <span className="ml-auto text-[10px] font-semibold text-emerald-700">{isSaving ? "..." : active ? "Atual" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => void createNewPet()}
            disabled={Boolean(busyPetId)}
            className="mt-2 flex w-full items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/70 px-2 py-2 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-70"
          >
            {busyPetId === "new-pet" ? "Criando..." : "Novo pet"}
          </button>
          {hint ? <p className="px-1 pt-2 text-[11px] text-rose-600">{hint}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
