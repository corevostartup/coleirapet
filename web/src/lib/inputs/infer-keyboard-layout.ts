export type KeyboardLayout = "alpha" | "symbols" | "numeric" | "decimal";

export type InferredKeyboard = {
  layout: KeyboardLayout;
  lockLayout: boolean;
};

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

function stepAllowsDecimal(step: string | null) {
  if (!step) return false;
  if (step === "any") return true;
  if (step.includes(".")) return true;
  const parsed = Number.parseFloat(step);
  return Number.isFinite(parsed) && parsed > 0 && parsed < 1;
}

function patternIsDigitsOnly(pattern: string | null) {
  if (!pattern) return false;
  const normalized = pattern.trim();
  return (
    normalized === "[0-9]*" ||
    normalized === "\\d*" ||
    normalized === "^[0-9]*$" ||
    normalized === "^\\d+$" ||
    normalized === "[0-9]+"
  );
}

function readInputMode(element: HTMLInputElement) {
  return (element.getAttribute("inputmode") || element.inputMode || "").trim().toLowerCase();
}

function readForcedLayout(element: TextFieldElement): KeyboardLayout | null {
  const forced = element.dataset.lykaKeyboardLayout?.trim().toLowerCase();
  if (forced === "alpha" || forced === "symbols" || forced === "numeric" || forced === "decimal") {
    return forced;
  }
  return null;
}

/** Define qual layout Lyka abrir conforme tipo/inputmode/pattern do campo. */
export function inferKeyboardLayout(element: TextFieldElement): InferredKeyboard {
  const forced = readForcedLayout(element);
  if (forced) return { layout: forced, lockLayout: true };

  if (element instanceof HTMLTextAreaElement) {
    return { layout: "alpha", lockLayout: false };
  }

  const inputMode = readInputMode(element);
  const pattern = element.getAttribute("pattern");

  if (element.type === "number") {
    return stepAllowsDecimal(element.getAttribute("step"))
      ? { layout: "decimal", lockLayout: true }
      : { layout: "numeric", lockLayout: true };
  }

  if (element.type === "tel" || inputMode === "numeric") {
    return { layout: "numeric", lockLayout: true };
  }

  if (inputMode === "decimal") {
    return { layout: "decimal", lockLayout: true };
  }

  if (patternIsDigitsOnly(pattern)) {
    return { layout: "numeric", lockLayout: true };
  }

  return { layout: "alpha", lockLayout: false };
}

export function sanitizeKeyboardValue(value: string, layout: KeyboardLayout) {
  if (layout === "numeric") {
    return value.replace(/[^\d]/g, "");
  }
  if (layout === "decimal") {
    let out = "";
    let separatorUsed = false;
    for (const char of value) {
      if (char >= "0" && char <= "9") {
        out += char;
        continue;
      }
      if ((char === "," || char === ".") && !separatorUsed) {
        out += char;
        separatorUsed = true;
      }
    }
    return out;
  }
  return value;
}

export function isCharAllowedForLayout(char: string, layout: KeyboardLayout) {
  if (layout === "numeric") return char >= "0" && char <= "9";
  if (layout === "decimal") return (char >= "0" && char <= "9") || char === "," || char === ".";
  return true;
}
