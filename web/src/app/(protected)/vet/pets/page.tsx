 "use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { VetShell } from "@/components/vet-shell";
import { getPetImageOrDefault } from "@/lib/pets/image";

type VetPet = {
  id: string;
  petIdentity: string;
  ownerId: string;
  name: string;
  tutor: string;
  species: string;
  breed: string;
  age: string;
  weight: string;
  allergies: string;
  activeMedication: string;
  lastVisit: string;
  image: string;
  reason: string;
  status: "Aguardando" | "Em triagem" | "Pronto para consulta";
};

export default function VetPetsPage() {
  const [petsQueue, setPetsQueue] = useState<VetPet[]>([]);
  const [petIdSearch, setPetIdSearch] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [loadingPets, setLoadingPets] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRealPets() {
      setLoadingPets(true);
      setPetsError(null);
      try {
        const response = await fetch("/api/vet/pets", { method: "GET", credentials: "include", cache: "no-store" });
        const data = (await response.json()) as {
          error?: string;
          pets?: Array<{
            id: string;
            petIdentity: string;
            ownerId: string;
            name: string;
            breed: string;
            image: string;
            age: number | null;
            weightKg: number | null;
          }>;
        };
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar pets.");

        const normalized: VetPet[] = (data.pets ?? []).map((pet, index) => {
          const statusCycle: Array<VetPet["status"]> = ["Aguardando", "Em triagem", "Pronto para consulta"];
          return {
            id: pet.id,
            petIdentity: typeof pet.petIdentity === "string" && pet.petIdentity.trim() ? pet.petIdentity.trim() : pet.id,
            ownerId: pet.ownerId,
            name: pet.name,
            tutor: `Tutor ${pet.ownerId.slice(0, 6)}`,
            species: "Canino/Felino",
            breed: pet.breed || "Raca nao informada",
            age: pet.age != null ? `${pet.age} anos` : "Idade nao informada",
            weight: pet.weightKg != null ? `${pet.weightKg.toFixed(1)} kg` : "Peso nao informado",
            allergies: "Nao informado",
            activeMedication: "Nao informado",
            lastVisit: "Nao informado",
            image: getPetImageOrDefault(pet.image),
            reason: "Triagem clinica",
            status: statusCycle[index % statusCycle.length],
          };
        });

        if (!active) return;
        setPetsQueue(normalized);
        setSelectedPetId((prev) => (prev && normalized.some((pet) => pet.id === prev) ? prev : (normalized[0]?.id ?? "")));
      } catch (error) {
        if (!active) return;
        setPetsQueue([]);
        setPetsError(error instanceof Error ? error.message : "Falha ao carregar pets.");
      } finally {
        if (active) setLoadingPets(false);
      }
    }

    void loadRealPets();
    return () => {
      active = false;
    };
  }, []);

  const filteredPets = useMemo(() => {
    const q = petIdSearch.trim().toLowerCase();
    if (!q) return petsQueue;
    return petsQueue.filter((pet) => pet.id.toLowerCase().includes(q) || pet.name.toLowerCase().includes(q));
  }, [petIdSearch]);

  const selectedPet = useMemo(() => {
    return petsQueue.find((pet) => pet.id === selectedPetId) ?? null;
  }, [selectedPetId]);

  function handleReadNfcGlobal() {
    const rawIdentity = window.prompt("Aproxime a tag NFC e informe a identidade lida do pet:");
    const identity = rawIdentity?.trim().toUpperCase();
    if (!identity) return;

    const petRead = petsQueue.find((pet) => pet.petIdentity.toUpperCase() === identity);
    if (!petRead) {
      window.alert("Nenhum pet encontrado para a identidade NFC informada.");
      return;
    }

    setSelectedPetId(petRead.id);
    window.alert(`NFC lido com sucesso. Dados de ${petRead.name} carregados.`);
  }

  return (
    <VetShell title="Area medica" subtitle="Veterinario">
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-zinc-900">Busca de pet e fila do dia</h3>
          <button
            type="button"
            onClick={handleReadNfcGlobal}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 transition hover:bg-emerald-100"
          >
            Ler NFC
          </button>
        </div>
        <p className="mt-1 text-[12px] text-zinc-500">Busque por ID do pet ou use Ler NFC para carregar automaticamente os dados do pet lido.</p>

        <div className="mt-3">
          <input
            type="text"
            value={petIdSearch}
            onChange={(event) => setPetIdSearch(event.target.value)}
            placeholder="Buscar por ID (ex: PET-1001) ou nome"
            className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {loadingPets ? <p className="text-[12px] text-zinc-500">Carregando pets reais...</p> : null}
          {petsError ? <p className="text-[12px] text-rose-700">{petsError}</p> : null}
          {filteredPets.map((item, index) => (
            <article key={item.id} className={`bg-zinc-50 px-2.5 py-2 ${index > 0 ? "border-t border-zinc-200" : ""}`}>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-200 bg-white">
                  <Image
                    src={getPetImageOrDefault(item.image)}
                    alt={`Foto de ${item.name}`}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-zinc-800">
                    {item.name} <span className="text-[10px] font-medium text-zinc-500">({item.petIdentity})</span>
                  </p>
                  <p className="truncate text-[10px] text-zinc-500">
                    Tutor: {item.tutor} · {item.reason}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">{item.status}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPetId(item.id)}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Selecionar
                  </button>
                </div>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10px] text-zinc-600">
                <p className="truncate rounded-lg bg-white px-2 py-1">Raca: {item.breed}</p>
                <p className="truncate rounded-lg bg-white px-2 py-1">Idade: {item.age}</p>
                <p className="truncate rounded-lg bg-white px-2 py-1">Peso: {item.weight}</p>
              </div>
            </article>
          ))}
          {!loadingPets && filteredPets.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-zinc-500">
              Nenhum pet real encontrado para a busca informada.
            </p>
          ) : null}
        </div>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "120ms" }}>
        <h3 className="text-[14px] font-semibold text-zinc-900">Resumo clinico do pet selecionado</h3>
        {!selectedPet ? (
          <p className="mt-2 text-[12px] text-zinc-500">Selecione um pet na fila para visualizar os dados.</p>
        ) : (
          <>
            <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="relative h-11 w-11 overflow-hidden rounded-full border border-zinc-200 bg-white">
                  <Image
                    src={getPetImageOrDefault(selectedPet.image)}
                    alt={`Foto de ${selectedPet.name}`}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-800">
                    {selectedPet.name} · {selectedPet.petIdentity}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-600">
                    {selectedPet.species} · {selectedPet.breed} · {selectedPet.age}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Tutor</p>
                <p className="mt-1 text-[12px] font-semibold text-zinc-800">{selectedPet.tutor}</p>
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Peso</p>
                <p className="mt-1 text-[12px] font-semibold text-zinc-800">{selectedPet.weight}</p>
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Alergias</p>
                <p className="mt-1 text-[12px] font-semibold text-zinc-800">{selectedPet.allergies}</p>
              </article>
              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Medicacao ativa</p>
                <p className="mt-1 text-[12px] font-semibold text-zinc-800">{selectedPet.activeMedication}</p>
              </article>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">Ultima consulta registrada: {selectedPet.lastVisit}.</p>
          </>
        )}
      </section>
    </VetShell>
  );
}
