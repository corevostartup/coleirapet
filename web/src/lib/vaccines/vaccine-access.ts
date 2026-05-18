export type VaccineCreatedBy = "owner" | "vet";

export type VaccineOwnershipFields = {
  createdBy?: string;
  createdByUid?: string;
  prescribedByName?: string;
  prescribedByCrmv?: string;
};

/** Quem cadastrou o registro (legado: inferido por campos do veterinario). */
export function resolveVaccineCreatedBy(data: VaccineOwnershipFields): VaccineCreatedBy {
  if (data.createdBy === "vet" || data.createdBy === "owner") return data.createdBy;
  const prescribedName = typeof data.prescribedByName === "string" ? data.prescribedByName.trim() : "";
  const prescribedCrmv = typeof data.prescribedByCrmv === "string" ? data.prescribedByCrmv.trim() : "";
  if (prescribedName || (prescribedCrmv && prescribedCrmv !== "Nao informado")) return "vet";
  return "owner";
}

export function canOwnerEditVaccineStatus(data: VaccineOwnershipFields): boolean {
  return resolveVaccineCreatedBy(data) === "owner";
}

export function canVetEditVaccineStatus(data: VaccineOwnershipFields, vetUid: string): boolean {
  if (resolveVaccineCreatedBy(data) !== "vet") return false;
  const ownerUid = typeof data.createdByUid === "string" ? data.createdByUid.trim() : "";
  if (!ownerUid) return false;
  return ownerUid === vetUid;
}
