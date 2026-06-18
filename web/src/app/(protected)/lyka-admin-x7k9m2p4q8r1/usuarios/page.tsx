"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import TopBar from "@/components/top-bar";

type AdminUserPlan = "free" | "pro";
type AdminUserType = "Tutor" | "vet";
type AdminUserStatus = "ativo" | "inativo";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  plan: AdminUserPlan;
  userType: AdminUserType;
  status: AdminUserStatus;
  joinedAt: string;
};

type UserDetailsPet = {
  id: string;
  name: string;
  petIdentity: string;
  breed: string;
  image: string;
  nfcId: string;
  lastNfcAccessAt: string;
};

type UserDetailsData = {
  user: {
    id: string;
    docId: string;
    name: string;
    email: string;
    phone: string;
    birthDate: string;
    plan: AdminUserPlan;
    userType: AdminUserType;
    createdAt: string;
    photoUrl: string;
  };
  pets: UserDetailsPet[];
};

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

export default function LykaAdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalPets, setTotalPets] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [pendingPlanChangeUser, setPendingPlanChangeUser] = useState<AdminUser | null>(null);
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsData, setDetailsData] = useState<UserDetailsData | null>(null);
  const [planSavingUserId, setPlanSavingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | AdminUserPlan>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | AdminUserType>("all");

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setUsersLoading(true);
      setUsersError("");
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        if (!response.ok) throw new Error("Falha ao carregar usuarios.");
        const payload = (await response.json()) as { users?: AdminUser[]; totalPets?: number };
        if (!cancelled) {
          setUsers(Array.isArray(payload.users) ? payload.users : []);
          setTotalPets(typeof payload.totalPets === "number" ? payload.totalPets : 0);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setTotalPets(0);
          setUsersError("Nao foi possivel carregar os usuarios reais.");
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (planFilter !== "all" && user.plan !== planFilter) return false;
      if (typeFilter !== "all" && user.userType !== typeFilter) return false;
      if (!q) return true;
      return user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q) || user.id.toLowerCase().includes(q);
    });
  }, [users, search, planFilter, typeFilter]);

  const dashboardCards = useMemo(() => {
    const total = users.length;
    const vets = users.filter((user) => user.userType === "vet").length;
    const pro = users.filter((user) => user.plan === "pro").length;
    const proPct = total > 0 ? Math.round((pro / total) * 100) : 0;

    return [
      { label: "Usuarios totais", value: String(total), hint: "Base atual" },
      { label: "Veterinarios", value: String(vets), hint: "Contas vet" },
      { label: "Total de pets", value: String(totalPets), hint: "Pets cadastrados" },
      { label: "Contas Pro", value: `${proPct}%`, hint: `${pro} conta(s)` },
    ] as const;
  }, [totalPets, users]);

  async function confirmPlanChange() {
    if (!pendingPlanChangeUser) return;
    const nextPlan: AdminUserPlan = pendingPlanChangeUser.plan === "pro" ? "free" : "pro";
    setPlanSavingUserId(pendingPlanChangeUser.id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: pendingPlanChangeUser.id, plan: nextPlan }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar plano");
      const payload = (await response.json()) as { user?: AdminUser };
      if (payload.user) {
        const updatedUser = payload.user;
        setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      }
      setPendingPlanChangeUser(null);
    } catch {
      setUsersError("Nao foi possivel trocar o plano do usuario.");
    } finally {
      setPlanSavingUserId(null);
    }
  }

  async function openUserDetails(user: AdminUser) {
    setDetailsUser(user);
    setDetailsLoading(true);
    setDetailsError("");
    setDetailsData(null);
    try {
      const params = new URLSearchParams({ userId: user.id });
      const response = await fetch(`/api/admin/users/details?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar detalhes");
      const payload = (await response.json()) as UserDetailsData;
      setDetailsData(payload);
    } catch {
      setDetailsError("Nao foi possivel carregar os detalhes do usuario.");
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <TopBar title="Usuarios" subtitle="Lyka Admin · Lista completa" action={null} showNotifications={false} />

        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <aside className="appear-up lg:col-span-3 xl:col-span-2" style={{ animationDelay: "20ms" }}>
            <AdminSidebar />
          </aside>

          <div className="space-y-3 lg:col-span-9 xl:col-span-10">
            <section className="appear-up grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3" style={{ animationDelay: "50ms" }}>
              {dashboardCards.map((card) => (
                <article key={card.label} className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">{card.label}</p>
                  <p className="mt-1 text-[20px] font-semibold text-zinc-900">{card.value}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{card.hint}</p>
                </article>
              ))}
            </section>

            <section id="admin-usuarios" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "70ms" }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-zinc-900">Usuarios</h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                  {usersLoading ? "Carregando" : `${filteredUsers.length} listados`}
                </span>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, email ou ID"
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
                <select
                  value={planFilter}
                  onChange={(event) => setPlanFilter(event.target.value as "all" | AdminUserPlan)}
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">Todos os planos</option>
                  <option value="free">Somente Free</option>
                  <option value="pro">Somente Pro</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as "all" | AdminUserType)}
                  className="h-10 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-[12px] text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="Tutor">Tutor</option>
                  <option value="vet">Veterinario</option>
                </select>
              </div>

              <div className="mt-3 space-y-2">
                {usersError ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-center text-[12px] text-rose-700">{usersError}</p>
                ) : null}
                {filteredUsers.map((user) => (
                  <article key={user.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {user.photoUrl ? (
                          <Image
                            src={user.photoUrl}
                            alt={`Foto de ${user.name}`}
                            width={36}
                            height={36}
                            unoptimized
                            className="h-9 w-9 shrink-0 rounded-full border border-zinc-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-200 text-[11px] font-semibold text-zinc-700">
                            {initialsFromName(user.name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-zinc-800">{user.name}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {user.email} · Cadastro: {user.joinedAt} · {user.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${user.plan === "pro" ? "bg-indigo-100 text-indigo-800" : "bg-zinc-200 text-zinc-700"}`}>
                          {user.plan}
                        </span>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{user.userType}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${user.status === "ativo" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                          {user.status}
                        </span>
                        <button
                          type="button"
                          disabled={planSavingUserId === user.id}
                          onClick={() => setPendingPlanChangeUser(user)}
                          className="rounded-xl border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Trocar para {user.plan === "pro" ? "Free" : "Pro"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void openUserDetails(user)}
                          className="rounded-xl border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                        >
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {filteredUsers.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
                    {usersLoading ? "Carregando usuarios..." : "Nenhum usuario encontrado para os filtros aplicados."}
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>

      {pendingPlanChangeUser ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/35 px-4">
          <div className="w-full max-w-md rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_26px_55px_-28px_rgba(10,16,13,0.55)]">
            <h3 className="text-[15px] font-semibold text-zinc-900">Confirmar alteracao</h3>
            <p className="mt-2 text-[12px] leading-relaxed text-zinc-600">
              Deseja realmente trocar tipo de assinatura de{" "}
              <span className="font-semibold text-zinc-800">{pendingPlanChangeUser.name}</span> para{" "}
              <span className="font-semibold text-zinc-800">{pendingPlanChangeUser.plan === "pro" ? "Free" : "Pro"}</span>?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingPlanChangeUser(null)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={planSavingUserId === pendingPlanChangeUser.id}
                onClick={confirmPlanChange}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {planSavingUserId === pendingPlanChangeUser.id ? "Salvando..." : "Confirmar troca"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailsUser ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/35 px-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_26px_55px_-28px_rgba(10,16,13,0.55)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-semibold text-zinc-900">Detalhes do usuario</h3>
              <button
                type="button"
                onClick={() => setDetailsUser(null)}
                className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Fechar
              </button>
            </div>

            {detailsLoading ? <p className="text-[12px] text-zinc-500">Carregando detalhes...</p> : null}
            {detailsError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{detailsError}</p> : null}

            {detailsData ? (
              <div className="space-y-3">
                <section className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Usuario</p>
                  <div className="mt-2 flex items-center gap-2">
                    {detailsData.user.photoUrl ? (
                      <Image
                        src={detailsData.user.photoUrl}
                        alt={`Foto de ${detailsData.user.name}`}
                        width={44}
                        height={44}
                        unoptimized
                        className="h-11 w-11 rounded-full border border-zinc-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-200 text-[12px] font-semibold text-zinc-700">
                        {initialsFromName(detailsData.user.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-[13px] font-semibold text-zinc-800">{detailsData.user.name}</p>
                      <p className="text-[11px] text-zinc-500">{detailsData.user.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 grid gap-1 text-[11px] text-zinc-600 sm:grid-cols-2">
                    <p>ID: {detailsData.user.id}</p>
                    <p>Plano: {detailsData.user.plan}</p>
                    <p>Tipo: {detailsData.user.userType}</p>
                    <p>Telefone: {detailsData.user.phone || "Nao informado"}</p>
                    <p>Nascimento: {detailsData.user.birthDate || "Nao informado"}</p>
                    <p>Cadastro: {detailsData.user.createdAt || "Nao informado"}</p>
                  </div>
                </section>

                <section className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">Pets vinculados</p>
                  <div className="mt-2 space-y-2">
                    {detailsData.pets.map((pet) => (
                      <article key={pet.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Image
                            src={pet.image}
                            alt={`Foto de ${pet.name}`}
                            width={34}
                            height={34}
                            unoptimized
                            className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-zinc-800">{pet.name}</p>
                            <p className="truncate text-[10px] text-zinc-500">
                              {pet.petIdentity} · {pet.breed}
                            </p>
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          NFC: {pet.nfcId || "Nao pareado"} · Ultimo acesso: {pet.lastNfcAccessAt || "Nao registrado"}
                        </p>
                      </article>
                    ))}
                    {detailsData.pets.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-3 py-3 text-center text-[11px] text-zinc-500">
                        Nenhum pet vinculado para este usuario.
                      </p>
                    ) : null}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
