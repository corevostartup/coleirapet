import { cookies } from "next/headers";
import Link from "next/link";
import { AppShell } from "@/components/shell";
import TopBar from "@/components/top-bar";
import { HealthWeightPanel } from "@/components/health-weight-panel";
import { IconChevronLeft } from "@/components/icons";
import { AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserUidCookie } from "@/lib/auth/session";
import { listOwnedPets } from "@/lib/pets/current";

export const dynamic = "force-dynamic";

export default async function HomePesoPage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  let currentPetId = "";
  let currentPetName = "";
  if (uid) {
    try {
      const owned = await listOwnedPets(uid, { readOnly: true });
      currentPetId = owned.currentPetId || owned.pets[0]?.id || "";
      const selected = owned.pets.find((item) => item.id === currentPetId) ?? owned.pets[0] ?? null;
      if (selected?.name?.trim()) currentPetName = selected.name.trim();
    } catch {
      currentPetId = "";
    }
  }

  const back = (
    <Link
      href="/home"
      prefetch
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200/90 bg-white text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.97]"
      aria-label="Voltar"
    >
      <IconChevronLeft className="h-5 w-5" aria-hidden />
    </Link>
  );

  return (
    <AppShell tab="home">
      <TopBar title="Peso" subtitle="Registros e evolucao" leadingAction={back} />
      <HealthWeightPanel initialPetId={currentPetId} initialPetName={currentPetName} />
    </AppShell>
  );
}
