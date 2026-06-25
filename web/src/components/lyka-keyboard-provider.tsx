"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { setNativeInputValue } from "@/lib/inputs/set-native-input-value";
import {
  inferKeyboardLayout,
  isCharAllowedForLayout,
  sanitizeKeyboardValue,
  type KeyboardLayout,
} from "@/lib/inputs/infer-keyboard-layout";
import { isLykaKeyboardMobileContext } from "@/lib/inputs/lyka-keyboard-mobile";
import { LYKA_Z_INDEX } from "@/lib/ui/z-index";

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

type KeyboardSession = {
  element: TextFieldElement;
  value: string;
  layout: KeyboardLayout;
  lockLayout: boolean;
  mask: boolean;
  placeholder?: string;
  multiline: boolean;
  onSearch?: () => void;
};

const SKIP_INPUT_TYPES = new Set([
  "checkbox",
  "radio",
  "file",
  "hidden",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "date",
  "time",
  "datetime-local",
  "month",
  "week",
]);

const ROWS_ALPHA = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["SHIFT", "Z", "X", "C", "V", "B", "N", "M", "DEL"],
];

const ROWS_SYMBOLS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "_", "@", ".", ",", ":", ";", "!", "?"],
  ["#", "$", "%", "&", "*", "(", ")", "/", "DEL"],
];

const ROWS_NUMERIC = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "DEL"],
];

const ROWS_DECIMAL = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [",", "0", ".", "DEL"],
];

function isLykaKeyboardField(element: EventTarget | null): element is TextFieldElement {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
  if (element.dataset.lykaNativeKeyboard === "true") return false;
  if (element.disabled) return false;
  if (element.readOnly && element.dataset.lykaKeyboardLocked !== "true") return false;
  if (element instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(element.type)) return false;
  return true;
}

function shouldOfferSearch(element: TextFieldElement) {
  if (!(element instanceof HTMLInputElement)) return false;
  return element.type === "search" || element.getAttribute("enterkeyhint") === "search";
}

function lockNativeKeyboard(element: TextFieldElement) {
  element.dataset.lykaKeyboardLocked = "true";
  element.dataset.lykaPrevReadonly = element.readOnly ? "1" : "0";
  element.dataset.lykaPrevInputMode = element.getAttribute("inputmode") ?? "";
  element.readOnly = true;
  element.setAttribute("inputmode", "none");
}

function unlockNativeKeyboard(element: TextFieldElement) {
  element.readOnly = element.dataset.lykaPrevReadonly === "1";
  delete element.dataset.lykaPrevReadonly;
  const prev = element.dataset.lykaPrevInputMode ?? "";
  if (prev) element.setAttribute("inputmode", prev);
  else element.removeAttribute("inputmode");
  delete element.dataset.lykaPrevInputMode;
  delete element.dataset.lykaKeyboardLocked;
}

function displayValue(value: string, maskValue: boolean, multiline: boolean) {
  if (!value) return "";
  if (maskValue) return "•".repeat(Math.min(value.length, 24));
  if (multiline && value.length > 80) return `${value.slice(0, 80)}…`;
  return value;
}

function rowsForLayout(activeLayout: KeyboardLayout) {
  if (activeLayout === "numeric") return ROWS_NUMERIC;
  if (activeLayout === "decimal") return ROWS_DECIMAL;
  if (activeLayout === "symbols") return ROWS_SYMBOLS;
  return ROWS_ALPHA;
}

/** Teclado visual — definido no mesmo arquivo do provider (evita Server→Client→Client no Webpack). */
function LykaKeyboardPanel({
  value,
  onChange,
  onSearch,
  onClose,
  placeholder,
  layout = "alpha",
  lockLayout = false,
  maskValue = false,
  multiline = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch?: () => void;
  onClose: () => void;
  placeholder?: string;
  layout?: KeyboardLayout;
  lockLayout?: boolean;
  maskValue?: boolean;
  multiline?: boolean;
}) {
  const [activeLayout, setActiveLayout] = useState<KeyboardLayout>(layout);
  const [caps, setCaps] = useState(false);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setActiveLayout(layout);
    setCaps(false);
  }, [layout]);

  function commitNext(nextRaw: string) {
    const next =
      activeLayout === "numeric" || activeLayout === "decimal"
        ? sanitizeKeyboardValue(nextRaw, activeLayout)
        : nextRaw;
    onChange(next);
  }

  function press(key: string) {
    if (!key) return;
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 100);

    if (key === "DEL") {
      commitNext(value.slice(0, -1));
      return;
    }
    if (key === "SHIFT") {
      setCaps((prev) => !prev);
      return;
    }
    if (key === "SPACE") {
      commitNext(`${value} `);
      return;
    }

    const char = activeLayout === "alpha" && !caps ? key.toLowerCase() : key;
    commitNext(`${value}${char}`);
  }

  const rows = rowsForLayout(activeLayout);
  const preview = displayValue(value, maskValue, multiline);
  const isNumericLayout = activeLayout === "numeric" || activeLayout === "decimal";
  const canToggleLayout = !lockLayout && !isNumericLayout;

  if (!mounted) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/20"
        style={{ zIndex: LYKA_Z_INDEX.keyboardBackdrop }}
        onClick={onClose}
      />

      <div
        className="fixed bottom-0 left-0 right-0 animate-slide-up rounded-t-[28px] bg-zinc-100 pb-safe px-2 pt-3 shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.18)]"
        style={{ zIndex: LYKA_Z_INDEX.keyboard, animation: "slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both" }}
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
            <div key={rowIdx} className={`flex justify-center gap-1 ${isNumericLayout ? "px-6 sm:px-10" : ""}`}>
              {row.map((key, keyIdx) => {
                if (!key) {
                  return <div key={`spacer-${keyIdx}`} className="flex-1" aria-hidden />;
                }
                const isSpecial = key === "DEL" || key === "SHIFT";
                const isPressed = pressedKey === key;
                const numericKeyClass = isNumericLayout ? "py-3.5 text-[18px]" : "py-3 text-[14px]";
                return (
                  <button
                    key={`${key}-${keyIdx}`}
                    type="button"
                    onPointerDown={() => press(key)}
                    className={[
                      "flex min-w-0 items-center justify-center rounded-[10px] font-semibold shadow-[0_2px_0_rgba(0,0,0,0.15)] transition-all select-none",
                      numericKeyClass,
                      isSpecial
                        ? isNumericLayout
                          ? "flex-[1.2] bg-zinc-300 text-zinc-600"
                          : "flex-[1.4] bg-zinc-300 text-zinc-600"
                        : "flex-1 bg-white text-zinc-800",
                      isPressed ? "scale-95 brightness-90 shadow-none" : "",
                    ].join(" ")}
                    style={{ minWidth: isSpecial ? 44 : isNumericLayout ? 36 : 28 }}
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
                    ) : activeLayout === "alpha" && !caps ? (
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
            {canToggleLayout ? (
              <button
                type="button"
                onPointerDown={() => setActiveLayout((prev) => (prev === "alpha" ? "symbols" : "alpha"))}
                className="flex-[1.6] rounded-[10px] bg-zinc-300 py-3 text-[12px] font-bold text-zinc-700 shadow-[0_2px_0_rgba(0,0,0,0.12)] select-none active:scale-95"
              >
                {activeLayout === "alpha" ? "123" : "ABC"}
              </button>
            ) : isNumericLayout ? (
              <div className="flex flex-[1.6] items-center justify-center rounded-[10px] bg-emerald-50 py-3 text-[11px] font-bold tracking-widest text-emerald-700">
                LYKA
              </div>
            ) : null}

            {!isNumericLayout ? (
              <button
                type="button"
                onPointerDown={() => press("SPACE")}
                className={`flex flex-[5] items-center justify-center gap-1.5 rounded-[10px] bg-white py-3 shadow-[0_2px_0_rgba(0,0,0,0.12)] select-none ${pressedKey === "SPACE" ? "scale-95 brightness-90" : ""}`}
              >
                <span className="text-[11px] font-bold tracking-widest text-emerald-600">LYKA</span>
                <span className="text-[11px] text-zinc-400">espaço</span>
              </button>
            ) : (
              <div className="flex-[5]" aria-hidden />
            )}

            <button
              type="button"
              onPointerDown={onClose}
              className={`${isNumericLayout ? "flex-[2.4]" : "flex-[1.6]"} rounded-[10px] bg-zinc-300 py-3 text-[11px] font-bold text-zinc-700 shadow-[0_2px_0_rgba(0,0,0,0.12)] select-none active:scale-95`}
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

export default function LykaKeyboardProvider() {
  const [session, setSession] = useState<KeyboardSession | null>(null);
  const sessionRef = useRef<KeyboardSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const closeSession = useCallback(() => {
    const current = sessionRef.current;
    if (current) unlockNativeKeyboard(current.element);
    setSession(null);
  }, []);

  const openSession = useCallback((element: TextFieldElement) => {
    const current = sessionRef.current;
    if (current?.element === element) return;
    if (current) unlockNativeKeyboard(current.element);

    lockNativeKeyboard(element);

    const inferred = inferKeyboardLayout(element);
    const initialValue =
      inferred.layout === "numeric" || inferred.layout === "decimal"
        ? sanitizeKeyboardValue(element.value, inferred.layout)
        : element.value;

    if (initialValue !== element.value) {
      setNativeInputValue(element, initialValue);
    }

    const nextSession: KeyboardSession = {
      element,
      value: initialValue,
      layout: inferred.layout,
      lockLayout: inferred.lockLayout,
      mask: element instanceof HTMLInputElement && element.type === "password",
      placeholder: element.placeholder || undefined,
      multiline: element instanceof HTMLTextAreaElement,
      onSearch: shouldOfferSearch(element)
        ? () => {
            element.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
            element.form?.requestSubmit();
          }
        : undefined,
    };

    sessionRef.current = nextSession;
    setSession(nextSession);

    window.setTimeout(() => {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 80);
  }, []);

  useEffect(() => {
    function onFocusIn(event: FocusEvent) {
      if (!isLykaKeyboardMobileContext()) return;
      if (!isLykaKeyboardField(event.target)) return;
      event.preventDefault();
      openSession(event.target);
    }

    document.addEventListener("focusin", onFocusIn, true);
    return () => document.removeEventListener("focusin", onFocusIn, true);
  }, [openSession]);

  useEffect(() => {
    function onViewportChange() {
      if (!isLykaKeyboardMobileContext() && sessionRef.current) {
        closeSession();
      }
    }

    const queries = [
      window.matchMedia("(hover: none) and (pointer: coarse)"),
      window.matchMedia("(max-width: 768px) and (pointer: coarse)"),
    ];
    for (const mq of queries) {
      mq.addEventListener("change", onViewportChange);
    }
    return () => {
      for (const mq of queries) {
        mq.removeEventListener("change", onViewportChange);
      }
    };
  }, [closeSession]);

  useEffect(() => {
    if (!session) return;

    function onKeyDown(event: KeyboardEvent) {
      const current = sessionRef.current;
      if (!current) return;
      if (event.target !== current.element && !(event.target instanceof Node && current.element.contains(event.target))) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeSession();
        current.element.blur();
        return;
      }

      if (event.key === "Enter" && !current.multiline && !event.shiftKey) {
        event.preventDefault();
        if (current.onSearch) current.onSearch();
        closeSession();
        current.element.blur();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        const next = current.value.slice(0, -1);
        setNativeInputValue(current.element, next);
        setSession({ ...current, value: next });
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (!isCharAllowedForLayout(event.key, current.layout)) return;
        event.preventDefault();
        const maxLength = current.element.maxLength;
        if (maxLength > 0 && current.value.length >= maxLength) return;
        const nextRaw = current.value + event.key;
        const next =
          current.layout === "numeric" || current.layout === "decimal"
            ? sanitizeKeyboardValue(nextRaw, current.layout)
            : nextRaw;
        setNativeInputValue(current.element, next);
        setSession({ ...current, value: next });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session, closeSession]);

  const handleChange = useCallback((value: string) => {
    const current = sessionRef.current;
    if (!current) return;
    const sanitized =
      current.layout === "numeric" || current.layout === "decimal"
        ? sanitizeKeyboardValue(value, current.layout)
        : value;
    const maxLength = current.element.maxLength;
    const next = maxLength > 0 ? sanitized.slice(0, maxLength) : sanitized;
    setNativeInputValue(current.element, next);
    setSession({ ...current, value: next });
  }, []);

  if (!session) return null;

  return (
    <LykaKeyboardPanel
      key={session.element.id || session.placeholder || "lyka-keyboard"}
      value={session.value}
      onChange={handleChange}
      onSearch={session.onSearch}
      onClose={closeSession}
      placeholder={session.placeholder}
      layout={session.layout}
      lockLayout={session.lockLayout}
      maskValue={session.mask}
      multiline={session.multiline}
    />
  );
}
