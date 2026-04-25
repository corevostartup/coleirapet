/** Origem conhecida para o botao "Voltar" em termos/privacidade (?from=...). */
const LEGAL_BACK_FROM = {
  settings: "/profile/settings",
} as const;

export function resolveLegalBackHref(from: string | null | undefined, fallbackHref = "/login") {
  if (from === "settings") return LEGAL_BACK_FROM.settings;
  return fallbackHref;
}
