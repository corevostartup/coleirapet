"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import TopBar from "@/components/top-bar";

type PetNfcStatus = "pareado" | "nao_pareado";

type AdminPet = {
  id: string;
  name: string;
  petIdentity: string;
  breed: string;
  image: string;
  sex: string;
  size: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  nfcStatus: PetNfcStatus;
  nfcId: string;
};

type PetsSummary = {
  total: number;
  withPhoto: number;
  pairedNfc: number;
  withoutTutor: number;
};

type PetDetailsData = {
  pet: {
    id: string;
    name: string;
    petIdentity: string;
    breed: string;
    image: string;
    sex: string;
    size: string;
    weightKg: string;
    birthDate: string;
    nfcId: string;
    lastNfcAccessAt: string;
    ownerId: string;
    createdAt: string;
  };
  owner: {
    id: string;
    docId: string;
    name: string;
    email: string;
    phone: string;
    birthDate: string;
    plan: "free" | "pro";
    userType: "Tutor" | "vet";
    createdAt: string;
    photoUrl: string;
  } | null;
};

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "P";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

function hasInformativeValue(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return Boolean(normalized) && normalized !== "nao informado";
}

export default function LykaAdminPetsPage() {
  const [pets, setPets] = useState<AdminPet[]>([]);
  const [summary, setSummary] = useState<PetsSummary>({
    total: 0,
    withPhoto: 0,
    pairedNfc: 0,
    withoutTutor: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [nfcFilter, setNfcFilter] = useState<"all" | PetNfcStatus>("all");
  const [detailsPet, setDetailsPet] = useState<AdminPet | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsData, setDetailsData] = useState<PetDetailsData | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadPets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/pets", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar pets");
      const payload = (await response.json()) as { pets?: AdminPet[]; summary?: PetsSummary };
      setPets(Array.isArray(payload.pets) ? payload.pets : []);
      setSummary(
        payload.summary ?? {
          total: 0,
          withPhoto: 0,
          pairedNfc: 0,
          withoutTutor: 0,
        },
      );
    } catch {
      setPets([]);
      setSummary({
        total: 0,
        withPhoto: 0,
        pairedNfc: 0,
        withoutTutor: 0,
      });
      setError("Nao foi possivel carregar os pets cadastrados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  const filteredPets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pets.filter((pet) => {
      if (nfcFilter !== "all" && pet.nfcStatus !== nfcFilter) return false;
      if (!q) return true;
      return (
        pet.name.toLowerCase().includes(q) ||
        pet.breed.toLowerCase().includes(q) ||
        pet.ownerName.toLowerCase().includes(q) ||
        pet.ownerEmail.toLowerCase().includes(q) ||
        pet.petIdentity.toLowerCase().includes(q) ||
        pet.id.toLowerCase().includes(q)
      );
    });
  }, [pets, search, nfcFilter]);

  const cards = useMemo(() => {
    const total = summary.total || pets.length;
    const withPhoto = summary.withPhoto;
    const pairedNfc = summary.pairedNfc;
    const withTutor = Math.max(total - summary.withoutTutor, 0);
    return [
      { label: "Pets cadastrados", value: String(total), hint: "Base atual" },
      { label: "Com foto", value: String(withPhoto), hint: "Perfil completo" },
      { label: "Tag NFC pareada", value: String(pairedNfc), hint: "Pets com NFC" },
      { label: "Com tutor valido", value: String(withTutor), hint: "Vinculados a usuario" },
    ] as const;
  }, [pets.length, summary]);

  async function openPetDetails(pet: AdminPet) {
    setDetailsPet(pet);
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsData(null);
    setDeleteError("");
    setConfirmDelete(false);
    try {
      const params = new URLSearchParams({ petId: pet.id });
      const response = await fetch(`/api/admin/pets/details?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar detalhes do pet");
      const payload = (await response.json()) as PetDetailsData;
      setDetailsData(payload);
    } catch {
      setDetailsError("Nao foi possivel carregar os detalhes do pet.");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function deletePetFromDetails() {
    if (!detailsPet) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/admin/pets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: detailsPet.id }),
      });
      if (!response.ok) throw new Error("Falha ao excluir pet");
      setDetailsPet(null);
      setDetailsData(null);
      setConfirmDelete(false);
      await loadPets();
    } catch {
      setDeleteError("Nao foi possivel excluir o pet.");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <TopBar title="Pets" subtitle="Lyka Admin · Lista completa" action={null} showNotifications={false} />

        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <aside className="appear-up lg:col-span-3 xl:col-span-2" style={{ animationDelay: "20ms" }}>
            <AdminSidebar />
          </aside>

          <div className="space-y-3 lg:col-span-9 xl:col-span-10">
            <section className="appear-up grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3" style={{ animationDelay: "50ms" }}>
              {cards.map((card) => (
                <article key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">{card.label}</p>
                  <p className="mt-1 text-[20px] font-semibold text-zinc-900">{card.value}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{card.hint}</p>
                </article>
              ))}
            </section>

            <section className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "70ms" }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-zinc-900">Pets</h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                  {loading ? "Carregando" : `${filteredPets.length} listados`}
                </span>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por pet, tutor, email, ID"
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
                <select
                  value={nfcFilter}
                  onChange={(event) => setNfcFilter(event.target.value as "all" | PetNfcStatus)}
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">Todos (NFC)</option>
                  <option value="pareado">Somente NFC pareado</option>
                  <option value="nao_pareado">Somente sem NFC</option>
                </select>
              </div>

              <div className="mt-3 space-y-2">
                {error ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-center text-[12px] text-rose-700">{error}</p>
                ) : null}

                {filteredPets.map((pet) => (
                  <article key={pet.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {pet.image ? (
                          <Image
                            src={pet.image}
                            alt={`Foto de ${pet.name}`}
                            width={36}
                            height={36}
                            unoptimized
                            className="h-9 w-9 shrink-0 rounded-full border border-zinc-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-200 text-[11px] font-semibold text-zinc-700">
                            {initialsFromName(pet.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-zinc-800">{pet.name}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {pet.breed} · Tutor: {pet.ownerName} · Cadastro: {pet.createdAt || "Sem data"}
                          </p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {pet.ownerEmail} · {pet.petIdentity}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasInformativeValue(pet.sex) ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{pet.sex}</span>
                        ) : null}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            pet.nfcStatus === "pareado" ? "bg-indigo-100 text-indigo-800" : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {pet.nfcStatus === "pareado" ? "NFC pareado" : "Sem NFC"}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openPetDetails(pet)}
                          className="rounded-xl border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                        >
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {filteredPets.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
                    {loading ? "Carregando pets..." : "Nenhum pet encontrado para os filtros aplicados."}
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      {detailsPet ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/35 px-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_26px_55px_-28px_rgba(10,16,13,0.55)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-zinc-900">Detalhes do pet</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={() => setConfirmDelete((current) => !current)}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Excluir pet
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsPet(null)}
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Fechar
                </button>
              </div>
            </div>

            {detailsLoading ? <p className="text-[12px] text-zinc-500">Carregando detalhes...</p> : null}
            {detailsError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{detailsError}</p> : null}
            {deleteError ? <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{deleteError}</p> : null}
            {confirmDelete ? (
              <div className="mb-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
                <p className="text-[11px] text-amber-900">Deseja realmente excluir este pet? Esta acao nao pode ser desfeita.</p>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deleteBusy}
                    onClick={() => void deletePetFromDetails()}
                    className="rounded-lg border border-rose-300 bg-rose-100 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleteBusy ? "Excluindo..." : "Confirmar exclusao"}
                  </button>
                </div>
              </div>
            ) : null}

            {detailsData ? (
              <div className="space-y-3">
                <section className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Pet</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Image
                      src={detailsData.pet.image}
                      alt={`Foto de ${detailsData.pet.name}`}
                      width={44}
                      height={44}
                      unoptimized
                      className="h-11 w-11 rounded-full border border-zinc-200 object-cover"
                    />
                    <div>
                      <p className="text-[13px] font-semibold text-zinc-800">{detailsData.pet.name}</p>
                      <p className="text-[11px] text-zinc-500">{detailsData.pet.breed}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-1 text-[11px] text-zinc-600 sm:grid-cols-2">
                    <p>ID: {detailsData.pet.id}</p>
                    <p>Identidade: {detailsData.pet.petIdentity}</p>
                    <p>Sexo: {detailsData.pet.sex}</p>
                    <p>Porte: {detailsData.pet.size}</p>
                    <p>Peso: {detailsData.pet.weightKg ? `${detailsData.pet.weightKg} kg` : "Nao informado"}</p>
                    <p>Nascimento: {detailsData.pet.birthDate || "Nao informado"}</p>
                    <p>Cadastro: {detailsData.pet.createdAt || "Nao informado"}</p>
                    <p>NFC: {detailsData.pet.nfcId || "Nao pareado"}</p>
                    <p className="sm:col-span-2">Ultimo acesso NFC: {detailsData.pet.lastNfcAccessAt || "Nao registrado"}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Tutor vinculado</p>
                  {detailsData.owner ? (
                    <>
                      <div className="mt-2 flex items-center gap-2">
                        {detailsData.owner.photoUrl ? (
                          <Image
                            src={detailsData.owner.photoUrl}
                            alt={`Foto de ${detailsData.owner.name}`}
                            width={44}
                            height={44}
                            unoptimized
                            className="h-11 w-11 rounded-full border border-zinc-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-200 text-[12px] font-semibold text-zinc-700">
                            {initialsFromName(detailsData.owner.name)}
                          </div>
                        )}
                        <div>
                          <p className="text-[13px] font-semibold text-zinc-800">{detailsData.owner.name}</p>
                          <p className="text-[11px] text-zinc-500">{detailsData.owner.email}</p>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1 text-[11px] text-zinc-600 sm:grid-cols-2">
                        <p>ID: {detailsData.owner.id}</p>
                        <p>Plano: {detailsData.owner.plan}</p>
                        <p>Tipo: {detailsData.owner.userType}</p>
                        <p>Telefone: {detailsData.owner.phone || "Nao informado"}</p>
                        <p>Nascimento: {detailsData.owner.birthDate || "Nao informado"}</p>
                        <p>Cadastro: {detailsData.owner.createdAt || "Nao informado"}</p>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-3 text-[11px] text-zinc-500">
                      Nenhum tutor vinculado encontrado para este pet.
                    </p>
                  )}
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
