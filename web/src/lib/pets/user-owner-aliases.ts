import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

function parseText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** IDs que podem estar gravados em `Pets.ownerId` para o mesmo tutor. */
export async function resolveUserOwnerIdAliases(authUid: string): Promise<string[]> {
  const normalizedUid = parseText(authUid);
  if (!normalizedUid) return [];

  const aliases = new Set<string>([normalizedUid]);
  const db = getFirebaseAdminDb();
  const userSnap = await db.collection(COLLECTION_USER).doc(normalizedUid).get();

  if (userSnap.exists) {
    aliases.add(userSnap.id);
    const data = userSnap.data() ?? {};
    for (const value of [data.userId, data.UserID, data.uid]) {
      const alias = parseText(value);
      if (alias) aliases.add(alias);
    }
  }

  await Promise.all(
    Array.from(aliases).map(async (alias) => {
      const [byUserId, byLegacyId, byUid] = await Promise.all([
        db.collection(COLLECTION_USER).where("userId", "==", alias).limit(8).get(),
        db.collection(COLLECTION_USER).where("UserID", "==", alias).limit(8).get(),
        db.collection(COLLECTION_USER).where("uid", "==", alias).limit(8).get(),
      ]);
      for (const snap of [byUserId, byLegacyId, byUid]) {
        for (const doc of snap.docs) {
          aliases.add(doc.id);
          const data = doc.data() ?? {};
          for (const value of [data.userId, data.UserID, data.uid]) {
            const nested = parseText(value);
            if (nested) aliases.add(nested);
          }
        }
      }
    }),
  );

  return Array.from(aliases);
}

/** Todos os documentos em `User` que representam o mesmo tutor (notificacoes legadas). */
export async function resolveUserDocumentIds(authUid: string): Promise<string[]> {
  return resolveUserOwnerIdAliases(authUid);
}
