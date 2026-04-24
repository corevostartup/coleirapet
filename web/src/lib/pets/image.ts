export const DEFAULT_PET_IMAGE = "/img/pet-default.png";

export function getPetImageOrDefault(image: string | null | undefined) {
  const normalized = typeof image === "string" ? image.trim() : "";
  return normalized || DEFAULT_PET_IMAGE;
}
