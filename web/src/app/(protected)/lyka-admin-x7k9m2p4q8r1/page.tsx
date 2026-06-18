"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import TopBar from "@/components/top-bar";
import { AdminSidebar } from "@/components/admin-sidebar";

const kpiCards = [
  { label: "Usuarios ativos (24h)", value: "1.284", trend: "+8.4%", tone: "text-emerald-700", chip: "Saudavel" },
  { label: "Pets monitorados", value: "3.912", trend: "+2.1%", tone: "text-emerald-700", chip: "Em alta" },
  { label: "Tags NFC pareadas", value: "2.744", trend: "+1.3%", tone: "text-sky-700", chip: "Estavel" },
  { label: "Incidentes abertos", value: "17", trend: "-12%", tone: "text-amber-700", chip: "Atencao" },
] as const;

const moderationQueue = [
  { id: "MOD-021", item: "Foto de pet enviada por usuario", type: "Conteudo", status: "Pendente", age: "3 min" },
  { id: "MOD-020", item: "Edicao de perfil publico", type: "Perfil", status: "Revisao", age: "11 min" },
  { id: "MOD-019", item: "Solicitacao de exclusao de conta", type: "Conta", status: "Pendente", age: "19 min" },
] as const;

const supportTickets = [
  { code: "#SUP-4412", subject: "Nao consigo parear NFC", priority: "Alta", owner: "Equipe App", sla: "18 min" },
  { code: "#SUP-4409", subject: "Foto do pet nao atualiza", priority: "Media", owner: "Equipe Web", sla: "42 min" },
  { code: "#SUP-4401", subject: "Duvida sobre plano", priority: "Baixa", owner: "CX", sla: "2h" },
] as const;

const auditLog = [
  { time: "10:07", actor: "admin@lyka.app", action: "Atualizou feature flag: med-card-v2", area: "Config" },
  { time: "09:52", actor: "ops@lyka.app", action: "Reprocessou lembretes de medicacao", area: "Jobs" },
  { time: "09:31", actor: "vet@lyka.app", action: "Aprovou cadastro de clinica", area: "Vet" },
  { time: "09:10", actor: "sistema", action: "Rotina de backup finalizada", area: "Infra" },
] as const;

const financialSummary = [
  { label: "MRR estimado", value: "R$ 42.680", hint: "Mock" },
  { label: "Novas assinaturas", value: "54", hint: "Ultimas 24h" },
  { label: "Cancelamentos", value: "8", hint: "Ultimas 24h" },
  { label: "Taxa de conversao", value: "6,7%", hint: "Mock" },
] as const;

const regionHealth = [
  { region: "Sudeste", users: "624", incidents: 4, color: "bg-emerald-500" },
  { region: "Sul", users: "281", incidents: 2, color: "bg-emerald-500" },
  { region: "Nordeste", users: "205", incidents: 5, color: "bg-amber-500" },
  { region: "Centro-Oeste", users: "124", incidents: 3, color: "bg-sky-500" },
  { region: "Norte", users: "50", incidents: 3, color: "bg-amber-500" },
] as const;

const mockTermsSections = [
  {
    title: "Uso permitido",
    text: "Esta secao mock define que a plataforma deve ser usada apenas para acompanhamento de pets, sem violar leis locais ou direitos de terceiros.",
  },
  {
    title: "Conta e seguranca",
    text: "O usuario e responsavel por manter credenciais seguras. Em caso de suspeita de acesso indevido, a conta deve ser atualizada imediatamente.",
  },
  {
    title: "Suspensao e encerramento",
    text: "A Lyka pode suspender recursos em caso de abuso, fraude ou atividade maliciosa. Este texto e apenas ilustrativo para ambiente administrativo.",
  },
] as const;

const mockPrivacySections = [
  {
    title: "Dados coletados",
    text: "Coletamos dados de cadastro, informacoes de pet e eventos de uso do app para melhorar funcionalidades e suporte, em carater demonstrativo.",
  },
  {
    title: "Finalidade do tratamento",
    text: "Os dados sao usados para operacao da conta, envio de notificacoes e melhoria de produto. Nao representam politica oficial publicada.",
  },
  {
    title: "Compartilhamento e retencao",
    text: "Compartilhamento ocorre apenas quando necessario para prestacao do servico. O periodo de retencao deve seguir regras internas e legais.",
  },
] as const;

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

const fallbackUsers: AdminUser[] = [];

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? "U";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

function chipTone(status: string) {
  if (status === "Pendente") return "bg-amber-100 text-amber-900 ring-amber-200";
  if (status === "Revisao") return "bg-sky-100 text-sky-900 ring-sky-200";
  return "bg-emerald-100 text-emerald-900 ring-emerald-200";
}

function priorityTone(priority: string) {
  if (priority === "Alta") return "text-rose-700";
  if (priority === "Media") return "text-amber-700";
  return "text-zinc-600";
}

export default function LykaAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>(fallbackUsers);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [pendingPlanChangeUser, setPendingPlanChangeUser] = useState<AdminUser | null>(null);
  const [planSavingUserId, setPlanSavingUserId] = useState<string | null>(null);
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [detailsData, setDetailsData] = useState<UserDetailsData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      setUsersLoading(true);
      setUsersError("");
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Falha ao carregar usuarios.");
        }
        const payload = (await response.json()) as { users?: AdminUser[] };
        if (!cancelled) setUsers(Array.isArray(payload.users) ? payload.users : []);
      } catch {
        if (!cancelled) {
          setUsers([]);
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

  const previewUsers = users.slice(0, 10);

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
        <TopBar
          title="Painel Administrativo"
          subtitle="Lyka · Operacoes internas"
          showNotifications={false}
          action={
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
              Mock Mode
            </span>
          }
        >
          <p className="rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] text-violet-900">
            Endereco privado: <span className="font-semibold">/lyka-admin-x7k9m2p4q8r1</span>
          </p>
        </TopBar>

        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <aside className="appear-up lg:col-span-3 xl:col-span-2" style={{ animationDelay: "20ms" }}>
            <AdminSidebar />
          </aside>

          <div className="lg:col-span-9 xl:col-span-10">
            <section id="admin-overview" className="appear-up grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3" style={{ animationDelay: "40ms" }}>
              {kpiCards.map((card) => (
                <article key={card.label} className="elev-card rounded-2xl p-3 md:p-4">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">{card.label}</p>
                  <p className="mt-1 text-[20px] font-semibold text-zinc-900 md:text-[24px]">{card.value}</p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className={`text-[11px] font-semibold ${card.tone}`}>{card.trend}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700">{card.chip}</span>
                  </div>
                </article>
              ))}
            </section>

            <div className="mt-3 grid gap-3 xl:grid-cols-12">
              <div className="space-y-3 xl:col-span-8">
                <section id="admin-usuarios" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "70ms" }}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-[14px] font-semibold text-zinc-900">Usuarios</h2>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                        {usersLoading ? "Carregando" : `${users.length} reais`}
                      </span>
                      <Link
                        href="/lyka-admin-x7k9m2p4q8r1/usuarios"
                        className="rounded-xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Ver mais
                      </Link>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {usersError ? (
                      <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-center text-[12px] text-rose-700">
                        {usersError}
                      </p>
                    ) : null}
                    {previewUsers.map((user) => (
                      <article key={user.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
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
                                {user.email} · {user.joinedAt}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${user.plan === "pro" ? "bg-indigo-100 text-indigo-800" : "bg-zinc-200 text-zinc-700"}`}>
                              {user.plan}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{user.userType}</span>
                            <button
                              type="button"
                              disabled={planSavingUserId === user.id}
                              onClick={() => setPendingPlanChangeUser(user)}
                              className="ml-1 rounded-lg border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Trocar para {user.plan === "pro" ? "Free" : "Pro"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void openUserDetails(user)}
                              className="rounded-lg border border-zinc-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                            >
                              Detalhes
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                    {previewUsers.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
                        {usersLoading ? "Carregando usuarios..." : "Nenhum usuario encontrado."}
                      </p>
                    ) : null}
                  </div>
                </section>

                <section id="admin-moderacao" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-zinc-900">Fila de moderacao</h2>
                <button type="button" className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
                  Ver tudo
                </button>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {moderationQueue.map((row) => (
                  <article key={row.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-zinc-800">{row.item}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${chipTone(row.status)}`}>{row.status}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>
                        {row.id} · {row.type}
                      </span>
                      <span>ha {row.age}</span>
                    </div>
                  </article>
                ))}
              </div>
                </section>

                <section id="admin-suporte" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "120ms" }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-zinc-900">Suporte e SLA</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">92% no prazo</span>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {supportTickets.map((ticket) => (
                  <article key={ticket.code} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-zinc-800">{ticket.subject}</p>
                      <p className={`text-[11px] font-semibold ${priorityTone(ticket.priority)}`}>{ticket.priority}</p>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>
                        {ticket.code} · {ticket.owner}
                      </span>
                      <span>SLA: {ticket.sla}</span>
                    </div>
                  </article>
                ))}
              </div>
                </section>

                <section id="admin-termos" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "140ms" }}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-[14px] font-semibold text-zinc-900">Termos de Uso</h2>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">Mock</span>
                  </div>
                  <div className="space-y-2">
                    {mockTermsSections.map((section) => (
                      <article key={section.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <h3 className="text-[12px] font-semibold text-zinc-800">{section.title}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{section.text}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section id="admin-privacidade" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "150ms" }}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-[14px] font-semibold text-zinc-900">Politicas de Privacidade</h2>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">Mock</span>
                  </div>
                  <div className="space-y-2">
                    {mockPrivacySections.map((section) => (
                      <article key={section.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <h3 className="text-[12px] font-semibold text-zinc-800">{section.title}</h3>
                        <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">{section.text}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <section id="admin-auditoria" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "200ms" }}>
              <h2 className="mb-3 text-[14px] font-semibold text-zinc-900">Log de auditoria</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {auditLog.map((event) => (
                  <article key={`${event.time}-${event.action}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-zinc-800">{event.action}</p>
                      <span className="text-[10px] font-medium text-zinc-500">{event.time}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {event.actor} · {event.area}
                    </p>
                  </article>
                ))}
              </div>
                </section>
              </div>

              <aside className="space-y-3 xl:col-span-4">
                <section id="admin-financeiro" className="appear-up grid grid-cols-2 gap-2 md:gap-3" style={{ animationDelay: "160ms" }}>
              {financialSummary.map((item) => (
                <article key={item.label} className="elev-card rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">{item.label}</p>
                  <p className="mt-1 text-[18px] font-semibold text-zinc-900">{item.value}</p>
                  <p className="mt-1 text-[10px] text-zinc-500">{item.hint}</p>
                </article>
              ))}
                </section>

                <section id="admin-regioes" className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "240ms" }}>
              <h2 className="mb-3 text-[14px] font-semibold text-zinc-900">Saude por regiao</h2>
              <div className="space-y-2">
                {regionHealth.map((row) => (
                  <div key={row.region} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <p className="font-semibold text-zinc-800">{row.region}</p>
                      <p className="text-zinc-500">{row.users} usuarios</p>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div className={`h-full ${row.color}`} style={{ width: `${Math.max(8, 100 - row.incidents * 10)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
                </section>

                <section
                  id="admin-acoes"
                  className="appear-up rounded-[26px] border border-emerald-200 bg-gradient-to-b from-emerald-50 via-white to-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
                  style={{ animationDelay: "280ms" }}
                >
              <h2 className="text-[14px] font-semibold text-zinc-900">Acoes rapidas</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700">
                  Reprocessar jobs
                </button>
                <button type="button" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700">
                  Exportar snapshot
                </button>
                <button type="button" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700">
                  Habilitar banner
                </button>
                <button type="button" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[12px] font-semibold text-zinc-700">
                  Abrir manutencao
                </button>
              </div>
              <p className="mt-2 text-[10px] text-zinc-500">Todos os blocos e metricas desta tela estao em modo mock, sem dados reais conectados.</p>
                </section>
              </aside>
            </div>
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
