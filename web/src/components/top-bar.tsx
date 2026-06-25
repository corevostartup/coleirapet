"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PetAvatarImage } from "@/components/pet-avatar-image";
import { ProfilePetSwitcher } from "@/components/profile-pet-switcher";
import { TopBarNotificationsLink } from "@/components/top-bar-notifications-link";
import { DEFAULT_PET_IMAGE, getPetImageOrDefault } from "@/lib/pets/image";
import type { TopBarQuickPetItem, TopBarQuickPetSeed } from "@/lib/pets/top-bar-seed";

export type { TopBarQuickPetSeed };

const PET_DATA_UPDATED_EVENT = "lyka-pet-data-updated";

function normalizePetItem(item: TopBarQuickPetItem): TopBarQuickPetItem {
  return {
    id: item.id,
    name: item.name,
    breed: item.breed,
    image: getPetImageOrDefault(item.image),
    canDeletePet: item.canDeletePet,
  };
}

function TopBarUserQuickActions({
  seed,
  showNotificationsLink = true,
}: {
  seed?: TopBarQuickPetSeed;
  showNotificationsLink?: boolean;
}) {
  const pathname = usePathname();
  const [pets, setPets] = useState<TopBarQuickPetItem[]>(() => (seed?.pets ?? []).map(normalizePetItem));
  const [currentPetId, setCurrentPetId] = useState(() => seed?.currentPetId ?? "");
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(!seed?.pets?.length);

  const isHiddenContext =
    pathname?.startsWith("/lyka-admin-x7k9m2p4q8r1") ||
    pathname?.startsWith("/vet") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/criar-conta");

  useEffect(() => {
    if (seed?.pets?.length) {
      setPets(seed.pets.map(normalizePetItem));
      setCurrentPetId(seed.currentPetId);
      setLoading(false);
    }
  }, [seed]);

  useEffect(() => {
    if (isHiddenContext) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function loadQuickData() {
      try {
        const [petsRes, userRes] = await Promise.all([
          fetch("/api/pets/list", { cache: "no-store" }),
          fetch("/api/users/current", { cache: "no-store" }),
        ]);

        if (!cancelled && petsRes.ok) {
          const payload = (await petsRes.json()) as {
            currentPetId?: string;
            pets?: TopBarQuickPetItem[];
          };
          const list = Array.isArray(payload.pets) ? payload.pets.map(normalizePetItem) : [];
          setPets(list);
          setCurrentPetId(typeof payload.currentPetId === "string" ? payload.currentPetId : "");
        }

        if (!cancelled && userRes.ok) {
          const payload = (await userRes.json()) as { user?: { plan?: "free" | "pro" } };
          setUserPlan(payload.user?.plan === "pro" ? "pro" : "free");
        }
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQuickData();
    return () => {
      cancelled = true;
    };
  }, [isHiddenContext, pathname]);

  useEffect(() => {
    if (isHiddenContext) return;
    function onPetDataUpdated() {
      void (async () => {
        try {
          const petsRes = await fetch("/api/pets/list", { cache: "no-store" });
          if (!petsRes.ok) return;
          const payload = (await petsRes.json()) as {
            currentPetId?: string;
            pets?: TopBarQuickPetItem[];
          };
          const list = Array.isArray(payload.pets) ? payload.pets.map(normalizePetItem) : [];
          setPets(list);
          setCurrentPetId(typeof payload.currentPetId === "string" ? payload.currentPetId : "");
        } catch {
          /* noop */
        }
      })();
    }
    window.addEventListener(PET_DATA_UPDATED_EVENT, onPetDataUpdated);
    return () => window.removeEventListener(PET_DATA_UPDATED_EVENT, onPetDataUpdated);
  }, [isHiddenContext]);

  const currentPet = useMemo(() => {
    if (pets.length === 0) return null;
    return pets.find((item) => item.id === currentPetId) ?? pets[0];
  }, [currentPetId, pets]);

  if (isHiddenContext) return null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      {showNotificationsLink ? <TopBarNotificationsLink /> : null}
      {loading && !currentPet ? (
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-zinc-200" aria-hidden />
      ) : currentPet ? (
        <ProfilePetSwitcher currentPet={currentPet} initialPets={pets} userPlan={userPlan} />
      ) : (
        <Link
          href="/profile?newPet=1"
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm"
          aria-label="Adicionar pet"
        >
          <PetAvatarImage src={DEFAULT_PET_IMAGE} alt="Adicionar pet" className="h-full w-full object-cover" />
        </Link>
      )}
    </div>
  );
}

export default function TopBar({
  title,
  subtitle,
  children,
  action,
  leadingAction,
  showNotifications = true,
  showNotificationsLink = true,
  quickPetSeed,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
  action?: ReactNode | null;
  leadingAction?: ReactNode;
  showNotifications?: boolean;
  showNotificationsLink?: boolean;
  quickPetSeed?: TopBarQuickPetSeed;
}) {
  return (
    <header className="glass-card appear-up relative z-[1800] rounded-[28px] px-4 py-3 md:px-5 md:py-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {leadingAction ? <div className="shrink-0">{leadingAction}</div> : null}
          <div className="min-w-0">
            <p className="text-[11px] tracking-wide text-zinc-500">{subtitle}</p>
            <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight text-zinc-900">{title}</h1>
          </div>
        </div>
        {action !== undefined ? (
          action
        ) : showNotifications ? (
          <TopBarUserQuickActions seed={quickPetSeed} showNotificationsLink={showNotificationsLink} />
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}
