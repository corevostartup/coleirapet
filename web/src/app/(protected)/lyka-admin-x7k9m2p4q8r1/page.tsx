"use client";

import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell";

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

const adminMenu = [
  { label: "Visao geral", href: "#admin-overview" },
  { label: "Usuarios", href: "#admin-usuarios" },
  { label: "Moderacao", href: "#admin-moderacao" },
  { label: "Suporte", href: "#admin-suporte" },
  { label: "Financeiro", href: "#admin-financeiro" },
  { label: "Regioes", href: "#admin-regioes" },
  { label: "Auditoria", href: "#admin-auditoria" },
  { label: "Acoes rapidas", href: "#admin-acoes" },
] as const;

type AdminUserPlan = "free" | "pro";
type AdminUserType = "Tutor" | "vet";
type AdminUserStatus = "ativo" | "inativo";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  plan: AdminUserPlan;
  userType: AdminUserType;
  status: AdminUserStatus;
  joinedAt: string;
};

const mockUsers: AdminUser[] = [
  { id: "USR-901", name: "Ana Lima", email: "ana.lima@email.com", plan: "free", userType: "Tutor", status: "ativo", joinedAt: "2026-04-02" },
  { id: "USR-902", name: "Bruno Rosa", email: "bruno.rosa@email.com", plan: "pro", userType: "Tutor", status: "ativo", joinedAt: "2026-03-18" },
  { id: "USR-903", name: "Clinica VetSul", email: "contato@vetsul.com", plan: "pro", userType: "vet", status: "ativo", joinedAt: "2026-02-27" },
  { id: "USR-904", name: "Carla Nunes", email: "carla.nunes@email.com", plan: "free", userType: "Tutor", status: "inativo", joinedAt: "2026-01-10" },
  { id: "USR-905", name: "Dr. Marcelo Pires", email: "marcelo@clinicapires.com", plan: "free", userType: "vet", status: "ativo", joinedAt: "2026-04-11" },
  { id: "USR-906", name: "Rafaela Costa", email: "rafaela.costa@email.com", plan: "pro", userType: "Tutor", status: "ativo", joinedAt: "2026-04-20" },
];

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
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | AdminUserPlan>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | AdminUserType>("all");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      if (planFilter !== "all" && user.plan !== planFilter) return false;
      if (typeFilter !== "all" && user.userType !== typeFilter) return false;
      if (!q) return true;
      return user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q) || user.id.toLowerCase().includes(q);
    });
  }, [users, search, planFilter, typeFilter]);

  function togglePlan(userId: string) {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              plan: user.plan === "pro" ? "free" : "pro",
            }
          : user,
      ),
    );
  }

  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <TopBar
          title="Painel Administrativo"
          subtitle="Lyka · Operacoes internas"
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
            <nav className="sticky top-4 rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)]">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Menu administrativo</p>
              <ul className="space-y-1">
                {adminMenu.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-xl px-2.5 py-2 text-[12px] font-medium text-zinc-700 transition hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
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
                    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                      Mock
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
                    {filteredUsers.map((user) => (
                      <article key={user.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[12px] font-semibold text-zinc-800">{user.name}</p>
                            <p className="text-[10px] text-zinc-500">
                              {user.email} · {user.id}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${user.plan === "pro" ? "bg-indigo-100 text-indigo-800" : "bg-zinc-200 text-zinc-700"}`}>
                              {user.plan}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{user.userType}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${user.status === "ativo" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-700"}`}>
                              {user.status}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[10px] text-zinc-500">Cadastro: {user.joinedAt}</p>
                          <button
                            type="button"
                            onClick={() => togglePlan(user.id)}
                            className="rounded-xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                          >
                            Trocar para {user.plan === "pro" ? "Free" : "Pro"}
                          </button>
                        </div>
                      </article>
                    ))}
                    {filteredUsers.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
                        Nenhum usuario encontrado para os filtros aplicados.
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
    </main>
  );
}
