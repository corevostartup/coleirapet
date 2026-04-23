import Link from "next/link";
import { AppShell, TopBar } from "@/components/shell";
import { IconBell, IconHome } from "@/components/icons";
import { notifications as notificationItems } from "@/lib/mock";

function kindDotClass(kind: "info" | "warning" | "success") {
  if (kind === "warning") return "bg-amber-500";
  if (kind === "success") return "bg-emerald-500";
  return "bg-blue-500";
}

export default function NotificationsPage() {
  const unreadCount = notificationItems.filter((n) => n.unread).length;

  return (
    <AppShell tab="home">
      <TopBar
        title="Notificacoes"
        subtitle="Alertas da conta"
        action={
          <Link
            href="/"
            className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-[11px] font-semibold leading-snug text-zinc-800 shadow-sm transition hover:bg-zinc-50 sm:text-[12px]"
            aria-label="Voltar para home"
          >
            <IconHome className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            Home
          </Link>
        }
      />

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
          <p className="mt-1.5 text-[11px] leading-snug text-emerald-800/90">
            Resumo dos alertas recentes da coleira e da conta.
          </p>
        </section>
      ) : null}

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "90ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-zinc-900">Todas</h2>
          <span className="text-[11px] text-zinc-500">{notificationItems.length} itens</span>
        </div>

        {notificationItems.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-10 text-center">
            <IconBell className="h-10 w-10 text-zinc-300" aria-hidden />
            <p className="mt-3 text-[14px] font-semibold text-zinc-800">Nenhuma notificacao</p>
            <p className="mt-1 max-w-[260px] text-[12px] leading-snug text-zinc-500">
              Quando houver alertas da coleira ou da conta, eles aparecem aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notificationItems.map((item, index) => (
              <li key={item.id}>
                <article
                  className={`appear-up rounded-2xl border px-3 py-2.5 transition ${
                    item.unread
                      ? "border-emerald-200/90 bg-emerald-50/60 shadow-[0_8px_20px_-16px_rgba(6,78,59,0.35)]"
                      : "border-zinc-200 bg-zinc-50"
                  }`}
                  style={{ animationDelay: `${120 + index * 40}ms` }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${kindDotClass(item.kind)}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                        <p className="text-[13px] font-semibold text-zinc-900">{item.title}</p>
                        <time className="shrink-0 text-[11px] text-zinc-500">{item.when}</time>
                      </div>
                      <p className="mt-1 text-[12px] leading-snug text-zinc-600">{item.body}</p>
                      {item.unread ? (
                        <span className="mt-2 inline-flex rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          Nova
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
