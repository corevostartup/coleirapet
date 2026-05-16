"use client";

import { useId, useMemo } from "react";
import { IconWave } from "@/components/icons";

export type WeightChartEntry = {
  date: string;
  weightKg: number;
};

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"] as const;

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function toIsoDate(value: Date) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatKgShort(value: number) {
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

type Slot = {
  day: string;
  dateIso: string;
  weightKg: number | null;
};

function buildLastSevenDaysSlots(entries: WeightChartEntry[]): Slot[] {
  const byDate = new Map(entries.map((e) => [e.date, e.weightKg]));
  const today = startOfDay(new Date());
  const slots: Slot[] = [];

  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const iso = toIsoDate(date);
    const jsDay = date.getDay();
    const label = WEEKDAY_LABELS[(jsDay + 6) % 7];
    slots.push({
      day: label,
      dateIso: iso,
      weightKg: byDate.has(iso) ? (byDate.get(iso) as number) : null,
    });
  }

  return slots;
}

/** Grafico peso 7 dias; `variant="compact"` para card quadrado na Home (sem blocos de titulo extra). */
export function HealthWeightSevenDayChart({
  entries,
  variant = "default",
}: {
  entries: WeightChartEntry[];
  variant?: "default" | "compact";
}) {
  const strokeGradId = useId().replace(/:/g, "");
  const compact = variant === "compact";
  const slots = useMemo(() => buildLastSevenDaysSlots(entries), [entries]);

  const chartGeom = useMemo(() => {
    const vbW = 280;
    const vbH = compact ? 50 : 72;
    const values = slots.map((s) => s.weightKg).filter((w): w is number => w != null);
    if (values.length === 0) {
      return {
        pathD: "",
        circles: [] as { cx: number; cy: number; key: string }[],
        gridYs: [] as number[],
        vbW,
        vbH,
      };
    }

    const minW = Math.min(...values);
    const maxW = Math.max(...values);
    const pad = 0.35;
    const span = Math.max(maxW - minW, 0.25);
    const lo = minW - pad * span;
    const hi = maxW + pad * span;
    const range = Math.max(hi - lo, 1e-6);

    const padL = 8;
    const padR = 8;
    const padT = 8;
    const padB = 8;
    const innerW = vbW - padL - padR;
    const innerH = vbH - padT - padB;

    const gridLines = 3;
    const gridYs: number[] = [];
    for (let g = 0; g <= gridLines; g++) {
      gridYs.push(padT + (innerH * g) / gridLines);
    }

    let pathD = "";
    let move = true;
    const circles: { cx: number; cy: number; key: string }[] = [];

    slots.forEach((s, i) => {
      if (s.weightKg == null) return;
      const colW = innerW / 7;
      const cx = padL + i * colW + colW / 2;
      const cy = padT + innerH - ((s.weightKg - lo) / range) * innerH;

      if (move) {
        pathD += `M ${cx.toFixed(2)} ${cy.toFixed(2)}`;
        move = false;
      } else {
        pathD += ` L ${cx.toFixed(2)} ${cy.toFixed(2)}`;
      }

      circles.push({ cx, cy, key: s.dateIso });
    });

    return { pathD, circles, gridYs, vbW, vbH };
  }, [slots, compact]);

  const avgWeek = useMemo(() => {
    const nums = slots.map((s) => s.weightKg).filter((w): w is number => w != null);
    if (!nums.length) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return sum / nums.length;
  }, [slots]);

  const hasAnyPoint = chartGeom.circles.length > 0;

  const inner = (
    <div
      className={
        compact
          ? "flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-100 bg-zinc-50 p-2"
          : "rounded-2xl border border-zinc-100 bg-zinc-50 p-3"
      }
    >
      <div className={`grid grid-cols-7 ${compact ? "shrink-0 gap-0.5" : "gap-2"}`}>
        {slots.map((s) => (
          <div key={s.dateIso} className="flex flex-col items-center justify-end">
            <span
              className={`font-semibold tabular-nums text-zinc-500 ${compact ? "text-[8px]" : "text-[10px]"}`}
            >
              {s.weightKg != null ? formatKgShort(s.weightKg) : "—"}
            </span>
          </div>
        ))}
      </div>

      <div
        className={
          compact
            ? "relative mt-0.5 flex min-h-0 min-w-0 flex-1 flex-col"
            : "relative mt-1 h-[72px] w-full min-w-0"
        }
      >
        {!hasAnyPoint ? (
          <div
            className={`flex w-full items-center justify-center rounded-xl border border-dashed border-zinc-200/90 bg-white/40 text-center text-zinc-500 ${
              compact
                ? "min-h-0 flex-1 px-1.5 py-2 text-[9px] leading-snug"
                : "h-full px-2 text-[11px]"
            }`}
          >
            {compact ? "Sem dados na semana" : "Registre o peso em pelo menos um dia para ver a linha."}
          </div>
        ) : compact ? (
          <div className="relative min-h-0 w-full flex-1">
            <svg
              viewBox={`0 0 ${chartGeom.vbW} ${chartGeom.vbH}`}
              className="absolute inset-0 h-full w-full overflow-visible"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <linearGradient id={`${strokeGradId}-ln`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {chartGeom.gridYs.map((gy, idx) => (
                <line
                  key={idx}
                  x1={8}
                  y1={gy}
                  x2={chartGeom.vbW - 8}
                  y2={gy}
                  stroke="#e4e4e7"
                  strokeWidth={0.75}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {chartGeom.pathD ? (
                <path
                  d={chartGeom.pathD}
                  fill="none"
                  stroke={`url(#${strokeGradId}-ln)`}
                  strokeWidth={1.85}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {chartGeom.circles.map((c) => (
                <g key={c.key}>
                  <circle cx={c.cx} cy={c.cy} r={4.25} fill="#ffffff" stroke="#10b981" strokeWidth={1.5} />
                  <circle cx={c.cx} cy={c.cy} r={1.8} fill="#10b981" />
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartGeom.vbW} ${chartGeom.vbH}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <linearGradient id={`${strokeGradId}-ln`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>

            {chartGeom.gridYs.map((gy, idx) => (
              <line
                key={idx}
                x1={8}
                y1={gy}
                x2={chartGeom.vbW - 8}
                y2={gy}
                stroke="#e4e4e7"
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {chartGeom.pathD ? (
              <path
                d={chartGeom.pathD}
                fill="none"
                stroke={`url(#${strokeGradId}-ln)`}
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {chartGeom.circles.map((c) => (
              <g key={c.key}>
                <circle cx={c.cx} cy={c.cy} r={5.5} fill="#ffffff" stroke="#10b981" strokeWidth={2} />
                <circle cx={c.cx} cy={c.cy} r={2.2} fill="#10b981" />
              </g>
            ))}
          </svg>
        )}
      </div>

      <div className={`grid grid-cols-7 ${compact ? "mt-1 shrink-0 gap-0.5" : "mt-2 gap-2"}`}>
        {slots.map((s) => (
          <div key={`${s.dateIso}-lab`} className="flex flex-col items-center">
            <span className={`font-medium text-zinc-500 ${compact ? "text-[8px]" : "text-[10px]"}`}>{s.day}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (compact) {
    return <div className="flex min-h-0 min-w-0 flex-1 flex-col">{inner}</div>;
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[14px] font-semibold text-zinc-900">Variacao em 7 dias</h4>
        <IconWave className="h-5 w-5 text-zinc-500" aria-hidden />
      </div>
      <div className="mb-3 flex items-center justify-between text-[11px]">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">Peso (kg)</span>
        <span className="text-zinc-500">
          {avgWeek != null ? `Media: ${formatKgShort(avgWeek)} kg` : "Sem pontos nesta semana"}
        </span>
      </div>

      {inner}

      <p className="mt-3 text-[11px] text-zinc-500">Ultimos 7 dias · uma medicao por dia</p>
    </div>
  );
}
