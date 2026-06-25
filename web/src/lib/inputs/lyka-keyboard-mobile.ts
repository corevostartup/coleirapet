/** Teclado Lyka customizado so em contexto mobile/touch (nao em desktop com mouse). */
export function isLykaKeyboardMobileContext() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return true;
  return window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches;
}
