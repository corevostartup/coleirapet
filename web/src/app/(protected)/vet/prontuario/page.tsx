"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HealthActivitySevenDayChart } from "@/components/health-activity-seven-day-chart";
import { HealthWeightSevenDayChart } from "@/components/health-weight-seven-day-chart";
import { LykaConfirmDialog } from "@/components/lyka-confirm-dialog";
import { VetShell } from "@/components/vet-shell";
import { getPetImageOrDefault } from "@/lib/pets/image";

type PetOption = { id: string; petIdentity: string; name: string; image: string };
type ClinicalRecord = {
  id: string;
  petId: string;
  petName: string;
  note: string;
  diagnosis: string;
  when: string;
  prescribedByName: string;
  prescribedByCrmv: string;
};
type VetProfileSummary = { name: string; crmv: string; specialty: string };
type PetHistoryItem = {
  id: string;
  kind: "clinical" | "vaccine" | "medication";
  kindLabel: string;
  title: string;
  detail: string;
  prescribedByName: string;
  prescribedByCrmv: string;
  veterinarianLabel: string;
  when: string;
};
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

type VeterinarianApiPayload = { name?: string; crmv?: string; specialty?: string };

function VetResponsibleCard({ profile, label }: { profile: VetProfileSummary | null; label: string }) {
  if (!profile) return null;
  return (
    <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-zinc-800">{profile.name}</p>
      <p className="text-[11px] text-zinc-600">
        CRMV {profile.crmv}
        {profile.specialty ? ` · ${profile.specialty}` : ""}
      </p>
    </div>
  );
}

function toVetProfileSummary(veterinarian: VeterinarianApiPayload): VetProfileSummary {
  return {
    name: veterinarian.name?.trim() || "Veterinario",
    crmv: veterinarian.crmv?.trim() || "Nao informado",
    specialty: veterinarian.specialty?.trim() || "",
  };
}

type PetHealthSummary = {
  id: string;
  name: string;
  petIdentity: string;
  breed: string;
  age: number | null;
  tutorName: string;
  weightKg: number | null;
  weightDateLabel: string | null;
  activity: {
    todayMinutes: number;
    last7DaysMinutes: number;
    last7DaysAverage: number;
    latestDateLabel: string | null;
    latestMinutes: number;
  };
  charts: {
    weight: Array<{ date: string; weightKg: number }>;
    activity: Array<{ date: string; minutes: number }>;
  };
};

function formatAge(age: number | null) {
  if (age == null) return "Nao informado";
  return `${age} ${age === 1 ? "ano" : "anos"}`;
}

function formatWeight(weightKg: number | null) {
  if (weightKg == null) return "Nao informado";
  return `${weightKg.toFixed(1).replace(/\.0$/, "")} kg`;
}

function formatActivityMinutes(minutes: number) {
  if (minutes <= 0) return "0 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
}

function PetHealthCard({
  health,
  loading,
  error,
}: {
  health: PetHealthSummary | null;
  loading: boolean;
  error: string | null;
}) {
  if (!health && !loading && !error) {
    return <p className="mt-3 text-[12px] text-zinc-500">Selecione um pet para ver os dados de saude.</p>;
  }

  return (
    <div className="mt-3">
      <h4 className="text-[12px] font-semibold text-zinc-900">Dados de saude do pet</h4>
      {loading ? <p className="mt-2 text-[11px] text-zinc-500">Carregando dados de saude...</p> : null}
      {error ? <p className="mt-2 text-[11px] text-rose-700">{error}</p> : null}
      {health && !loading ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Nome</p>
            <p className="mt-1 text-[12px] font-semibold text-zinc-800">{health.name}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Idade</p>
            <p className="mt-1 text-[12px] font-semibold text-zinc-800">{formatAge(health.age)}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Peso</p>
            <p className="mt-1 text-[12px] font-semibold text-zinc-800">{formatWeight(health.weightKg)}</p>
            {health.weightDateLabel ? (
              <p className="mt-0.5 text-[10px] text-zinc-500">Atualizado em {health.weightDateLabel}</p>
            ) : null}
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Atividade hoje</p>
            <p className="mt-1 text-[12px] font-semibold text-zinc-800">{formatActivityMinutes(health.activity.todayMinutes)}</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              Media 7 dias: {formatActivityMinutes(health.activity.last7DaysAverage)}
            </p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Raca</p>
            <p className="mt-1 text-[12px] font-semibold text-zinc-800">{health.breed}</p>
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Tutor</p>
            <p className="mt-1 text-[12px] font-semibold text-zinc-800">{health.tutorName}</p>
          </article>
          {health.activity.latestDateLabel ? (
            <article className="col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-emerald-800">Ultima atividade registrada</p>
              <p className="mt-1 text-[12px] font-semibold text-zinc-800">
                {formatActivityMinutes(health.activity.latestMinutes)} · {health.activity.latestDateLabel}
              </p>
            </article>
          ) : null}

          <div className="col-span-2 mt-1 grid gap-2 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Peso · 7 dias</p>
              <HealthWeightSevenDayChart entries={health.charts.weight} variant="dense" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Atividade · 7 dias
              </p>
              <HealthActivitySevenDayChart entries={health.charts.activity} variant="dense" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function VetProntuarioPage() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [mounted, setMounted] = useState(false);
  const [petOptions, setPetOptions] = useState<PetOption[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [inProgressAppointmentId, setInProgressAppointmentId] = useState<string | null>(null);
  const [finalizingConsultation, setFinalizingConsultation] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
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
  const [vetProfile, setVetProfile] = useState<VetProfileSummary | null>(null);
  const [petHistory, setPetHistory] = useState<PetHistoryItem[]>([]);
  const [petHistoryLoading, setPetHistoryLoading] = useState(false);
  const [petHistoryError, setPetHistoryError] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [petHealth, setPetHealth] = useState<PetHealthSummary | null>(null);
  const [petHealthLoading, setPetHealthLoading] = useState(false);
  const [petHealthError, setPetHealthError] = useState<string | null>(null);

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
  const canFinalizeConsultation = Boolean(
    selectedPetId && (selectedPetId === activePetId || inProgressAppointmentId),
  );

  const loadAttendanceState = useCallback(async (petId: string) => {
    try {
      const [activeResponse, appointmentsResponse] = await Promise.all([
        fetch("/api/vet/pets?active=1", { method: "GET", credentials: "include", cache: "no-store" }),
        fetch("/api/vet/appointments", { method: "GET", credentials: "include", cache: "no-store" }),
      ]);
      const activeData = (await activeResponse.json()) as { pet?: { id: string } | null };
      const appointmentsData = (await appointmentsResponse.json()) as {
        appointments?: Array<{ id: string; petId: string; status: string }>;
      };

      setActivePetId(activeData.pet?.id ?? null);

      const inProgress =
        (appointmentsData.appointments ?? []).find(
          (item) => item.petId === petId && item.status === "Em atendimento",
        )?.id ?? null;
      setInProgressAppointmentId(inProgress);
    } catch {
      setActivePetId(null);
      setInProgressAppointmentId(null);
    }
  }, []);

  const petRecords = useMemo(() => records.filter((item) => item.petId === selectedPetId), [records, selectedPetId]);
  const petVaccines = useMemo(() => vaccines.filter((item) => item.petId === selectedPetId), [vaccines, selectedPetId]);
  const petMedications = useMemo(() => medications.filter((item) => item.petId === selectedPetId), [medications, selectedPetId]);

  function bumpPetHistory() {
    setHistoryRefreshKey((value) => value + 1);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedPetId) {
      setPetHealth(null);
      setPetHealthLoading(false);
      setPetHealthError(null);
      return;
    }

    let active = true;

    async function loadPetHealth() {
      setPetHealthLoading(true);
      setPetHealthError(null);
      try {
        const response = await fetch(`/api/vet/pets/health?petId=${encodeURIComponent(selectedPetId)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as { error?: string; health?: PetHealthSummary };
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar dados de saude.");
        if (active) setPetHealth(data.health ?? null);
      } catch (error) {
        if (active) {
          setPetHealth(null);
          setPetHealthError(error instanceof Error ? error.message : "Falha ao carregar dados de saude.");
        }
      } finally {
        if (active) setPetHealthLoading(false);
      }
    }

    void loadPetHealth();
    return () => {
      active = false;
    };
  }, [selectedPetId]);

  useEffect(() => {
    let active = true;

    async function loadVetProfile() {
      try {
        const response = await fetch("/api/vet/prontuario?veterinarian=1", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as {
          veterinarian?: { name?: string; crmv?: string; specialty?: string };
        };
        if (!response.ok || !active || !data.veterinarian) return;
        setVetProfile(toVetProfileSummary(data.veterinarian));
      } catch {
        if (active) setVetProfile(null);
      }
    }

    void loadVetProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadRealPets() {
      setPetsLoading(true);
      setPetsError(null);
      try {
        const [recentResponse, activeResponse] = await Promise.all([
          fetch("/api/vet/pets?recent=1", { method: "GET", credentials: "include", cache: "no-store" }),
          fetch("/api/vet/pets?active=1", { method: "GET", credentials: "include", cache: "no-store" }),
        ]);
        const data = (await recentResponse.json()) as {
          error?: string;
          pets?: Array<{ id: string; petIdentity: string; name: string; image: string }>;
        };
        const activeData = (await activeResponse.json()) as {
          pet?: { id: string; petIdentity: string; name: string; image: string } | null;
        };
        if (!recentResponse.ok) throw new Error(data.error ?? "Falha ao carregar pets.");
        const mapped: PetOption[] = (data.pets ?? []).map((pet) => ({
          id: pet.id,
          petIdentity: typeof pet.petIdentity === "string" && pet.petIdentity.trim() ? pet.petIdentity.trim() : pet.id,
          name: pet.name,
          image: getPetImageOrDefault(pet.image),
        }));

        const activePet = activeData.pet;
        if (activePet && !mapped.some((pet) => pet.id === activePet.id)) {
          mapped.unshift({
            id: activePet.id,
            petIdentity:
              typeof activePet.petIdentity === "string" && activePet.petIdentity.trim()
                ? activePet.petIdentity.trim()
                : activePet.id,
            name: activePet.name,
            image: getPetImageOrDefault(activePet.image),
          });
        }

        if (!active) return;
        setPetOptions(mapped);
        setActivePetId(activePet?.id ?? null);
        const preferredId = activePet?.id && mapped.some((pet) => pet.id === activePet.id) ? activePet.id : "";
        setSelectedPetId((prev) => {
          if (prev && mapped.some((pet) => pet.id === prev)) return prev;
          if (preferredId) return preferredId;
          return mapped[0]?.id ?? "";
        });
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
    if (!mounted || !selectedPetId) {
      setInProgressAppointmentId(null);
      return;
    }
    void loadAttendanceState(selectedPetId);
  }, [mounted, pathname, selectedPetId, loadAttendanceState]);

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
          veterinarian?: VeterinarianApiPayload;
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
        if (data.veterinarian) setVetProfile(toVetProfileSummary(data.veterinarian));
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
          veterinarian?: VeterinarianApiPayload;
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
        if (data.veterinarian) setVetProfile(toVetProfileSummary(data.veterinarian));
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
          veterinarian?: { name?: string; crmv?: string; specialty?: string };
          records?: Array<{
            id: string;
            petId: string;
            petName: string;
            note: string;
            diagnosis: string;
            when: string;
            prescribedByName?: string;
            prescribedByCrmv?: string;
          }>;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Falha ao carregar prontuario.");
        }
        if (active) {
          if (data.veterinarian) setVetProfile(toVetProfileSummary(data.veterinarian));
          const normalized = (data.records ?? []).map((item) => ({
            ...item,
            prescribedByName: item.prescribedByName || "Veterinario",
            prescribedByCrmv: item.prescribedByCrmv || "Nao informado",
          }));
          setRecords(normalized);
        }
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

  useEffect(() => {
    if (!selectedPetId) {
      setPetHistory([]);
      setPetHistoryLoading(false);
      return;
    }
    let active = true;

    async function loadPetHistory() {
      setPetHistoryLoading(true);
      setPetHistoryError(null);
      try {
        const response = await fetch(`/api/vet/clinical-history?petId=${encodeURIComponent(selectedPetId)}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json()) as { error?: string; history?: PetHistoryItem[] };
        if (!response.ok) throw new Error(data.error ?? "Falha ao carregar historico do pet.");
        if (active) setPetHistory(Array.isArray(data.history) ? data.history : []);
      } catch (error) {
        if (active) {
          setPetHistory([]);
          setPetHistoryError(error instanceof Error ? error.message : "Falha ao carregar historico do pet.");
        }
      } finally {
        if (active) setPetHistoryLoading(false);
      }
    }

    void loadPetHistory();
    return () => {
      active = false;
    };
  }, [selectedPetId, historyRefreshKey]);

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
      bumpPetHistory();
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
        bumpPetHistory();
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
        bumpPetHistory();
      } catch (error) {
        setMedicationsError(error instanceof Error ? error.message : "Falha ao adicionar medicacao.");
      } finally {
        setSubmittingMedication(false);
      }
    })();
  }

  async function confirmFinalizeConsultation() {
    if (!selectedPet || !canFinalizeConsultation) return;

    setShowFinalizeConfirm(false);
    setFinalizingConsultation(true);
    setFinalizeError(null);
    try {
      const useActiveSession = selectedPet.id === activePetId;
      const response = await fetch(useActiveSession ? "/api/vet/pets" : "/api/vet/appointments", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(useActiveSession ? { petId: selectedPet.id } : { id: inProgressAppointmentId }),
      });
      const data = (await response.json()) as { error?: string; detail?: string };
      if (!response.ok) {
        throw new Error(data.detail ?? data.error ?? "Falha ao finalizar atendimento.");
      }
      router.push("/vet/atendidos");
    } catch (error) {
      setFinalizeError(error instanceof Error ? error.message : "Falha ao finalizar atendimento.");
    } finally {
      setFinalizingConsultation(false);
    }
  }

  return (
    <VetShell title="Prontuario" subtitle="Area medica">
      <LykaConfirmDialog
        open={showFinalizeConfirm}
        title="Finalizar atendimento?"
        description={
          selectedPet
            ? `Encerrar o atendimento de ${selectedPet.name} e liberar a fila.`
            : "Encerrar o atendimento e liberar a fila."
        }
        confirmLabel="Finalizar atendimento"
        confirmTone="default"
        busy={finalizingConsultation}
        dialogId="vet-finalize-prontuario-dialog-title"
        onCancel={() => setShowFinalizeConfirm(false)}
        onConfirm={() => void confirmFinalizeConsultation()}
      />
      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-zinc-900">Gestao de prontuario do pet</h3>
          <div className="flex items-center gap-1.5">
            {canFinalizeConsultation ? (
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={finalizingConsultation}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {finalizingConsultation ? "Finalizando..." : "Finalizar atendimento"}
              </button>
            ) : null}
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
              Persistido
            </span>
          </div>
        </div>
        <p className="text-[12px] text-zinc-500">Selecione um pet, consulte historicos e adicione prontuario, vacinas e medicacao.</p>

        {selectedPet ? (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
              <Image
                src={getPetImageOrDefault(selectedPet.image)}
                alt={`Foto de ${selectedPet.name}`}
                fill
                className="object-cover"
                sizes="44px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-zinc-800">
                {selectedPet.name} <span className="text-[10px] font-medium text-zinc-500">({selectedPet.petIdentity})</span>
              </p>
              {canFinalizeConsultation ? (
                <p className="text-[10px] text-emerald-700">Atendimento em andamento</p>
              ) : null}
            </div>
            {canFinalizeConsultation ? (
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(true)}
                disabled={finalizingConsultation}
                className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {finalizingConsultation ? "Finalizando..." : "Finalizar"}
              </button>
            ) : null}
          </div>
        ) : null}
        {finalizeError ? <p className="mt-2 text-[11px] text-rose-700">{finalizeError}</p> : null}

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

        <PetHealthCard health={petHealth} loading={petHealthLoading} error={petHealthError} />
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "110ms" }}>
        <h3 className="text-[13px] font-semibold text-zinc-900">Novo registro clinico</h3>
        <VetResponsibleCard profile={vetProfile} label="Responsavel pelo registro" />
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
        <VetResponsibleCard profile={vetProfile} label="Responsavel pela prescricao" />
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
        <VetResponsibleCard profile={vetProfile} label="Responsavel pela prescricao" />
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

      {canFinalizeConsultation && selectedPet ? (
        <section
          className="appear-up mt-3 rounded-[26px] border border-emerald-200 bg-emerald-50/50 p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
          style={{ animationDelay: "160ms" }}
        >
          <h3 className="text-[13px] font-semibold text-emerald-950">Encerrar atendimento</h3>
          <p className="mt-1 text-[12px] text-emerald-900/80">
            Ao finalizar, {selectedPet.name} sai da fila em atendimento e o prontuario fica disponivel apenas para consulta.
          </p>
          <button
            type="button"
            onClick={() => setShowFinalizeConfirm(true)}
            disabled={finalizingConsultation}
            className="mt-3 h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 text-[12px] font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          >
            {finalizingConsultation ? "Finalizando atendimento..." : "Finalizar atendimento"}
          </button>
        </section>
      ) : null}

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "170ms" }}>
        <h3 className="text-[13px] font-semibold text-zinc-900">Historico do pet · {selectedPet?.name ?? "pet selecionado"}</h3>
        <p className="mt-1 text-[11px] text-zinc-500">Timeline unificada visivel ao tutor em Registros Medicos.</p>

        <div className="mt-2 space-y-2">
          {petHistoryLoading ? <p className="text-[11px] text-zinc-500">Carregando historico...</p> : null}
          {petHistoryError ? <p className="text-[11px] text-rose-700">{petHistoryError}</p> : null}
          {!petHistoryLoading && !petHistoryError
            ? petHistory.map((item) => (
                <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{item.kindLabel}</p>
                      <p className="mt-0.5 text-[12px] font-semibold text-zinc-800">{item.title}</p>
                    </div>
                    <p className="shrink-0 text-[10px] text-zinc-500">{item.when}</p>
                  </div>
                  {item.detail ? <p className="mt-1 text-[11px] text-zinc-700">{item.detail}</p> : null}
                  <p className="mt-1 text-[10px] text-zinc-500">
                    {item.kind === "clinical" ? "Registrado por" : "Prescrito por"}{" "}
                    {item.veterinarianLabel || `${item.prescribedByName} · CRMV ${item.prescribedByCrmv}`}
                  </p>
                </article>
              ))
            : null}
          {!petHistoryLoading && !petHistoryError && petHistory.length === 0 ? (
            <p className="text-[11px] text-zinc-500">Sem registros no historico deste pet.</p>
          ) : null}
        </div>
      </section>
    </VetShell>
  );
}
