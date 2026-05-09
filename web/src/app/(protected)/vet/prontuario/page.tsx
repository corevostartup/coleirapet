"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { VetShell } from "@/components/vet-shell";
import { getPetImageOrDefault } from "@/lib/pets/image";

type PetOption = { id: string; petIdentity: string; name: string; image: string };
type ClinicalRecord = { id: string; petId: string; petName: string; note: string; diagnosis: string; when: string };
type VaccineRecord = {
  id: string;
  petId: string;
  petName: string;
  vaccine: string;
  date: string;
  nextDose: string;
  observation: string;
  prescribedByName: string;
  prescribedByCrmv: string;
};
type MedicationRecord = {
  id: string;
  petId: string;
  petName: string;
  medication: string;
  dosage: string;
  duration: string;
  observation: string;
  prescribedByName: string;
  prescribedByCrmv: string;
};

export default function VetProntuarioPage() {
  const [mounted, setMounted] = useState(false);
  const [petOptions, setPetOptions] = useState<PetOption[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [vaccinesLoading, setVaccinesLoading] = useState(false);
  const [medicationsLoading, setMedicationsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [vaccinesError, setVaccinesError] = useState<string | null>(null);
  const [medicationsError, setMedicationsError] = useState<string | null>(null);
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [submittingVaccine, setSubmittingVaccine] = useState(false);
  const [submittingMedication, setSubmittingMedication] = useState(false);
  const [vaccineSuccessMessage, setVaccineSuccessMessage] = useState<string | null>(null);
  const [medicationSuccessMessage, setMedicationSuccessMessage] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [vaccineDate, setVaccineDate] = useState("");
  const [nextDose, setNextDose] = useState("");
  const [vaccineObservation, setVaccineObservation] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [duration, setDuration] = useState("");
  const [medicationObservation, setMedicationObservation] = useState("");

  const selectedPet = useMemo(() => petOptions.find((pet) => pet.id === selectedPetId) ?? null, [petOptions, selectedPetId]);

  const petRecords = useMemo(() => records.filter((item) => item.petId === selectedPetId), [records, selectedPetId]);
  const petVaccines = useMemo(() => vaccines.filter((item) => item.petId === selectedPetId), [vaccines, selectedPetId]);
  const petMedications = useMemo(() => medications.filter((item) => item.petId === selectedPetId), [medications, selectedPetId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRealPets() {
      setPetsLoading(true);
      setPetsError(null);
      try {
        const response = await fetch("/api/vet/pets", { method: "GET", credentials: "include", cache: "no-store" });
        const data = (await response.json()) as {
          error?: string;
          pets?: Array<{ id: string; petIdentity: string; name: string; image: string }>;
        };
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar pets.");
        const mapped: PetOption[] = (data.pets ?? []).map((pet) => ({
          id: pet.id,
          petIdentity: typeof pet.petIdentity === "string" && pet.petIdentity.trim() ? pet.petIdentity.trim() : pet.id,
          name: pet.name,
          image: getPetImageOrDefault(pet.image),
        }));

        if (!active) return;
        setPetOptions(mapped);
        setSelectedPetId((prev) => (prev && mapped.some((pet) => pet.id === prev) ? prev : (mapped[0]?.id ?? "")));
      } catch (error) {
        if (!active) return;
        setPetOptions([]);
        setPetsError(error instanceof Error ? error.message : "Falha ao carregar pets.");
      } finally {
        if (active) setPetsLoading(false);
      }
    }

    void loadRealPets();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedPetId) {
      setVaccines([]);
      setVaccinesLoading(false);
      return;
    }
    let active = true;

    async function loadVaccines() {
      setVaccinesLoading(true);
      setVaccinesError(null);
      try {
        const response = await fetch(`/api/vet/vaccines?petId=${encodeURIComponent(selectedPetId)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          error?: string;
          vaccines?: Array<{
            id: string;
            petId: string;
            name: string;
            date: string;
            nextDose: string;
            observation: string;
            prescribedByName: string;
            prescribedByCrmv: string;
          }>;
        };
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar vacinas.");
        if (!active) return;
        const normalized = (data.vaccines ?? []).map((item) => ({
          id: item.id,
          petId: item.petId,
          petName: selectedPet?.name ?? "Pet",
          vaccine: item.name,
          date: item.date,
          nextDose: item.nextDose || "Nao informado",
          observation: item.observation || "",
          prescribedByName: item.prescribedByName || "Veterinario",
          prescribedByCrmv: item.prescribedByCrmv || "Nao informado",
        }));
        setVaccines(normalized);
      } catch (error) {
        if (!active) return;
        setVaccines([]);
        setVaccinesError(error instanceof Error ? error.message : "Falha ao carregar vacinas.");
      } finally {
        if (active) setVaccinesLoading(false);
      }
    }

    void loadVaccines();
    return () => {
      active = false;
    };
  }, [selectedPet?.name, selectedPetId]);

  useEffect(() => {
    if (!selectedPetId) {
      setMedications([]);
      setMedicationsLoading(false);
      return;
    }
    let active = true;

    async function loadMedications() {
      setMedicationsLoading(true);
      setMedicationsError(null);
      try {
        const response = await fetch(`/api/vet/medications?petId=${encodeURIComponent(selectedPetId)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          error?: string;
          medications?: Array<{
            id: string;
            petId: string;
            name: string;
            dosage: string;
            duration: string;
            observation: string;
            prescribedByName: string;
            prescribedByCrmv: string;
          }>;
        };
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar medicacoes.");
        if (!active) return;
        const normalized = (data.medications ?? []).map((item) => ({
          id: item.id,
          petId: item.petId,
          petName: selectedPet?.name ?? "Pet",
          medication: item.name,
          dosage: item.dosage || "Dose nao informada",
          duration: item.duration || "Nao informado",
          observation: item.observation || "",
          prescribedByName: item.prescribedByName || "Veterinario",
          prescribedByCrmv: item.prescribedByCrmv || "Nao informado",
        }));
        setMedications(normalized);
      } catch (error) {
        if (!active) return;
        setMedications([]);
        setMedicationsError(error instanceof Error ? error.message : "Falha ao carregar medicacoes.");
      } finally {
        if (active) setMedicationsLoading(false);
      }
    }

    void loadMedications();
    return () => {
      active = false;
    };
  }, [selectedPet?.name, selectedPetId]);

  useEffect(() => {
    if (!vaccineSuccessMessage) return;
    const timeout = window.setTimeout(() => setVaccineSuccessMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [vaccineSuccessMessage]);

  useEffect(() => {
    if (!medicationSuccessMessage) return;
    const timeout = window.setTimeout(() => setMedicationSuccessMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [medicationSuccessMessage]);

  useEffect(() => {
    if (!selectedPetId) {
      setRecords([]);
      setRecordsLoading(false);
      return;
    }
    let active = true;

    async function loadRecords() {
      setRecordsLoading(true);
      setRecordsError(null);
      try {
        const response = await fetch(`/api/vet/prontuario?petId=${encodeURIComponent(selectedPetId)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          error?: string;
          records?: ClinicalRecord[];
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar prontuario.");
        }
        if (active) setRecords(Array.isArray(data.records) ? data.records : []);
      } catch (error) {
        if (active) {
          setRecords([]);
          setRecordsError(error instanceof Error ? error.message : "Falha ao carregar prontuario.");
        }
      } finally {
        if (active) setRecordsLoading(false);
      }
    }

    void loadRecords();
    return () => {
      active = false;
    };
  }, [selectedPetId]);

  async function addClinicalRecord() {
    if (!selectedPet) return;
    if (!note.trim() || !diagnosis.trim()) return;
    setSubmittingRecord(true);
    setRecordsError(null);
    try {
      const response = await fetch("/api/vet/prontuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          petId: selectedPet.id,
          petName: selectedPet.name,
          diagnosis: diagnosis.trim(),
          note: note.trim(),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        record?: ClinicalRecord;
      };
      if (!response.ok || !data.record) {
        throw new Error(data.error ?? "Falha ao adicionar prontuario.");
      }
      setRecords((prev) => [data.record as ClinicalRecord, ...prev]);
      setNote("");
      setDiagnosis("");
    } catch (error) {
      setRecordsError(error instanceof Error ? error.message : "Falha ao adicionar prontuario.");
    } finally {
      setSubmittingRecord(false);
    }
  }

  function addVaccine() {
    if (!selectedPet) return;
    if (!vaccineName.trim() || !vaccineDate.trim()) return;
    const confirmed = window.confirm(`Confirmar adicao da vacina "${vaccineName.trim()}" para ${selectedPet.name}?`);
    if (!confirmed) return;

    setSubmittingVaccine(true);
    setVaccinesError(null);
    void (async () => {
      try {
        const response = await fetch("/api/vet/vaccines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            petId: selectedPet.id,
            name: vaccineName.trim(),
            date: vaccineDate.trim(),
            nextDose: nextDose.trim(),
            observation: vaccineObservation.trim(),
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          vaccine?: {
            id: string;
            petId: string;
            name: string;
            date: string;
            nextDose: string;
            observation: string;
            prescribedByName: string;
            prescribedByCrmv: string;
          };
        };
        if (!response.ok || !data.vaccine) {
          throw new Error(data.error ?? "Falha ao adicionar vacina.");
        }

        const created = data.vaccine;
        setVaccines((prev) => [
          {
            id: created.id,
            petId: created.petId,
            petName: selectedPet.name,
            vaccine: created.name,
            date: created.date,
            nextDose: created.nextDose,
            observation: created.observation || "",
            prescribedByName: created.prescribedByName,
            prescribedByCrmv: created.prescribedByCrmv,
          },
          ...prev,
        ]);
        setVaccineName("");
        setVaccineDate("");
        setNextDose("");
        setVaccineObservation("");
        setVaccineSuccessMessage("Vacina adicionada com sucesso.");
      } catch (error) {
        setVaccinesError(error instanceof Error ? error.message : "Falha ao adicionar vacina.");
      } finally {
        setSubmittingVaccine(false);
      }
    })();
  }

  function addMedication() {
    if (!selectedPet) return;
    if (!medicationName.trim() || !dosage.trim()) return;
    setSubmittingMedication(true);
    setMedicationsError(null);
    void (async () => {
      try {
        const response = await fetch("/api/vet/medications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            petId: selectedPet.id,
            name: medicationName.trim(),
            dosage: dosage.trim(),
            duration: duration.trim(),
            observation: medicationObservation.trim(),
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          medication?: {
            id: string;
            petId: string;
            name: string;
            dosage: string;
            duration: string;
            observation: string;
            prescribedByName: string;
            prescribedByCrmv: string;
          };
        };
        if (!response.ok || !data.medication) throw new Error(data.error ?? "Falha ao adicionar medicacao.");

        const created = data.medication;
        setMedications((prev) => [
          {
            id: created.id,
            petId: created.petId,
            petName: selectedPet.name,
            medication: created.name,
            dosage: created.dosage,
            duration: created.duration,
            observation: created.observation || "",
            prescribedByName: created.prescribedByName || "Veterinario",
            prescribedByCrmv: created.prescribedByCrmv || "Nao informado",
          },
          ...prev,
        ]);

        setMedicationName("");
        setDosage("");
        setDuration("");
        setMedicationObservation("");
        setMedicationSuccessMessage("Medicacao adicionada com sucesso.");
      } catch (error) {
        setMedicationsError(error instanceof Error ? error.message : "Falha ao adicionar medicacao.");
      } finally {
        setSubmittingMedication(false);
      }
    })();
  }

  return (
    <VetShell title="Prontuario" subtitle="Area medica">
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-zinc-900">Gestao de prontuario do pet</h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">Persistido</span>
        </div>
        <p className="text-[12px] text-zinc-500">Selecione um pet, consulte historicos e adicione prontuario, vacinas e medicacao.</p>

        {selectedPet ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <div className="relative h-11 w-11 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
              <Image
                src={getPetImageOrDefault(selectedPet.image)}
                alt={`Foto de ${selectedPet.name}`}
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-zinc-800">
                {selectedPet.name} <span className="text-[10px] font-medium text-zinc-500">({selectedPet.petIdentity})</span>
              </p>
            </div>
          </div>
        ) : null}

        <select
          value={selectedPetId}
          onChange={(event) => setSelectedPetId(event.target.value)}
          disabled={mounted ? petsLoading || petOptions.length === 0 : undefined}
          className="mt-3 h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        >
          {petsLoading ? <option value="">Carregando pets reais...</option> : null}
          {!petsLoading && petOptions.length === 0 ? <option value="">Nenhum pet real encontrado</option> : null}
          {petOptions.map((pet) => (
            <option key={pet.id} value={pet.id}>
              {pet.name} ({pet.petIdentity})
            </option>
          ))}
        </select>
        {petsError ? <p className="mt-2 text-[11px] text-rose-700">{petsError}</p> : null}
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "110ms" }}>
        <h3 className="text-[13px] font-semibold text-zinc-900">Novo registro clinico</h3>
        <div className="mt-2 grid gap-2">
          <input
            type="text"
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            placeholder="Diagnostico"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Evolucao / conduta"
            rows={3}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={addClinicalRecord}
            disabled={submittingRecord}
            className="h-10 rounded-xl border border-emerald-200 bg-emerald-50 text-[12px] font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            {submittingRecord ? "Salvando..." : "Adicionar prontuario"}
          </button>
        </div>
        {recordsError ? <p className="mt-2 text-[11px] text-rose-700">{recordsError}</p> : null}
      </section>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
      <section className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "130ms" }}>
        <h3 className="text-[13px] font-semibold text-zinc-900">Vacinas</h3>
        <div className="mt-2 grid gap-2">
          <input
            type="text"
            value={vaccineName}
            onChange={(event) => setVaccineName(event.target.value)}
            placeholder="Nome da vacina"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            type="text"
            value={vaccineDate}
            onChange={(event) => setVaccineDate(event.target.value)}
            placeholder="Data da aplicacao (dd/mm/aaaa)"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            type="text"
            value={nextDose}
            onChange={(event) => setNextDose(event.target.value)}
            placeholder="Proxima dose (opcional)"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <textarea
            value={vaccineObservation}
            onChange={(event) => setVaccineObservation(event.target.value)}
            placeholder="Observacao da vacina (opcional)"
            rows={2}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={addVaccine}
            disabled={mounted ? submittingVaccine || !selectedPet : undefined}
            className="h-10 rounded-xl border border-zinc-300 bg-white text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {submittingVaccine ? "Adicionando..." : "Adicionar vacina"}
          </button>
        </div>
        {vaccinesError ? <p className="mt-2 text-[11px] text-rose-700">{vaccinesError}</p> : null}
        {vaccineSuccessMessage ? <p className="mt-2 text-[11px] text-emerald-700">{vaccineSuccessMessage}</p> : null}
      </section>

      <section className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "150ms" }}>
        <h3 className="text-[13px] font-semibold text-zinc-900">Medicacao</h3>
        <div className="mt-2 grid gap-2">
          <input
            type="text"
            value={medicationName}
            onChange={(event) => setMedicationName(event.target.value)}
            placeholder="Nome da medicacao"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            type="text"
            value={dosage}
            onChange={(event) => setDosage(event.target.value)}
            placeholder="Dose e frequencia"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <input
            type="text"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="Duracao do tratamento (opcional)"
            className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <textarea
            value={medicationObservation}
            onChange={(event) => setMedicationObservation(event.target.value)}
            placeholder="Observacao da medicacao (opcional)"
            rows={2}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={addMedication}
            disabled={mounted ? submittingMedication || !selectedPet : undefined}
            className="h-10 rounded-xl border border-zinc-300 bg-white text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {submittingMedication ? "Adicionando..." : "Adicionar medicacao"}
          </button>
        </div>
        {medicationsError ? <p className="mt-2 text-[11px] text-rose-700">{medicationsError}</p> : null}
        {medicationSuccessMessage ? <p className="mt-2 text-[11px] text-emerald-700">{medicationSuccessMessage}</p> : null}
      </section>
      </div>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "170ms" }}>
        <h3 className="text-[13px] font-semibold text-zinc-900">Historico de {selectedPet?.name ?? "pet selecionado"}</h3>

        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Prontuario</p>
        <div className="mt-1 space-y-2">
          {recordsLoading ? <p className="text-[11px] text-zinc-500">Carregando prontuario...</p> : null}
          {petRecords.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-zinc-800">{item.diagnosis}</p>
                <p className="text-[10px] text-zinc-500">{item.when}</p>
              </div>
              <p className="mt-1 text-[11px] text-zinc-700">{item.note}</p>
            </article>
          ))}
          {!recordsLoading && petRecords.length === 0 ? <p className="text-[11px] text-zinc-500">Sem prontuarios para este pet.</p> : null}
        </div>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Vacinas</p>
        <div className="mt-1 space-y-2">
          {vaccinesLoading ? <p className="text-[11px] text-zinc-500">Carregando vacinas...</p> : null}
          {petVaccines.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-[12px] font-semibold text-zinc-800">{item.vaccine}</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">
                Aplicada em {item.date} · Proxima dose: {item.nextDose}
              </p>
              {item.observation ? <p className="mt-0.5 text-[10px] text-zinc-600">Observacao: {item.observation}</p> : null}
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Prescrita por {item.prescribedByName} · CRMV {item.prescribedByCrmv}
              </p>
            </article>
          ))}
          {!vaccinesLoading && petVaccines.length === 0 ? <p className="text-[11px] text-zinc-500">Sem vacinas registradas para este pet.</p> : null}
        </div>

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Medicacao</p>
        <div className="mt-1 space-y-2">
          {medicationsLoading ? <p className="text-[11px] text-zinc-500">Carregando medicacoes...</p> : null}
          {petMedications.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
              <p className="text-[12px] font-semibold text-zinc-800">{item.medication}</p>
              <p className="mt-0.5 text-[11px] text-zinc-600">
                {item.dosage} · Duracao: {item.duration}
              </p>
              {item.observation ? <p className="mt-0.5 text-[10px] text-zinc-600">Observacao: {item.observation}</p> : null}
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Prescrita por {item.prescribedByName} · CRMV {item.prescribedByCrmv}
              </p>
            </article>
          ))}
          {!medicationsLoading && petMedications.length === 0 ? <p className="text-[11px] text-zinc-500">Sem medicacoes registradas para este pet.</p> : null}
        </div>
      </section>
    </VetShell>
  );
}
