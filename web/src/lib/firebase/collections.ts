/** Coleções raiz no Firestore (estrutura atual). */
export const COLLECTION_USER = "User";
export const COLLECTION_PETS = "Pets";
export const COLLECTION_VETERINARIANS = "Veterinarians";

/** Subcoleção em `Pets/{petId}`: mensagens de quem encontrou o pet (NFC / pet perdido). */
export const SUBCOLLECTION_FINDER_MESSAGES = "finderMessages";

/** Subcoleção em `Pets/{petId}`: histórico de localizações compartilhadas por leitura NFC. */
export const SUBCOLLECTION_NFC_ACCESS_LOGS = "nfcAccessLogs";

/** Subcoleção em `Pets/{petId}`: vacinas (nome canônico atual). */
export const SUBCOLLECTION_VACCINES = "vacinas";

/** Nome legado em inglês mantido para migração retrocompatível. */
export const SUBCOLLECTION_VACCINES_LEGACY = "vaccines";
