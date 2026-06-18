"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LykaKeyboard } from "@/components/lyka-keyboard";
import { setNativeInputValue } from "@/lib/inputs/set-native-input-value";

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

type KeyboardSession = {
  element: TextFieldElement;
  value: string;
  mode: "alpha" | "num";
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

function isLykaKeyboardField(element: EventTarget | null): element is TextFieldElement {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
  if (element.dataset.lykaNativeKeyboard === "true") return false;
  if (element.disabled) return false;
  if (element.readOnly && element.dataset.lykaKeyboardLocked !== "true") return false;
  if (element instanceof HTMLInputElement && SKIP_INPUT_TYPES.has(element.type)) return false;
  return true;
}

function inferKeyboardMode(element: TextFieldElement): "alpha" | "num" {
  if (!(element instanceof HTMLInputElement)) return "alpha";
  if (element.type === "number" || element.type === "tel") return "num";
  const inputMode = element.getAttribute("inputmode");
  if (inputMode === "numeric" || inputMode === "decimal" || inputMode === "tel") return "num";
  return "alpha";
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

export function LykaKeyboardProvider() {
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

    const nextSession: KeyboardSession = {
      element,
      value: element.value,
      mode: inferKeyboardMode(element),
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
      if (!isLykaKeyboardField(event.target)) return;
      event.preventDefault();
      openSession(event.target);
    }

    document.addEventListener("focusin", onFocusIn, true);
    return () => document.removeEventListener("focusin", onFocusIn, true);
  }, [openSession]);

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
        event.preventDefault();
        const maxLength = current.element.maxLength;
        if (maxLength > 0 && current.value.length >= maxLength) return;
        const next = current.value + event.key;
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
    const maxLength = current.element.maxLength;
    const next = maxLength > 0 ? value.slice(0, maxLength) : value;
    setNativeInputValue(current.element, next);
    setSession({ ...current, value: next });
  }, []);

  if (!session) return null;

  return (
    <LykaKeyboard
      key={session.element.id || session.placeholder || "lyka-keyboard"}
      value={session.value}
      onChange={handleChange}
      onSearch={session.onSearch}
      onClose={closeSession}
      placeholder={session.placeholder}
      initialMode={session.mode}
      maskValue={session.mask}
      multiline={session.multiline}
    />
  );
}
