"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { HealthWeightSevenDayChart } from "@/components/health-weight-seven-day-chart";

function formatKgKg(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
}

type WeightEntry = {
  id: string;
  date: string;
  weightKg: number;
};

export function HomeWeightChartSection({
  animationDelay = "270ms",
  compact = false,
}: {
  animationDelay?: string;
  /** Card quadrado na Home, ao lado de Atividade. */
  compact?: boolean;
}) {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const res = await fetch("/api/pets/weight-entries");
        if (!res.ok) {
          if (!cancelled) setEntries([]);
          return;
        }
        const data = (await res.json()) as { entries?: WeightEntry[] };
        if (!cancelled) setEntries(data.entries ?? []);
      } catch {
        if (!cancelled) setError("Falha ao carregar peso.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartEntries = useMemo(
    () => entries.map((e) => ({ date: e.date, weightKg: e.weightKg })),
    [entries],
  );

  const latestWeight = entries.length > 0 ? entries[0]?.weightKg ?? null : null;

  const shellProps = compact
    ? {}
    : ({ "data-lyka-shell-span": "full" } as const);

  const sectionClass = compact
    ? "appear-up flex aspect-square min-h-0 min-w-0 flex-col overflow-hidden rounded-[22px] border border-zinc-100/80 bg-white p-2.5 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)] sm:rounded-[26px] sm:p-3"
    : "appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]";

  return (
    <section {...shellProps} className={sectionClass} style={{ animationDelay }}>
      <div className={`flex items-start justify-between gap-1 ${compact ? "mb-1 shrink-0" : "mb-3 flex-wrap"}`}>
        <div className="min-w-0">
          <h3 className={`font-semibold text-zinc-900 ${compact ? "text-[12px] sm:text-[13px]" : "text-[14px]"}`}>Peso</h3>
          <p className={`text-zinc-500 ${compact ? "mt-0.5 text-[10px] leading-tight" : "mt-0.5 text-[12px]"}`}>
            {loading
              ? compact
                ? "…"
                : "Carregando..."
              : latestWeight != null
                ? compact
                  ? formatKgKg(latestWeight)
                  : `Ultimo: ${formatKgKg(latestWeight)}`
                : compact
                  ? "Sem registo"
                  : "Registre o peso na area Saude."}
          </p>
        </div>
        {compact ? null : (
          <Link
            href="/health"
            className="shrink-0 text-[11px] font-semibold text-emerald-700 underline decoration-emerald-600/35 underline-offset-2"
          >
            Ver em Saude
          </Link>
        )}
      </div>

      {error ? (
        <p className={`shrink-0 font-medium text-red-600 ${compact ? "mb-1 text-[10px]" : "mb-2 text-[12px]"}`}>{error}</p>
      ) : null}

      {!loading ? (
        compact ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <HealthWeightSevenDayChart entries={chartEntries} variant="compact" />
          </div>
        ) : (
          <HealthWeightSevenDayChart entries={chartEntries} variant="default" />
        )
      ) : null}
    </section>
  );
}
