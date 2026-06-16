"use client";

import { useEffect, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { TopBar } from "@/components/shell";

type AdminLog = {
  id: string;
  createdAt?: string;
  action?: string;
  area?: string;
  message?: string;
  actorUid?: string;
  actorName?: string;
  actorEmail?: string;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  metadata?: Record<string, unknown>;
};

function formatDate(value?: string) {
  if (!value) return "Sem data";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

export default function LykaAdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/admin/logs", { cache: "no-store" });
        if (!response.ok) throw new Error("Falha ao carregar logs");
        const payload = (await response.json()) as { logs?: AdminLog[] };
        if (!cancelled) setLogs(Array.isArray(payload.logs) ? payload.logs : []);
      } catch {
        if (!cancelled) {
          setLogs([]);
          setError("Nao foi possivel carregar os logs administrativos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLogs();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="ios-safe-top min-h-screen px-3 py-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <TopBar title="Logs administrativos" subtitle="Acoes realizadas no painel administrativo" action={null} showNotifications={false} />

        <div className="mt-3 grid gap-3 lg:grid-cols-12">
          <aside className="appear-up lg:col-span-3 xl:col-span-2" style={{ animationDelay: "20ms" }}>
            <AdminSidebar />
          </aside>

          <div className="space-y-3 lg:col-span-9 xl:col-span-10">
            <section className="appear-up rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "70ms" }}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-semibold text-zinc-900">Logs de usuario · Area Administrativa</h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700">
                  {loading ? "Carregando" : `${logs.length} eventos`}
                </span>
              </div>

              {error ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-center text-[12px] text-rose-700">{error}</p>
              ) : null}

              <div className="space-y-2">
                {logs.map((log) => (
                  <article key={log.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-semibold text-zinc-800">{log.message || "Evento administrativo"}</p>
                      <span className="text-[10px] text-zinc-500">{formatDate(log.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {(log.actorName || "Administrador").trim()} {log.actorEmail ? `· ${log.actorEmail}` : ""}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      acao: <span className="font-semibold text-zinc-700">{log.action || "n/a"}</span> · area:{" "}
                      <span className="font-semibold text-zinc-700">{log.area || "admin"}</span>
                    </p>
                    {log.targetUserName || log.targetUserId ? (
                      <p className="mt-1 text-[10px] text-zinc-500">
                        alvo: {log.targetUserName || "Sem nome"} {log.targetUserEmail ? `· ${log.targetUserEmail}` : ""}{" "}
                        {log.targetUserId ? `(${log.targetUserId})` : ""}
                      </p>
                    ) : null}
                  </article>
                ))}
                {!loading && logs.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
                    Nenhum log administrativo encontrado.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
