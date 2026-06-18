import { cookies } from "next/headers";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import { getOrCreateCurrentPet } from "@/lib/pets/current";
import { loadTopBarQuickPetSeed } from "@/lib/pets/load-top-bar-quick-pet-seed";
import { LocationView } from "./location-view";

export default async function LocationPage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  let currentPet = null;
  if (uid) {
    try {
      currentPet = (await getOrCreateCurrentPet(uid)).pet;
    } catch {
      currentPet = null;
    }
  }

  const quickPetSeed = uid ? await loadTopBarQuickPetSeed(uid) : undefined;

  return <LocationView quickPetSeed={quickPetSeed} />;
}
