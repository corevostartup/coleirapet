import type { PetMapPoiCategory } from "@/lib/map/pet-map-pois";

/** Verde de farmacia no Locus — clinicas veterinarias. */
export const VET_CLINIC_POI_COLOR = "#00a86b";

/** Icone 16x16: patinha (clinica veterinaria). */
export const VET_CLINIC_POI_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="8" cy="10.6" rx="2.75" ry="2.15" fill="currentColor"/><circle cx="4.75" cy="7.15" r="1.35" fill="currentColor"/><circle cx="6.85" cy="5.35" r="1.2" fill="currentColor"/><circle cx="9.15" cy="5.35" r="1.2" fill="currentColor"/><circle cx="11.25" cy="7.15" r="1.35" fill="currentColor"/></svg>`;

/** Hotel para cachorros — edificio. */
const DOG_HOTEL_POI_COLOR = "#246bff";
const DOG_HOTEL_POI_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 14V6.5l5-3.5 5 3.5V14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 14v-3.5h4V14" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.5 8h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

/** Creche para cachorros — sol + patinha pequena. */
const DOG_DAYCARE_POI_COLOR = "#ff6b35";
const DOG_DAYCARE_POI_SVG = `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="8" cy="5.5" r="2.2" stroke="currentColor" stroke-width="1.4"/><path d="M8 2.2V1.2M8 9.8v1M4.4 5.5H3.4M12.6 5.5H11.6M5.4 3.1l-.7-.7M10.6 3.1l.7-.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><ellipse cx="8" cy="12.2" rx="2.1" ry="1.6" fill="currentColor"/><circle cx="6.2" cy="10.4" r=".85" fill="currentColor"/><circle cx="9.8" cy="10.4" r=".85" fill="currentColor"/></svg>`;

const PIN_CONFIG: Record<PetMapPoiCategory, { color: string; svg: string; className: string }> = {
  veterinary: { color: VET_CLINIC_POI_COLOR, svg: VET_CLINIC_POI_SVG, className: "veterinary" },
  dog_hotel: { color: DOG_HOTEL_POI_COLOR, svg: DOG_HOTEL_POI_SVG, className: "dog-hotel" },
  dog_daycare: { color: DOG_DAYCARE_POI_COLOR, svg: DOG_DAYCARE_POI_SVG, className: "dog-daycare" },
};

export function buildPetMapPinHtml(category: PetMapPoiCategory) {
  const cfg = PIN_CONFIG[category];
  return `<div class="lyka-poi-pin-balloon" aria-hidden="true"><div class="lyka-poi-pin lyka-poi-pin--${cfg.className}" style="--poi-color:${cfg.color}">${cfg.svg}</div></div>`;
}

/** @deprecated Use buildPetMapPinHtml('veterinary') */
export function buildVetClinicPinHtml() {
  return buildPetMapPinHtml("veterinary");
}

export function buildPetMapPopupHtml(poi: { title: string; address: string; category: PetMapPoiCategory }) {
  const categoryLabel =
    poi.category === "veterinary"
      ? "Clinica veterinaria"
      : poi.category === "dog_hotel"
        ? "Hotel para cachorros"
        : "Creche para cachorros";
  const title = escapeHtml(poi.title);
  const address = poi.address.trim() ? `<div class="lyka-poi-popup-address">${escapeHtml(poi.address)}</div>` : "";
  const kind = `<div class="lyka-poi-popup-kind">${escapeHtml(categoryLabel)}</div>`;
  return `<div class="lyka-poi-popup">${kind}<div class="lyka-poi-popup-title">${title}</div>${address}</div>`;
}

/** @deprecated Use buildPetMapPopupHtml */
export function buildVetClinicPopupHtml(clinic: { title: string; address: string }) {
  return buildPetMapPopupHtml({ ...clinic, category: "veterinary" });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
