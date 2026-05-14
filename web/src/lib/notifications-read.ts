const STORAGE_KEY = "lyka_notifications_read_v1";

export const LYKA_NOTIFICATION_READ_CHANGED_EVENT = "lyka-notifications-read-changed";

export type NotificationReadSeedItem = { id: string; unread: boolean };

function parseStoredIds(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** Primeira execução: persiste como lidos os itens que o feed já marca como lidos (evita badge falso no primeiro uso). */
export function ensureReadIdsInitialized(items: NotificationReadSeedItem[]) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY) !== null) return;
  const seeded = items.filter((n) => !n.unread).map((n) => n.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
}

export function loadReadNotificationIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  return new Set(parseStoredIds(localStorage.getItem(STORAGE_KEY)));
}

export function saveReadNotificationIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

/** Marca ids como lidos e notifica o sino (mesmo separador de abas). */
export function markNotificationIdsRead(itemIds: string[]) {
  if (typeof window === "undefined" || itemIds.length === 0) return;
  const next = loadReadNotificationIds();
  for (const id of itemIds) next.add(id);
  saveReadNotificationIds(next);
  window.dispatchEvent(new CustomEvent(LYKA_NOTIFICATION_READ_CHANGED_EVENT));
}

export function unreadNotificationCount(items: { id: string }[], readIds: Set<string>): number {
  return items.filter((n) => !readIds.has(n.id)).length;
}

export function subscribeNotificationReadState(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  const onCustom = () => onChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(LYKA_NOTIFICATION_READ_CHANGED_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LYKA_NOTIFICATION_READ_CHANGED_EVENT, onCustom);
  };
}
