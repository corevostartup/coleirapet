"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type TutorSearchItem = {
  uid: string;
  name: string;
  tutorCode: string;
  photoUrl: string;
};

type PetTutorMember = {
  uid: string;
  role: "primary" | "secondary";
  canEditBasicData: boolean;
  canDeletePet: boolean;
  canPairNfc: boolean;
  user: {
    uid: string;
    name: string;
    email: string;
    tutorCode: string;
    photoUrl: string;
  };
};

type Props = {
  petId: string;
  petName?: string;
  currentUserUid: string;
  currentTutorCode: string;
  userPlan: "free" | "pro";
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "T";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

export default function PetTutorsManager({ petId, petName, currentUserUid, currentTutorCode, userPlan }: Props) {
  const [members, setMembers] = useState<PetTutorMember[]>([]);
  const [currentRole, setCurrentRole] = useState<"primary" | "secondary" | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResults, setSearchResults] = useState<TutorSearchItem[]>([]);
  const [searchError, setSearchError] = useState("");

  const [actionBusyUid, setActionBusyUid] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionHint, setActionHint] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  async function loadMembers() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ petId });
      const response = await fetch(`/api/pets/members?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            currentRole?: "primary" | "secondary";
            members?: PetTutorMember[];
          }
        | null;
      if (!response.ok) throw new Error(payload?.error ?? "Nao foi possivel carregar tutores.");
      setMembers(Array.isArray(payload?.members) ? payload.members : []);
      setCurrentRole(payload?.currentRole ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar tutores.");
      setMembers([]);
      setCurrentRole(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, [petId]);

  useEffect(() => {
    setQuery("");
    setSearchResults([]);
    setSearchError("");
    setActionError("");
    setActionHint("");
  }, [petId]);

  async function searchTutors() {
    const q = query.trim();
    if (q.length < 2) {
      setSearchError("Digite ao menos 2 caracteres para buscar.");
      setSearchResults([]);
      return;
    }
    setSearchBusy(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({ q });
      const response = await fetch(`/api/users/tutor-search?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as { users?: TutorSearchItem[]; error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Falha na busca de tutor.");

      const existing = new Set(members.map((item) => item.uid));
      const results = (Array.isArray(payload?.users) ? payload.users : []).filter((user) => !existing.has(user.uid));
      setSearchResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Falha na busca de tutor.");
      setSearchResults([]);
    } finally {
      setSearchBusy(false);
    }
  }

  async function addSecondaryTutor(target: TutorSearchItem) {
    if (!petId || !target.uid) return;
    if (userPlan !== "pro") {
      setShowProModal(true);
      return;
    }
    setActionBusyUid(target.uid);
    setActionError("");
    setActionHint("");
    try {
      const response = await fetch("/api/pets/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, targetUserId: target.uid }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; requiresUpgrade?: boolean } | null;
      if (!response.ok) {
        if (payload?.requiresUpgrade) setShowProModal(true);
        throw new Error(payload?.error ?? "Nao foi possivel adicionar tutor.");
      }
      setActionHint("Tutor secundario adicionado com sucesso.");
      setSearchResults((current) => current.filter((item) => item.uid !== target.uid));
      await loadMembers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao adicionar tutor.");
    } finally {
      setActionBusyUid(null);
    }
  }

  async function removeSecondaryTutor(targetUid: string) {
    if (!petId || !targetUid) return;
    setActionBusyUid(targetUid);
    setActionError("");
    setActionHint("");
    try {
      const response = await fetch("/api/pets/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, targetUserId: targetUid }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Nao foi possivel remover tutor.");
      setActionHint(targetUid === currentUserUid ? "Voce saiu da tutoria deste pet." : "Tutor removido com sucesso.");
      await loadMembers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao remover tutor.");
    } finally {
      setActionBusyUid(null);
    }
  }

  const secondaryCount = useMemo(() => members.filter((item) => item.role === "secondary").length, [members]);

  return (
    <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "210ms" }}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-zinc-900">Tutores do pet</h3>
          {petName?.trim() ? (
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">Pet selecionado: {petName.trim()}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
          {loading ? "Carregando" : `${secondaryCount} secundario(s)`}
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Seu codigo de tutor</p>
        <p className="mt-1 text-[13px] font-semibold text-zinc-800">{currentTutorCode || "Nao disponivel"}</p>
      </div>

      {currentRole === "primary" ? (
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
          <p className="text-[11px] font-semibold text-zinc-800">Adicionar tutor secundario</p>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            Busque por nome ou codigo do tutor. {userPlan === "pro" ? "Disponivel no seu plano." : "Recurso disponivel apenas para contas Pro."}
          </p>

          <div className="mt-2 flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: Ana ou LYK-AB12CD"
              enterKeyHint="search"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchTutors();
                }
              }}
              className="h-10 flex-1 rounded-xl border border-zinc-200 bg-white px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="button"
              onClick={() => void searchTutors()}
              disabled={searchBusy}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searchBusy ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {searchError ? <p className="mt-2 text-[11px] text-rose-600">{searchError}</p> : null}

          {searchResults.length > 0 ? (
            <div className="mt-2 space-y-2">
              {searchResults.map((item) => (
                <article key={item.uid} className="rounded-xl border border-zinc-200 bg-white px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {item.photoUrl ? (
                        <Image src={item.photoUrl} alt={`Foto de ${item.name}`} width={32} height={32} unoptimized className="h-8 w-8 rounded-full border border-zinc-200 object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-200 text-[10px] font-semibold text-zinc-700">
                          {initialsFromName(item.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-zinc-800">{item.name}</p>
                        <p className="truncate text-[10px] text-zinc-500">{item.tutorCode || item.uid}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(actionBusyUid)}
                      onClick={() => void addSecondaryTutor(item)}
                      className="rounded-xl border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusyUid === item.uid ? "Adicionando..." : "Adicionar"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p>
        ) : null}
        {actionError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{actionError}</p>
        ) : null}
        {actionHint ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">{actionHint}</p>
        ) : null}

        {members.map((member) => {
          const isPrimary = member.role === "primary";
          const canRemove = !isPrimary && currentRole === "primary";
          const canLeave = member.uid === currentUserUid && member.role === "secondary";
          return (
            <article key={member.uid} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {member.user.photoUrl ? (
                    <Image
                      src={member.user.photoUrl}
                      alt={`Foto de ${member.user.name}`}
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 rounded-full border border-zinc-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-200 text-[11px] font-semibold text-zinc-700">
                      {initialsFromName(member.user.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-zinc-800">{member.user.name}</p>
                    <p className="truncate text-[10px] text-zinc-500">{member.user.tutorCode || member.user.uid}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isPrimary ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                    {isPrimary ? "Principal" : "Secundario"}
                  </span>
                  {!isPrimary ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800">Edita basico</span>
                  ) : null}
                  {canRemove ? (
                    <button
                      type="button"
                      disabled={Boolean(actionBusyUid)}
                      onClick={() => void removeSecondaryTutor(member.uid)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusyUid === member.uid ? "Removendo..." : "Remover"}
                    </button>
                  ) : null}
                  {canLeave ? (
                    <button
                      type="button"
                      disabled={Boolean(actionBusyUid)}
                      onClick={() => void removeSecondaryTutor(member.uid)}
                      className="rounded-xl border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionBusyUid === member.uid ? "Saindo..." : "Sair da tutoria"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {showProModal && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/35 px-3 py-5">
              <section className="w-full max-w-[440px] rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_24px_50px_-30px_rgba(15,23,42,0.45)]">
                <div className="relative mb-2 flex h-[200px] w-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-50">
                  <div className="premium-plan-hero-float relative h-[168px] w-full max-w-[320px]">
                    <Image
                      src="/coleira-splash-logo.png"
                      alt="Cachorro astronauta Lyka Pro"
                      fill
                      className="object-contain drop-shadow-[0_8px_28px_rgba(34,197,94,0.14)]"
                      sizes="440px"
                    />
                  </div>
                </div>

                <h3 className="text-[16px] font-semibold text-zinc-900">Seja Pro para adicionar tutores</h3>
                <p className="mt-1 text-[12px] text-zinc-600">
                  Apenas contas Pro podem adicionar tutor secundario. Com o plano Pro, voce compartilha o pet com outros tutores.
                </p>

                <div className="mt-3 grid gap-2">
                  <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                    <p className="text-[12px] font-semibold text-zinc-900">Plano Free</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">Visualiza pets vinculados, sem adicionar novos tutores.</p>
                  </article>
                  <article className="rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-3">
                    <p className="text-[12px] font-semibold text-emerald-900">Plano Pro</p>
                    <p className="mt-0.5 text-[11px] text-emerald-800">Permite adicionar e gerenciar tutores secundarios.</p>
                  </article>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProModal(false)}
                    className="flex-1 rounded-xl border border-zinc-200 bg-white py-2 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProModal(false)}
                    className="flex-1 rounded-xl border border-emerald-300 bg-emerald-600 py-2 text-[12px] font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Quero ser Pro
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
