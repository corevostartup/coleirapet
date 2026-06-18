"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HomeUpcomingEventRow } from "@/lib/home/upcoming-events";
import { petMetricsQuery, useSelectedPet } from "@/lib/pets/use-selected-pet";

type UpcomingEventItem = Pick<HomeUpcomingEventRow, "id" | "label" | "when" | "kind" | "source">;

export function HomeUpcomingEventsSection({
  animationDelay = "380ms",
  initialPetId,
  initialPetName,
}: {
  animationDelay?: string;
  initialPetId?: string;
  initialPetName?: string;
}) {
  const { petId, petName } = useSelectedPet({ petId: initialPetId, petName: initialPetName });
  const displayPetName = petName || initialPetName || "";
  const [events, setEvents] = useState<UpcomingEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!petId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/home/upcoming-events${petMetricsQuery(petId)}`, { cache: "no-store" });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Falha ao carregar proximos eventos.");
        }
        const payload = (await res.json()) as { events?: UpcomingEventItem[] };
        if (!cancelled) setEvents(payload.events ?? []);
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setError(err instanceof Error ? err.message : "Falha ao carregar proximos eventos.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  return (
    <section
      className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
      style={{ animationDelay }}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-zinc-900">Proximos eventos</h3>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {displayPetName
              ? `Vacinas pendentes e lembretes de ${displayPetName}`
              : "Vacinas pendentes e lembretes de medicacao do pet"}
          </p>
        </div>
        <Link
          href="/dados"
          className="text-[11px] font-semibold text-emerald-700 underline decoration-emerald-600/35 underline-offset-2"
        >
          Ver em Dados
        </Link>
      </div>

      {error ? <p className="mb-2 text-[12px] font-medium text-red-600">{error}</p> : null}

      <div className="space-y-2">
        {loading ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-500">
            Carregando eventos...
          </p>
        ) : events.length === 0 ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[12px] text-zinc-500">
            Nenhuma vacina pendente nem lembrete cadastrado.{" "}
            <Link href="/dados" className="font-semibold text-emerald-700 underline decoration-emerald-600/35">
              Abrir Dados
            </Link>
          </p>
        ) : (
          events.map((item) => (
            <Link
              key={item.id}
              href="/dados"
              className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.kind === "warning" ? "bg-amber-500" : "bg-blue-500"}`}
                />
                <div className="min-w-0">
                  <span
                    className={`mb-0.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      item.source === "vaccine" ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                    }`}
                  >
                    {item.source === "vaccine" ? "Vacina pendente" : "Lembrete"}
                  </span>
                  <p className="truncate text-[13px] font-medium text-zinc-800">{item.label}</p>
                </div>
              </div>
              <p className="shrink-0 text-right text-[11px] text-zinc-500">{item.when}</p>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
