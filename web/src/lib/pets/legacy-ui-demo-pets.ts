/**
 * Nomes fixos dos pets de demonstração que o app listava no trocar de pet.
 * Devem ser ocultos em listagens e no switcher; não depender de id/raça/foto.
 */
const LEGACY_UI_DEMO_NAMES = new Set(["max", "nina", "thor"]);

export function isLegacyUiDemoPetName(name: string) {
  return LEGACY_UI_DEMO_NAMES.has(name.trim().toLowerCase());
}

export function filterLegacyUiDemoPetsFromSwitcherList<T extends { name: string }>(items: T[]): T[] {
  return items.filter((p) => !isLegacyUiDemoPetName(p.name));
}
