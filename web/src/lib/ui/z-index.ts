/** Camadas fixas da UI Lyka (maior = na frente). */
export const LYKA_Z_INDEX = {
  topBar: 1800,
  modal: 3000,
  modalElevated: 3050,
  /** Popover de calendario (acima de modais, abaixo do teclado Lyka). */
  calendarPopover: 3060,
  emailGate: 5000,
  petSwitcherMenu: 9999,
  splash: 10000,
  /** Sempre acima de modais e menus flutuantes; abaixo de overlays criticos (logout/exclusao). */
  keyboardBackdrop: 10100,
  keyboard: 10200,
  criticalOverlay: 12000,
} as const;
