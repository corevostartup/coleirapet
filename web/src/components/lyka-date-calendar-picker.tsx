"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LYKA_Z_INDEX } from "@/lib/ui/z-index";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const POPOVER_ESTIMATED_HEIGHT = 340;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function isoFromLocalDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIsoLocal(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, day] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== day) return null;
  return dt;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function capitalizePt(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** Data minima inclusiva (ISO). */
  minDate?: string;
  /** Data maxima inclusiva (ISO). Por padrao hoje. */
  maxDate?: string;
};

export function LykaDateCalendarPicker({ id, label, value, onChange, disabled, minDate, maxDate }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<PopoverPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => parseIsoLocal(value), [value]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayIso = useMemo(() => isoFromLocalDate(today), [today]);

  const minD = useMemo(() => (minDate ? parseIsoLocal(minDate) : null), [minDate]);
  const maxD = useMemo(() => (maxDate ? parseIsoLocal(maxDate) : today), [maxDate, today]);

  const [cursor, setCursor] = useState(() => {
    const base = selected ?? maxD ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selected) return;
    setCursor(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selected]);

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(320, Math.max(rect.width, 280), window.innerWidth - 16);
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    let top = rect.bottom + 8;
    if (top + POPOVER_ESTIMATED_HEIGHT > window.innerHeight - 12) {
      top = rect.top - POPOVER_ESTIMATED_HEIGHT - 8;
    }
    top = Math.max(8, Math.min(top, window.innerHeight - POPOVER_ESTIMATED_HEIGHT - 8));

    setPopoverStyle({ top, left, width });
  }, []);

  useEffect(() => {
    if (!open || disabled) {
      setPopoverStyle(null);
      return;
    }

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, disabled, updatePopoverPosition]);

  useEffect(() => {
    if (!open || disabled) return;
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open, disabled]);

  const canGoPrev = useMemo(() => {
    if (!minD) return true;
    const firstCur = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const firstMin = new Date(minD.getFullYear(), minD.getMonth(), 1);
    return firstCur.getTime() > firstMin.getTime();
  }, [cursor, minD]);

  const canGoNext = useMemo(() => {
    if (!maxD) return true;
    const firstCur = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const firstMax = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
    return firstCur.getTime() < firstMax.getTime();
  }, [cursor, maxD]);

  const monthTitle = useMemo(
    () => capitalizePt(new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(cursor)),
    [cursor],
  );

  const cells = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const total = daysInMonth(y, m);
    const out: ({ day: number; inMonth: boolean } | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= total; d++) out.push({ day: d, inMonth: true });
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  function isDisabledDate(d: Date) {
    const t0 = startOfDay(d).getTime();
    if (minD && t0 < startOfDay(minD).getTime()) return true;
    if (maxD && t0 > startOfDay(maxD).getTime()) return true;
    return false;
  }

  function goMonth(delta: number) {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const displayValue = selected
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(selected)
    : "Selecione";

  const calendarPanel = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Calendario"
      className="rounded-[22px] border border-zinc-200/90 bg-white/98 p-3 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] backdrop-blur-sm"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!canGoPrev}
          aria-label="Mes anterior"
          onClick={() => canGoPrev && goMonth(-1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="min-w-0 flex-1 text-center text-[13px] font-semibold capitalize text-zinc-900">{monthTitle}</p>
        <button
          type="button"
          disabled={!canGoNext}
          aria-label="Proximo mes"
          onClick={() => canGoNext && goMonth(1)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const y = cursor.getFullYear();
          const m = cursor.getMonth();
          const d = new Date(y, m, cell.day);
          const iso = isoFromLocalDate(d);
          const dis = isDisabledDate(d);
          const isSel = value === iso;
          const isToday = iso === todayIso;

          return (
            <button
              key={iso}
              type="button"
              disabled={dis}
              onClick={() => {
                if (dis) return;
                onChange(iso);
                setOpen(false);
              }}
              className={`flex aspect-square min-h-0 w-full items-center justify-center rounded-xl text-[13px] font-medium transition ${
                isSel
                  ? "bg-emerald-600 text-white shadow-sm"
                  : dis
                    ? "cursor-not-allowed text-zinc-300"
                    : "text-zinc-800 hover:bg-emerald-50 hover:text-emerald-900"
              } ${!isSel && !dis && isToday ? "ring-1 ring-emerald-400/80 ring-offset-1" : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[12px] font-semibold text-zinc-700">
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => {
            const next = !current;
            if (next) {
              window.requestAnimationFrame(() => updatePopoverPosition());
            }
            return next;
          });
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="lyka-date-field mt-2 flex h-11 min-h-11 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-2.5 text-left text-[13px] text-zinc-900 outline-none transition focus:border-emerald-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-90 sm:px-3"
      >
        <span className="min-w-0 truncate">{displayValue}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>

      {mounted && open && !disabled && popoverStyle
        ? createPortal(
            <div
              className="fixed"
              style={{
                top: popoverStyle.top,
                left: popoverStyle.left,
                width: popoverStyle.width,
                zIndex: LYKA_Z_INDEX.calendarPopover,
              }}
            >
              {calendarPanel}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
