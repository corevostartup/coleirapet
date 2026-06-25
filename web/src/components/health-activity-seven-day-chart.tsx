"use client";

import { useId, useMemo } from "react";

export type ActivityChartEntry = {
  date: string;
  minutes: number;
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

type Slot = {
  day: string;
  dateIso: string;
  minutes: number;
};

function buildLastSevenDaysSlots(entries: ActivityChartEntry[]): Slot[] {
  const byDate = new Map(entries.map((e) => [e.date, Math.max(0, Math.round(e.minutes))]));
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
      minutes: byDate.get(iso) ?? 0,
    });
  }

  return slots;
}

function formatMinutesShort(value: number) {
  if (value <= 0) return "—";
  if (value < 60) return `${value}`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest > 0 ? `${hours}h${rest}` : `${hours}h`;
}

/** Grafico de barras — minutos ativos nos ultimos 7 dias. */
export function HealthActivitySevenDayChart({
  entries,
  variant = "dense",
}: {
  entries: ActivityChartEntry[];
  variant?: "dense";
}) {
  const fillGradId = useId().replace(/:/g, "");
  const slots = useMemo(() => buildLastSevenDaysSlots(entries), [entries]);
  const dense = variant === "dense";

  const chartGeom = useMemo(() => {
    const vbW = 280;
    const vbH = 32;
    const values = slots.map((s) => s.minutes);
    const maxVal = Math.max(...values, 1);
    const padL = 6;
    const padR = 6;
    const padT = 4;
    const padB = 4;
    const innerW = vbW - padL - padR;
    const innerH = vbH - padT - padB;
    const colW = innerW / 7;
    const barW = colW * 0.55;

    const bars = slots.map((s, i) => {
      const ratio = s.minutes / maxVal;
      const barH = s.minutes > 0 ? Math.max(ratio * innerH, 2) : 0;
      const cx = padL + i * colW + colW / 2;
      const x = cx - barW / 2;
      const y = padT + innerH - barH;
      return { x, y, width: barW, height: barH, key: s.dateIso, minutes: s.minutes };
    });

    return { bars, vbW, vbH, padT, innerH, padL, innerW };
  }, [slots]);

  const hasAnyData = slots.some((s) => s.minutes > 0);

  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-1">
      <div className={`grid grid-cols-7 ${dense ? "gap-0" : "gap-0.5"}`}>
        {slots.map((s) => (
          <div key={s.dateIso} className="flex flex-col items-center justify-end">
            <span className="text-[7px] font-semibold tabular-nums leading-none text-zinc-500">
              {formatMinutesShort(s.minutes)}
            </span>
          </div>
        ))}
      </div>

      <div className="relative mt-0 h-[34px] w-full min-w-0">
        {!hasAnyData ? (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-zinc-200/90 bg-white/40 px-1 text-center text-[8px] leading-none text-zinc-500">
            Sem dados na semana
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chartGeom.vbW} ${chartGeom.vbH}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <linearGradient id={`${fillGradId}-bar`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <line
              x1={chartGeom.padL}
              y1={chartGeom.padT + chartGeom.innerH}
              x2={chartGeom.padL + chartGeom.innerW}
              y2={chartGeom.padT + chartGeom.innerH}
              stroke="#e4e4e7"
              strokeWidth={0.5}
            />
            {chartGeom.bars.map((bar) =>
              bar.height > 0 ? (
                <rect
                  key={bar.key}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  rx={1.5}
                  fill={`url(#${fillGradId}-bar)`}
                />
              ) : null,
            )}
          </svg>
        )}
      </div>

      <div className="mt-0.5 grid grid-cols-7 gap-0">
        {slots.map((s) => (
          <div key={`${s.dateIso}-lab`} className="flex flex-col items-center">
            <span className="text-[7px] font-medium leading-none text-zinc-500">{s.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
