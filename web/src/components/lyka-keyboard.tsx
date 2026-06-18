"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  onClose: () => void;
  placeholder?: string;
  initialMode?: "alpha" | "num";
  maskValue?: boolean;
  multiline?: boolean;
};

const ROWS_ALPHA = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

const ROWS_NUM = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "_", "@", ".", ",", ":", ";", "!", "?"],
  ["#", "$", "%", "&", "*", "(", ")", "/", "DEL"],
];

function displayValue(value: string, maskValue: boolean, multiline: boolean) {
  if (!value) return "";
  if (maskValue) return "•".repeat(Math.min(value.length, 24));
  if (multiline && value.length > 80) return `${value.slice(0, 80)}…`;
  return value;
}

export function LykaKeyboard({
  value,
  onChange,
  onSearch,
  onClose,
  placeholder,
  initialMode = "alpha",
  maskValue = false,
  multiline = false,
}: Props) {
  const [caps, setCaps] = useState(false);
  const [mode, setMode] = useState<"alpha" | "num">(initialMode);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setMode(initialMode);
    setCaps(false);
  }, [initialMode]);

  function press(key: string) {
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 100);

    if (key === "DEL") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "SHIFT") {
      setCaps((prev) => !prev);
      return;
    }
    if (key === "SPACE") {
      onChange(value + " ");
      return;
    }
    const char = mode === "alpha" && !caps ? key.toLowerCase() : key;
    onChange(value + char);
  }

  const rows = mode === "alpha" ? ROWS_ALPHA : ROWS_NUM;
  const preview = displayValue(value, maskValue, multiline);

  if (!mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[2100] bg-black/20" onClick={onClose} />

      <div
        className="fixed bottom-0 left-0 right-0 z-[2200] animate-slide-up rounded-t-[28px] bg-zinc-100 pb-safe px-2 pt-3 shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.18)]"
        style={{ animation: "slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both" }}
      >
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm">
          <div className="min-w-0 flex-1">
            {preview ? (
              <p className={`truncate text-[14px] font-medium text-zinc-800 ${multiline ? "whitespace-pre-wrap" : ""}`}>
                {preview}
              </p>
            ) : (
              <p className="text-[14px] text-zinc-400">{placeholder ?? "Digite..."}</p>
            )}
          </div>
          {value.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className="shrink-0 rounded-full p-1 text-zinc-400 transition active:bg-zinc-100"
              aria-label="Limpar"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
          {onSearch ? (
            <button
              type="button"
              onClick={() => {
                onSearch();
                onClose();
              }}
              className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition active:bg-emerald-700"
            >
              Buscar
            </button>
          ) : null}
        </div>

        <div className="space-y-1.5">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-1">
              {row.map((key) => {
                const isSpecial = key === "DEL" || key === "SHIFT";
                const isPressed = pressedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onPointerDown={() => press(key)}
                    className={[
                      "flex min-w-0 items-center justify-center rounded-[10px] py-3 text-[14px] font-semibold shadow-[0_2px_0_rgba(0,0,0,0.15)] transition-all select-none",
                      isSpecial ? "flex-[1.4] bg-zinc-300 text-zinc-600" : "flex-1 bg-white text-zinc-800",
                      isPressed ? "scale-95 brightness-90 shadow-none" : "",
                    ].join(" ")}
                    style={{ minWidth: isSpecial ? 44 : 28 }}
                  >
                    {key === "DEL" ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M21 6H8l-7 6 7 6h13V6z" strokeLinejoin="round" />
                        <path d="m12 10 4 4m0-4-4 4" strokeLinecap="round" />
                      </svg>
                    ) : key === "SHIFT" ? (
                      <svg
                        className={`h-4 w-4 ${caps ? "text-emerald-600" : "text-zinc-600"}`}
                        viewBox="0 0 24 24"
                        fill={caps ? "currentColor" : "none"}
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path d="M12 3 3 12h5v8h8v-8h5L12 3z" strokeLinejoin="round" />
                      </svg>
                    ) : mode === "alpha" && !caps ? (
                      key.toLowerCase()
                    ) : (
                      key
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          <div className="flex gap-1">
            <button
              type="button"
              onPointerDown={() => setMode((prev) => (prev === "alpha" ? "num" : "alpha"))}
              className="flex-[1.6] rounded-[10px] bg-zinc-300 py-3 text-[12px] font-bold text-zinc-700 shadow-[0_2px_0_rgba(0,0,0,0.12)] select-none active:scale-95"
            >
              {mode === "alpha" ? "123" : "ABC"}
            </button>

            <button
              type="button"
              onPointerDown={() => press("SPACE")}
              className={`flex flex-[5] items-center justify-center gap-1.5 rounded-[10px] bg-white py-3 shadow-[0_2px_0_rgba(0,0,0,0.12)] select-none ${pressedKey === "SPACE" ? "scale-95 brightness-90" : ""}`}
            >
              <span className="text-[11px] font-bold tracking-widest text-emerald-600">LYKA</span>
              <span className="text-[11px] text-zinc-400">espaço</span>
            </button>

            <button
              type="button"
              onPointerDown={onClose}
              className="flex-[1.6] rounded-[10px] bg-zinc-300 py-3 text-[11px] font-bold text-zinc-700 shadow-[0_2px_0_rgba(0,0,0,0.12)] select-none active:scale-95"
            >
              OK
            </button>
          </div>
        </div>

        <div className="h-2" />
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </>,
    document.body,
  );
}
