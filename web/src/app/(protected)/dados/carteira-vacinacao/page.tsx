import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell";
import TopBar from "@/components/top-bar";
import { IconChevronLeft } from "@/components/icons";
import { VaccinationWalletContent } from "./vaccination-wallet-content";
import { AUTH_USER_NAME_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserNameCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { pet } from "@/lib/mock";
import { getOrCreateCurrentPet, listOwnedPets } from "@/lib/pets/current";
import { getPetImageOrDefault } from "@/lib/pets/image";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

export const dynamic = "force-dynamic";

export default async function CarteiraVacinacaoPage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  const tutorFallback = parseAuthUserNameCookie(jar.get(AUTH_USER_NAME_COOKIE)?.value) ?? "Tutor(a)";

  let currentPet = null;
  let currentPetId = "";
  let initialPets: Array<{ id: string; name: string; breed: string; image: string }> = [];
  let tutorName = tutorFallback;
  let userPlan: "free" | "pro" = "free";

  if (uid) {
    try {
      const owned = await listOwnedPets(uid);
      currentPetId = owned.currentPetId;
      initialPets = owned.pets.map((item) => ({
        id: item.id,
        name: item.name,
        breed: item.breed,
        image: item.image,
      }));
      currentPet = owned.pets.find((item) => item.id === owned.currentPetId) ?? owned.pets[0] ?? null;
    } catch {
      try {
        currentPet = (await getOrCreateCurrentPet(uid)).pet;
        currentPetId = currentPet.id;
        initialPets = [{ id: currentPet.id, name: currentPet.name, breed: currentPet.breed, image: currentPet.image }];
      } catch {
        currentPet = null;
      }
    }
    try {
      const user = await getOrCreateCurrentUserProfile(uid, { fallbackName: tutorFallback });
      tutorName = user.name?.trim() ? user.name : tutorFallback;
      userPlan = user.plan === "pro" ? "pro" : "free";
    } catch {
      tutorName = tutorFallback;
      userPlan = "free";
    }
  }

  const petName = (currentPet?.name ?? pet.name).trim() || "Pet";
  const petBreed = (currentPet?.breed ?? pet.breed).trim();
  const petImage = getPetImageOrDefault(currentPet?.image ?? pet.image);
  const petIdentity = currentPet?.petIdentity?.trim() && currentPet.petIdentity !== "Nao disponivel" ? currentPet.petIdentity : "—";
  const petAge = currentPet ? currentPet.age : (pet.age ?? null);
  const petWeightKg = currentPet?.weightKg ?? pet.weightKg ?? null;

  return (
    <AppShell tab="dados">
      <TopBar
        title="Carteira de vacinacao"
        subtitle="Registros Médicos"
        showNotificationsLink={false}
        leadingAction={
          <Link
            href="/dados"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
            aria-label="Voltar para Registros Médicos"
          >
            <IconChevronLeft className="h-5 w-5" />
          </Link>
        }
      />

      <VaccinationWalletContent
        currentPetId={currentPetId}
        initialPets={initialPets}
        petName={petName}
        petBreed={petBreed}
        petImage={petImage}
        petIdentity={petIdentity}
        petAge={petAge}
        petWeightKg={petWeightKg}
        tutorName={tutorName}
        userPlan={userPlan}
      />
    </AppShell>
  );
}
