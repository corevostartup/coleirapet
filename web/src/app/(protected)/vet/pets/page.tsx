"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { VetShell } from "@/components/vet-shell";
import { getPetImageOrDefault } from "@/lib/pets/image";

type VetPetSummary = {
  id: string;
  petIdentity: string;
  ownerId: string;
  name: string;
  tutorName: string;
  breed: string;
  image: string;
  age: number | null;
  weightKg: number | null;
  notes: string;
};

const SEARCH_HELP_TEXT =
  "Digite nome ou ID do pet para buscar, ou use Ler NFC. Apos selecionar, preencha a triagem e envie para a fila.";

const SYMPTOM_DURATION_OPTIONS = [
  "Nao informado",
  "Hoje",
  "1-2 dias",
  "3-7 dias",
  "Mais de 1 semana",
  "Mais de 1 mes",
] as const;

const URGENCY_OPTIONS = ["Rotina", "Moderada", "Urgente", "Emergencia"] as const;

function formatAge(age: number | null) {
  if (age == null) return "Idade nao informada";
  return `${age} ${age === 1 ? "ano" : "anos"}`;
}

function formatWeight(weightKg: number | null) {
  if (weightKg == null) return "Peso nao informado";
  return `${weightKg.toFixed(1).replace(/\.0$/, "")} kg`;
}

export default function VetPetsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [searchResults, setSearchResults] = useState<VetPetSummary[]>([]);
  const [recentPets, setRecentPets] = useState<VetPetSummary[]>([]);
  const [selectedPet, setSelectedPet] = useState<VetPetSummary | null>(null);
  const [searchVisible, setSearchVisible] = useState(true);
  const [searching, setSearching] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingTriage, setSubmittingTriage] = useState(false);

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [symptomDuration, setSymptomDuration] = useState<string>(SYMPTOM_DURATION_OPTIONS[0]);
  const [urgency, setUrgency] = useState<string>(URGENCY_OPTIONS[0]);
  const [temperature, setTemperature] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const loadRecentPets = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const response = await fetch("/api/vet/appointments", { credentials: "include", cache: "no-store" });
      const data = (await response.json()) as {
        error?: string;
        appointments?: Array<{
          petId: string;
          petName: string;
          petIdentity: string;
          tutorName: string;
        }>;
      };
      if (!response.ok) throw new Error(data.error ?? "Falha ao carregar recentes.");

      const seen = new Set<string>();
      const mapped: VetPetSummary[] = [];
      for (const item of data.appointments ?? []) {
        if (seen.has(item.petId)) continue;
        seen.add(item.petId);
        mapped.push({
          id: item.petId,
          petIdentity: item.petIdentity,
          ownerId: "",
          name: item.petName,
          tutorName: item.tutorName,
          breed: "—",
          image: "",
          age: null,
          weightKg: null,
          notes: "",
        });
        if (mapped.length >= 8) break;
      }
      setRecentPets(mapped);
    } catch (err) {
      setRecentPets([]);
      setError(err instanceof Error ? err.message : "Falha ao carregar recentes.");
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void loadRecentPets();
  }, [mounted, loadRecentPets]);

  useEffect(() => {
    const q = petSearch.trim();
    const minLength = /^[A-Z0-9]{8}$/i.test(q) ? 1 : 2;
    if (q.length < minLength) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    setSearching(true);
    setError(null);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/vet/pets?q=${encodeURIComponent(q)}`, {
            credentials: "include",
            cache: "no-store",
          });
          const data = (await response.json()) as { error?: string; pets?: VetPetSummary[] };
          if (!response.ok) throw new Error(data.error ?? "Falha na busca.");
          if (!active) return;
          setSearchResults(data.pets ?? []);
        } catch (err) {
          if (!active) return;
          setSearchResults([]);
          setError(err instanceof Error ? err.message : "Falha na busca.");
        } finally {
          if (active) setSearching(false);
        }
      })();
    }, 320);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [petSearch]);

  const recentBelowSummary = useMemo(() => {
    if (!selectedPet) return recentPets;
    return recentPets.filter((pet) => pet.id !== selectedPet.id);
  }, [recentPets, selectedPet]);

  function resetTriageForm() {
    setChiefComplaint("");
    setSymptoms("");
    setSymptomDuration(SYMPTOM_DURATION_OPTIONS[0]);
    setUrgency(URGENCY_OPTIONS[0]);
    setTemperature("");
    setAdditionalNotes("");
  }

  async function handleSelectPet(pet: VetPetSummary) {
    if (!pet.breed || pet.breed === "—") {
      try {
        const response = await fetch(`/api/vet/pets?petId=${encodeURIComponent(pet.id)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as { pet?: VetPetSummary };
        if (response.ok && data.pet) {
          setSelectedPet(data.pet);
          setSearchVisible(false);
          setPetSearch("");
          setSearchResults([]);
          resetTriageForm();
          setError(null);
          return;
        }
      } catch {
        // usa resumo parcial abaixo
      }
    }

    setSelectedPet(pet);
    setSearchVisible(false);
    setPetSearch("");
    setSearchResults([]);
    resetTriageForm();
    setError(null);
  }

  function handleChangePet() {
    setSearchVisible(true);
    setSelectedPet(null);
    setPetSearch("");
    setSearchResults([]);
    resetTriageForm();
  }

  async function handleReadNfcGlobal() {
    const rawIdentity = window.prompt("Aproxime a tag NFC e informe a identidade lida do pet:");
    const identity = rawIdentity?.trim().toUpperCase();
    if (!identity) return;

    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/vet/pets?q=${encodeURIComponent(identity)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json()) as { error?: string; pets?: VetPetSummary[] };
      if (!response.ok) throw new Error(data.error ?? "Falha na leitura NFC.");

      const petRead =
        (data.pets ?? []).find((pet) => pet.petIdentity.toUpperCase() === identity) ?? (data.pets ?? [])[0] ?? null;

      if (!petRead) {
        window.alert("Nenhum pet encontrado para a identidade NFC informada.");
        return;
      }

      handleSelectPet(petRead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na leitura NFC.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmitTriage() {
    if (!selectedPet) return;
    if (!chiefComplaint.trim()) {
      setError("Informe a queixa principal do tutor.");
      return;
    }

    setSubmittingTriage(true);
    setError(null);
    try {
      const response = await fetch("/api/vet/appointments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId: selectedPet.id,
          chiefComplaint: chiefComplaint.trim(),
          symptoms: symptoms.trim(),
          symptomDuration,
          urgency,
          temperature: temperature.trim(),
          additionalNotes: additionalNotes.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(data.detail ?? data.error ?? "Falha ao registrar triagem.");
      }

      router.push("/vet/atendidos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar triagem.");
    } finally {
      setSubmittingTriage(false);
    }
  }

  function renderPetRow(pet: VetPetSummary, actionLabel = "Triar") {
    return (
      <article key={pet.id} className="bg-zinc-50 px-2.5 py-2 not-first:border-t not-first:border-zinc-200">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-zinc-200 bg-white">
            <Image
              src={getPetImageOrDefault(pet.image)}
              alt={`Foto de ${pet.name}`}
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-zinc-800">
              {pet.name} <span className="text-[10px] font-medium text-zinc-500">({pet.petIdentity})</span>
            </p>
            <p className="truncate text-[10px] text-zinc-500">Tutor: {pet.tutorName}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSelectPet(pet)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {actionLabel}
          </button>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10px] text-zinc-600">
          <p className="truncate rounded-lg bg-white px-2 py-1">Raca: {pet.breed}</p>
          <p className="truncate rounded-lg bg-white px-2 py-1">Idade: {formatAge(pet.age)}</p>
          <p className="truncate rounded-lg bg-white px-2 py-1">Peso: {formatWeight(pet.weightKg)}</p>
        </div>
      </article>
    );
  }

  const searchQuery = petSearch.trim();
  const minQueryLength = /^[A-Z0-9]{8}$/i.test(searchQuery) ? 1 : 2;
  const hasActiveSearch = searchQuery.length >= minQueryLength;
  const showSearchPanel = !mounted || searchVisible;

  const inputClassName =
    "h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";

  return (
    <VetShell title="Triagem" subtitle="Area medica">
      <section
        className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-zinc-900">Busca de pet</h3>
          <button
            type="button"
            onClick={() => void handleReadNfcGlobal()}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 transition hover:bg-emerald-100"
          >
            Ler NFC
          </button>
        </div>

        {showSearchPanel ? (
          <>
            <p className="mt-1 text-[12px] text-zinc-500">{SEARCH_HELP_TEXT}</p>

            <div className="mt-3">
              <input
                type="text"
                value={petSearch}
                onChange={(event) => setPetSearch(event.target.value)}
                placeholder="Buscar por ID (ex: AB12CD34) ou nome"
                className={`${inputClassName} w-full`}
                autoFocus={mounted}
              />
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {!hasActiveSearch ? (
                <p className="px-3 py-4 text-center text-[12px] text-zinc-500">
                  Informe ao menos 2 caracteres (ou a identidade NFC de 8 caracteres) para buscar.
                </p>
              ) : searching ? (
                <p className="px-3 py-4 text-center text-[12px] text-zinc-500">Buscando pets...</p>
              ) : searchResults.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-zinc-500">Nenhum pet encontrado para esta busca.</p>
              ) : (
                searchResults.map((pet) => renderPetRow(pet))
              )}
            </div>
          </>
        ) : mounted && selectedPet ? (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-emerald-200 bg-white">
                  <Image
                    src={getPetImageOrDefault(selectedPet.image)}
                    alt={`Foto de ${selectedPet.name}`}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-emerald-950">
                    {selectedPet.name} · {selectedPet.petIdentity}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-emerald-900/80">Tutor: {selectedPet.tutorName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleChangePet}
                className="shrink-0 rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Trocar pet
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-2 text-[12px] font-medium text-rose-700">{error}</p> : null}
      </section>

      <section
        className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
        style={{ animationDelay: "120ms" }}
      >
        <h3 className="text-[14px] font-semibold text-zinc-900">Formulario de triagem</h3>
        <p className="mt-1 text-[12px] text-zinc-500">
          Preencha os dados clinicos iniciais. Ao confirmar, o pet entra na fila de atendimentos.
        </p>

        {!mounted || !selectedPet ? (
          <p className="mt-3 text-[12px] text-zinc-500">Selecione um pet na busca para iniciar a triagem.</p>
        ) : (
          <>
            <div className="mt-3 grid gap-2">
              <label className="grid gap-1">
                <span className="text-[11px] font-semibold text-zinc-700">Queixa principal *</span>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(event) => setChiefComplaint(event.target.value)}
                  placeholder="Ex.: Vomito, coceira, consulta de rotina"
                  className={inputClassName}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-semibold text-zinc-700">Sintomas observados</span>
                <textarea
                  value={symptoms}
                  onChange={(event) => setSymptoms(event.target.value)}
                  placeholder="Descreva os sintomas relatados pelo tutor"
                  rows={3}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold text-zinc-700">Tempo dos sintomas</span>
                  <select
                    value={symptomDuration}
                    onChange={(event) => setSymptomDuration(event.target.value)}
                    className={inputClassName}
                  >
                    {SYMPTOM_DURATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-[11px] font-semibold text-zinc-700">Urgencia</span>
                  <select value={urgency} onChange={(event) => setUrgency(event.target.value)} className={inputClassName}>
                    {URGENCY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-[11px] font-semibold text-zinc-700">Temperatura (opcional)</span>
                <input
                  type="text"
                  value={temperature}
                  onChange={(event) => setTemperature(event.target.value)}
                  placeholder="Ex.: 38.5 C"
                  className={inputClassName}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-semibold text-zinc-700">Observacoes adicionais</span>
                <textarea
                  value={additionalNotes}
                  onChange={(event) => setAdditionalNotes(event.target.value)}
                  placeholder="Historico relevante, medicamentos em uso, alimentacao, etc."
                  rows={2}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleSubmitTriage()}
                disabled={submittingTriage || !chiefComplaint.trim()}
                className="mt-1 h-11 rounded-xl border border-emerald-200 bg-emerald-50 text-[12px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                {submittingTriage ? "Enviando..." : "Confirmar triagem e enviar para fila"}
              </button>
            </div>

            <div className="mt-4 border-t border-zinc-100 pt-3">
              <h4 className="text-[13px] font-semibold text-zinc-900">Resumo do pet</h4>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Raca</p>
                  <p className="mt-1 text-[12px] font-semibold text-zinc-800">{selectedPet.breed}</p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Idade</p>
                  <p className="mt-1 text-[12px] font-semibold text-zinc-800">{formatAge(selectedPet.age)}</p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Peso</p>
                  <p className="mt-1 text-[12px] font-semibold text-zinc-800">{formatWeight(selectedPet.weightKg)}</p>
                </article>
                <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">Obs. cadastro</p>
                  <p className="mt-1 truncate text-[12px] font-semibold text-zinc-800">
                    {selectedPet.notes.trim() || "Nao informado"}
                  </p>
                </article>
              </div>
            </div>
          </>
        )}

        <div className="mt-4 border-t border-zinc-100 pt-3">
          <h4 className="text-[13px] font-semibold text-zinc-900">Triagens recentes</h4>
          <p className="mt-0.5 text-[11px] text-zinc-500">Pets consultados recentemente nesta area medica.</p>

          <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {loadingRecent ? (
              <p className="px-3 py-4 text-center text-[12px] text-zinc-500">Carregando recentes...</p>
            ) : recentBelowSummary.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-zinc-500">
                Nenhum pet recente. Busque um pet para iniciar a triagem.
              </p>
            ) : (
              recentBelowSummary.map((pet) => renderPetRow(pet, "Triar"))
            )}
          </div>
        </div>
      </section>
    </VetShell>
  );
}
