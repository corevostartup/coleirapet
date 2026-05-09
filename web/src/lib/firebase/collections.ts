/** Coleções raiz no Firestore (estrutura atual). */
export const COLLECTION_USER = "User";
export const COLLECTION_PETS = "Pets";
export const COLLECTION_VETERINARIANS = "Veterinarians";

/** Produtos exibidos no carrossel da Home (painel admin). */
export const COLLECTION_CAROUSEL_PRODUCTS = "carouselProducts";

/** Subcoleção em `Pets/{petId}`: mensagens de quem encontrou o pet (NFC / pet perdido). */
export const SUBCOLLECTION_FINDER_MESSAGES = "finderMessages";

/** Subcoleção em `Pets/{petId}`: histórico de localizações compartilhadas por leitura NFC. */
export const SUBCOLLECTION_NFC_ACCESS_LOGS = "nfcAccessLogs";

/** Subcoleção em `Pets/{petId}`: minutos ativos cadastrados por dia. */
export const SUBCOLLECTION_ACTIVITY_MINUTES = "activityMinutes";

/** Subcoleção em `Pets/{petId}`: registros de peso por data (doc id = YYYY-MM-DD). */
export const SUBCOLLECTION_WEIGHT_ENTRIES = "weightEntries";

/** Subcoleção em `Pets/{petId}`: lembretes de medicação. */
export const SUBCOLLECTION_MEDICATION_REMINDERS = "medicationReminders";

/** Subcoleção em `Pets/{petId}`: vacinas (nome canônico atual). */
export const SUBCOLLECTION_VACCINES = "vacinas";

/** Nome legado em inglês mantido para migração retrocompatível. */
export const SUBCOLLECTION_VACCINES_LEGACY = "vaccines";

/** Subcoleção em `Veterinarians/{uid}`: registros de prontuário por pet. */
export const SUBCOLLECTION_VET_MEDICAL_RECORDS = "medicalRecords";
