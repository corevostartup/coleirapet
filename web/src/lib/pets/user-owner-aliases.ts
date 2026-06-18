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

  return Array.from(aliases);
}
