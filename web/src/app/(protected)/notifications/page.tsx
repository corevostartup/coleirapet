"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell";
import TopBar from "@/components/top-bar";
import { PetAvatarImage } from "@/components/pet-avatar-image";
import { IconBell } from "@/components/icons";
type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  status: string;
  unread: boolean;
  when: string;
  petId?: string;
  petName?: string;
  petImage?: string;
};

function kindDotClass(kind: string) {
  if (kind === "warning") return "bg-amber-500";
  if (kind === "success" || kind === "accepted") return "bg-emerald-500";
  if (kind === "cancelled") return "bg-zinc-400";
  return "bg-blue-500";
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadNotifications() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as
        | { notifications?: NotificationItem[]; unreadCount?: number; error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error ?? "Falha ao carregar notificacoes.");
      setItems(Array.isArray(payload?.notifications) ? payload.notifications : []);
      setUnreadCount(typeof payload?.unreadCount === "number" ? payload.unreadCount : 0);
      await fetch("/api/notifications", { method: "POST" });
    } catch (err) {
      setItems([]);
      setUnreadCount(0);
      setError(err instanceof Error ? err.message : "Falha ao carregar notificacoes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function respondInvite(notificationId: string, action: "accept" | "cancel") {
    setBusyId(notificationId);
    setError("");
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, action }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Falha ao processar notificacao.");
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao processar notificacao.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell tab="home">
      <TopBar title="Notificacoes" subtitle="Alertas da conta" />

      {unreadCount > 0 ? (
        <section
          className="appear-up mt-3 rounded-[26px] border border-emerald-200/90 bg-gradient-to-b from-emerald-50 via-white to-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
          style={{ animationDelay: "40ms" }}
        >
          <div className="flex items-center gap-2">
            <IconBell className="h-5 w-5 text-emerald-700" aria-hidden />
            <p className="text-[13px] font-semibold text-emerald-900">
              {unreadCount === 1 ? "1 nova notificacao" : `${unreadCount} novas notificacoes`}
            </p>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-emerald-800/90">Resumo dos alertas recentes da conta e tutoria.</p>
        </section>
      ) : null}

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "90ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-zinc-900">Todas</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">{items.length} itens</span>
            <Link
              prefetch
              href="/notifications/settings"
              className="rounded-xl border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Configurar
            </Link>
          </div>
        </div>
        {error ? <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{error}</p> : null}

        {loading ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-[12px] text-zinc-500">Carregando notificacoes...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center">
            <IconBell className="h-10 w-10 text-zinc-300" aria-hidden />
            <p className="mt-3 text-[14px] font-semibold text-zinc-800">Nenhuma notificacao</p>
            <p className="mt-1 max-w-[260px] text-[12px] leading-snug text-zinc-500">
              Quando houver alertas da coleira ou da conta, eles aparecem aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => {
              const isUnread = item.unread;
              const isInvite = item.type === "secondary_tutor_invite";
              const isPendingInvite = isInvite && item.status === "pending";
              const invitePetName = item.petName?.trim() || "Pet";
              return (
                <li key={item.id}>
                  <article
                    className={`appear-up rounded-2xl border px-3 py-2.5 transition ${
                      isUnread
                        ? "border-emerald-200/90 bg-emerald-50/60 shadow-[0_8px_20px_-16px_rgba(6,78,59,0.35)]"
                        : "border-zinc-200 bg-zinc-50"
                    }`}
                    style={{ animationDelay: `${120 + index * 40}ms` }}
                  >
                    <div className="flex items-start gap-2.5">
                      {isInvite ? (
                        <div className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                          <PetAvatarImage
                            src={item.petImage}
                            alt={`Foto de ${invitePetName}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${kindDotClass(item.status)}`} aria-hidden />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                          {isInvite ? (
                            <p className="text-[14px] font-semibold text-zinc-900">{invitePetName}</p>
                          ) : (
                            <p className="text-[13px] font-semibold text-zinc-900">{item.title}</p>
                          )}
                          <time className="shrink-0 text-[11px] text-zinc-500">{item.when}</time>
                        </div>
                        {isInvite ? (
                          <p className="mt-0.5 text-[11px] font-medium text-emerald-800">{item.title}</p>
                        ) : null}
                        <p className="mt-1 text-[12px] leading-snug text-zinc-600">{item.body}</p>
                        {isUnread ? (
                          <span className="mt-2 inline-flex rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                            Nova
                          </span>
                        ) : null}
                        {isPendingInvite ? (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => void respondInvite(item.id, "accept")}
                              className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyId === item.id ? "Processando..." : "Aceitar"}
                            </button>
                            <button
                              type="button"
                              disabled={busyId === item.id}
                              onClick={() => void respondInvite(item.id, "cancel")}
                              className="rounded-xl border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
