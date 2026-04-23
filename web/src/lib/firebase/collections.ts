/** Coleções raiz no Firestore (estrutura atual). */
export const COLLECTION_USER = "User";
export const COLLECTION_PETS = "Pets";
export const COLLECTION_VETERINARIANS = "Veterinarians";

/** Subcoleção em `Pets/{petId}`: mensagens de quem encontrou o pet (NFC / pet perdido). */
export const SUBCOLLECTION_FINDER_MESSAGES = "finderMessages";
