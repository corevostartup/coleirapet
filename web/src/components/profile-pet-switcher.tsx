"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getPetImageOrDefault } from "@/lib/pets/image";
import { filterLegacyUiDemoPetsFromSwitcherList } from "@/lib/pets/legacy-ui-demo-pets";

type PetItem = {
  id: string;
  name: string;
  breed: string;
  image: string;
  canDeletePet?: boolean;
};

type Props = {
  currentPet: PetItem;
  initialPets: PetItem[];
  userPlan: "free" | "pro";
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

export function ProfilePetSwitcher({ currentPet, initialPets, userPlan }: Props) {
  const [open, setOpen] = useState(false);
  const [busyPetId, setBusyPetId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showAllPetsModal, setShowAllPetsModal] = useState(false);
  const [pendingDeletePet, setPendingDeletePet] = useState<PetItem | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showNewPetModal, setShowNewPetModal] = useState(false);
  const [newPetName, setNewPetName] = useState("");
  const [newPetBirthDate, setNewPetBirthDate] = useState("");
  const [newPetWeightKg, setNewPetWeightKg] = useState("");
  const [newPetSex, setNewPetSex] = useState("");
  const [newPetSize, setNewPetSize] = useState("");
  const [newPetError, setNewPetError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pets, setPets] = useState(() => preparePetsList(initialPets));
  const [selectedPetId, setSelectedPetId] = useState(currentPet.id);

  useEffect(() => {
    setPets(preparePetsList(initialPets));
  }, [initialPets]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
      /** Recarrega a pagina para o RSC buscar o pet atual no servidor (foto e dados). `router.refresh()` sozinho nao remonta estado local do editor. */
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("_r", String(Date.now()));
        window.location.assign(url.toString());
      }
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Falha ao trocar pet.");
    } finally {
      setBusyPetId(null);
    }
  }

  async function deletePet(petId: string) {
    if (!petId || busyPetId) return;
    const target = pets.find((item) => item.id === petId);
    if (target && target.canDeletePet === false) {
      setHint("Tutor secundario nao pode excluir pet.");
      return;
    }
    setHint(null);
    setBusyPetId(`delete-${petId}`);
    try {
      const res = await fetch("/api/pets/list", {
        method: "DELETE",
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
      if (!res.ok) throw new Error(payload?.error ?? "Nao foi possivel excluir o pet.");

      const nextPets = Array.isArray(payload?.pets) ? preparePetsList(payload.pets as PetItem[]) : [];
      setPets(nextPets);
      setSelectedPetId(payload?.currentPetId ?? nextPets[0]?.id ?? "");
      setPendingDeletePet(null);
      setShowAllPetsModal(false);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("_r", String(Date.now()));
        window.location.assign(url.toString());
      }
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Falha ao excluir pet.");
    } finally {
      setBusyPetId(null);
    }
  }

  async function createNewPet() {
    if (busyPetId) return;
    setHint(null);

    if (userPlan !== "pro") {
      setOpen(false);
      setShowPlanModal(true);
      return;
    }

    setOpen(false);
    setNewPetError(null);
    setNewPetName("");
    setNewPetBirthDate("");
    setNewPetWeightKg("");
    setNewPetSex("");
    setNewPetSize("");
    setShowNewPetModal(true);
  }

  function parseOptionalWeight(value: string) {
    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) return undefined;
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0 || n > 130) return null;
    return Math.round(n * 10) / 10;
  }

  function parseOptionalBirthDate(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = new Date(`${trimmed}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return trimmed;
  }

  function ageFromBirthDate(isoDate?: string) {
    if (!isoDate) return undefined;
    const birth = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 0) return 0;
    if (age > 40) return 40;
    return age;
  }

  async function submitNewPet() {
    if (busyPetId) return;
    setNewPetError(null);

    const name = newPetName.trim();
    const sex = newPetSex.trim();
    if (!name) {
      setNewPetError("Nome do pet e obrigatorio.");
      return;
    }
    if (!sex) {
      setNewPetError("Sexo e obrigatorio.");
      return;
    }

    const birthDate = parseOptionalBirthDate(newPetBirthDate);
    if (birthDate === null) {
      setNewPetError("Data de nascimento invalida.");
      return;
    }
    const weightKg = parseOptionalWeight(newPetWeightKg);
    if (weightKg === null) {
      setNewPetError("Peso invalido. Use um valor entre 0,1 e 130 kg.");
      return;
    }

    const size = newPetSize.trim();
    const age = ageFromBirthDate(birthDate);

    setBusyPetId("new-pet");
    try {
      const createRes = await fetch("/api/pets/list", { method: "POST" });
      const createPayload = (await createRes.json().catch(() => null)) as
        | {
            error?: string;
            requiresUpgrade?: boolean;
            currentPetId?: string;
            pets?: PetItem[];
          }
        | null;
      if (!createRes.ok) {
        if (createPayload?.requiresUpgrade) {
          setShowNewPetModal(false);
          setShowPlanModal(true);
          throw new Error("Plano Free permite apenas 1 pet. Assine o Premium para liberar pets ilimitados.");
        }
        throw new Error(createPayload?.error ?? "Nao foi possivel criar novo pet.");
      }

      const patchRes = await fetch("/api/pets/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          birthDate,
          sex,
          size: size || undefined,
          weightKg,
          age,
        }),
      });
      const patchPayload = (await patchRes.json().catch(() => null)) as { error?: string } | null;
      if (!patchRes.ok) throw new Error(patchPayload?.error ?? "Falha ao salvar dados do novo pet.");

      const nextPets = Array.isArray(createPayload?.pets) ? preparePetsList(createPayload.pets as PetItem[]) : pets;
      setPets(nextPets);
      setSelectedPetId(createPayload?.currentPetId ?? nextPets[0]?.id ?? selectedPetId);
      setShowNewPetModal(false);

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("_r", String(Date.now()));
        window.location.assign(url.toString());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar novo pet.";
      setNewPetError(message);
      setHint(message);
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
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setShowAllPetsModal(true);
            }}
            className="mt-2 flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-2 py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            Ver todos
          </button>
          {hint ? <p className="px-1 pt-2 text-[11px] text-rose-600">{hint}</p> : null}
        </div>
      ) : null}

      {showPlanModal && mounted
        ? createPortal(
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/35 px-3 py-5">
          <section className="w-full max-w-[440px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="relative mb-2 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
              <div className="premium-plan-hero-float relative h-[168px] w-full max-w-[320px]">
                <Image
                  src="/coleira-splash-logo.png"
                  alt="Cachorro astronauta Lyka Premium"
                  fill
                  className="object-contain drop-shadow-[0_8px_28px_rgba(34,197,94,0.14)]"
                  sizes="440px"
                />
              </div>
            </div>
            <h3 className="text-[16px] font-semibold text-zinc-900">Assinatura Lyka</h3>
            <p className="mt-1 text-[12px] text-zinc-600">Para cadastrar novo pet, escolha um plano:</p>

            <div className="mt-3 grid gap-2">
              <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                <p className="text-[12px] font-semibold text-zinc-900">Plano Free</p>
                <p className="mt-0.5 text-[11px] text-zinc-600">Gratis</p>
                <p className="mt-1 text-[11px] text-zinc-500">1 pet por conta.</p>
              </article>

              <article className="rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-emerald-900">Plano Premium</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    Oferta
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-emerald-800">De R$ 39,90 por R$ 19,90</p>
                <p className="mt-1 text-[11px] text-emerald-800">Acesso a todos os recursos e pets ilimitados.</p>
              </article>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="flex-1 rounded-xl border border-emerald-300 bg-emerald-600 py-2 text-[12px] font-semibold text-white transition hover:bg-emerald-700"
              >
                Assinar Premium
              </button>
            </div>
          </section>
        </div>
        , document.body)
        : null}

      {showNewPetModal && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/35 px-3 py-5">
              <section className="w-full max-w-[440px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
                <h3 className="text-[16px] font-semibold text-zinc-900">Novo pet</h3>
                <p className="mt-1 text-[12px] text-zinc-600">Preencha os dados para concluir o cadastro.</p>

                <div className="mt-3 space-y-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-zinc-600">Nome do pet *</span>
                    <input
                      value={newPetName}
                      onChange={(e) => setNewPetName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                      placeholder="Ex.: Luna"
                      maxLength={50}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-zinc-600">Data de nascimento</span>
                    <input
                      type="date"
                      value={newPetBirthDate}
                      onChange={(e) => setNewPetBirthDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-zinc-600">Peso (kg)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newPetWeightKg}
                      onChange={(e) => setNewPetWeightKg(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                      placeholder="Ex.: 12,4"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-zinc-600">Sexo *</span>
                    <select
                      value={newPetSex}
                      onChange={(e) => setNewPetSex(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    >
                      <option value="">Selecione</option>
                      <option value="Macho">Macho</option>
                      <option value="Femea">Femea</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-zinc-600">Porte</span>
                    <select
                      value={newPetSize}
                      onChange={(e) => setNewPetSize(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] outline-none focus:border-emerald-400"
                    >
                      <option value="">Selecione</option>
                      <option value="Pequeno">Pequeno</option>
                      <option value="Medio">Medio</option>
                      <option value="Grande">Grande</option>
                    </select>
                  </label>
                </div>

                {newPetError ? <p className="mt-2 text-[11px] text-rose-600">{newPetError}</p> : null}

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewPetModal(false)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    disabled={Boolean(busyPetId)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitNewPet()}
                    className="flex-1 rounded-xl border border-emerald-300 bg-emerald-600 py-2 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    disabled={Boolean(busyPetId)}
                  >
                    {busyPetId === "new-pet" ? "Salvando..." : "Salvar pet"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-zinc-500">* Campos obrigatorios: Nome e Sexo.</p>
              </section>
            </div>,
            document.body,
          )
        : null}

      {showAllPetsModal && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/35 px-3 py-5">
              <section className="w-full max-w-[480px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[16px] font-semibold text-zinc-900">Todos os pets</h3>
                  <button
                    type="button"
                    onClick={() => setShowAllPetsModal(false)}
                    className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Fechar
                  </button>
                </div>

                <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-0.5">
                  {pets.map((pet) => {
                    const isCurrent = pet.id === selectedPetId;
                    const isSwitching = busyPetId === pet.id;
                    const isDeleting = busyPetId === `delete-${pet.id}`;
                    return (
                      <article key={pet.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                            <Image src={getPetImageOrDefault(pet.image)} alt={`Foto de ${pet.name}`} fill className="object-cover" sizes="40px" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-zinc-800">{pet.name}</p>
                            <p className="truncate text-[11px] text-zinc-500">{pet.breed || "Sem raca"}</p>
                          </div>
                          {isCurrent ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Atual</span> : null}
                        </div>
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={Boolean(busyPetId) || isCurrent}
                            onClick={() => void switchPet(pet.id)}
                            className="rounded-xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSwitching ? "Trocando..." : "Trocar"}
                          </button>
                          {pet.canDeletePet !== false ? (
                            <button
                              type="button"
                              disabled={Boolean(busyPetId)}
                              onClick={() => setPendingDeletePet(pet)}
                              className="rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isDeleting ? "Excluindo..." : "Excluir"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}

      {pendingDeletePet && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[2300] flex items-center justify-center bg-black/45 px-3 py-5">
              <section className="w-full max-w-[460px] rounded-[26px] border border-rose-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
                <h3 className="text-[16px] font-semibold text-rose-700">Area sensivel</h3>
                <p className="mt-2 text-[12px] leading-relaxed text-zinc-700">
                  Deseja realmente excluir esse pet? Todos os dados referente a ele sera perdido, incluindo cartao de vacinas e historico de saude.
                </p>
                <p className="mt-2 text-[12px] font-semibold text-zinc-900">{pendingDeletePet.name}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingDeletePet(null)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
                    disabled={Boolean(busyPetId)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePet(pendingDeletePet.id)}
                    className="flex-1 rounded-xl border border-rose-300 bg-rose-600 py-2 text-[12px] font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                    disabled={Boolean(busyPetId)}
                  >
                    Confirmar exclusao
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
