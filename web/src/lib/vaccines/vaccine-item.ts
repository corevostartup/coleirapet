export type VaccineStatus = "applied" | "pending";

export type VaccineItem = {
  id: string;
  name: string;
  status: VaccineStatus;
  stateLabel: "Aplicada" | "Pendente";
  date: string;
  dateLabel: string;
  veterinarian: string;
  clinic: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdAtLabel: string;
  updatedAtLabel: string;
};

export function toPtBrDate(isoDate: string) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "—";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function toPtBrDateTime(iso: string) {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type VaccineDoc = {
  name?: string;
  status?: VaccineStatus;
  date?: string;
  veterinarian?: string;
  clinic?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function vaccineFromDoc(id: string, data: VaccineDoc): VaccineItem {
  const status = data.status === "applied" ? "applied" : "pending";
  const date = typeof data.date === "string" ? data.date : "";
  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Vacina";
  const veterinarian = typeof data.veterinarian === "string" ? data.veterinarian.trim() : "";
  const clinic = typeof data.clinic === "string" ? data.clinic.trim() : "";
  const notes = typeof data.notes === "string" ? data.notes.trim() : "";
  const createdAt = typeof data.createdAt === "string" ? data.createdAt : "";
  const updatedAt = typeof data.updatedAt === "string" ? data.updatedAt : "";

  return {
    id,
    name,
    status,
    stateLabel: status === "applied" ? "Aplicada" : "Pendente",
    date,
    dateLabel: toPtBrDate(date),
    veterinarian,
    clinic,
    notes,
    createdAt,
    updatedAt,
    createdAtLabel: toPtBrDateTime(createdAt),
    updatedAtLabel: toPtBrDateTime(updatedAt),
  };
}
