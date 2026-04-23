export const pet = {
  name: "Luna",
  breed: "Golden Retriever",
  age: 3,
  weightKg: 28.4,
  size: "Grande",
  sex: "Femea",
  birthday: "14/02/2023",
  wellbeing: 96,
  image: "https://images.unsplash.com/photo-1612774412771-005ed8e861d2?auto=format&fm=jpg&fit=crop&w=1400&q=80",
};

export const metrics = [
  { label: "Frequencia cardiaca", value: "78", unit: "bpm", status: "Normal", tone: "text-emerald-600" },
  { label: "Temperatura", value: "38.5", unit: "C", status: "Ideal", tone: "text-blue-600" },
  { label: "Atividade", value: "72", unit: "%", status: "Boa", tone: "text-zinc-700" },
  { label: "Sono", value: "8.2", unit: "h", status: "Estavel", tone: "text-zinc-700" },
];

export const weeklyActivity = [
  { day: "Seg", activeMinutes: 24, steps: 3200 },
  { day: "Ter", activeMinutes: 71, steps: 9460 },
  { day: "Qua", activeMinutes: 38, steps: 5410 },
  { day: "Qui", activeMinutes: 86, steps: 11820 },
  { day: "Sex", activeMinutes: 49, steps: 6720 },
  { day: "Sab", activeMinutes: 32, steps: 4590 },
  { day: "Dom", activeMinutes: 93, steps: 12680 },
];

export const quickActions = ["Coleira", "Saude", "Historico"];

export const events = [
  { label: "Antipulga", when: "Em 11 dias", kind: "warning" },
  { label: "Vacina V10", when: "Em 47 dias", kind: "info" },
  { label: "Consulta de rotina", when: "Em 62 dias", kind: "info" },
];

/** Alertas do app (mock); futuro: push / Firestore por usuario. */
export const notifications = [
  {
    id: "nfc-bound",
    title: "Tag NFC pareada",
    body: "A coleira foi vinculada ao perfil da Luna. Dados publicos disponiveis ao escanear a tag.",
    when: "Ha 24 min",
    kind: "success" as const,
    unread: true,
  },
  {
    id: "safe-zone",
    title: "Zona segura",
    body: "Luna entrou na zona configurada em casa. Localizacao atualizada.",
    when: "Ha 1 h",
    kind: "info" as const,
    unread: true,
  },
  {
    id: "vitals",
    title: "Frequencia cardiaca",
    body: "Media nas ultimas 6 h dentro do esperado para o porte da Luna.",
    when: "Ha 3 h",
    kind: "info" as const,
    unread: false,
  },
  {
    id: "vaccine-reminder",
    title: "Lembrete de vacina",
    body: "Antirrabica com aplicacao prevista em 22/08/2026.",
    when: "Ontem",
    kind: "warning" as const,
    unread: false,
  },
  {
    id: "activity",
    title: "Meta de atividade",
    body: "Ontem a Luna passou da meta diaria de minutos ativos. Otimo!",
    when: "Ontem",
    kind: "success" as const,
    unread: false,
  },
];

export const heartTrend = [
  { time: "00h", bpm: 64 },
  { time: "02h", bpm: 60 },
  { time: "04h", bpm: 58 },
  { time: "06h", bpm: 66 },
  { time: "08h", bpm: 79 },
  { time: "10h", bpm: 94 },
  { time: "12h", bpm: 112 },
  { time: "14h", bpm: 101 },
  { time: "16h", bpm: 84 },
  { time: "18h", bpm: 96 },
  { time: "20h", bpm: 88 },
  { time: "22h", bpm: 72 },
];

export const location = {
  address: "Av. Paulista, 1000 - Sao Paulo",
  safeZone: "Casa",
  distance: "0.6 km",
  lastUpdate: "Atualizado ha 2 min",
  battery: 87,
  /** Centro do mapa Leaflet (Av. Paulista ~1000). */
  lat: -23.56155,
  lng: -46.65605,
};

export const devices = [
  { name: "Tag NFC", status: "Conectado", battery: "87%" },
  { name: "Sensor de atividade", status: "Conectado", battery: "71%" },
  { name: "Esteira MalhaCao", status: "Conectado", battery: "AC" },
  { name: "AirTag (Apple)", status: "Conectado", battery: "94%" },
];

/** Apenas Tag NFC + AirTag na aba Localizacao (AirTag desconectado). */
export const locationPageDevices: Array<{ name: string; status: string; battery?: string }> = [
  { name: "Tag NFC", status: "Conectado", battery: "87%" },
  { name: "AirTag", status: "Desconectado" },
];

export const vaccines = [
  { name: "V10", date: "10/03/2026", state: "Aplicada" },
  { name: "Antirrabica", date: "22/08/2026", state: "Pendente" },
  { name: "Giardia", date: "12/11/2026", state: "Pendente" },
];

export const records = [
  { type: "Alergia", detail: "Leite e derivados" },
  { type: "Medicacao", detail: "Suplemento articular 1x dia" },
  { type: "Veterinario", detail: "Dr. Carlos Nunes - CRMV 12345" },
];

export const publicData = [
  { type: "Nome", detail: "Luna" },
  { type: "Contato de emergencia", detail: "(11) 98888-1234" },
  { type: "Alergias", detail: "Leite e derivados" },
  { type: "Tag NFC", detail: "Ativa e vinculada ao perfil" },
];