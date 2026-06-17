"use client";

import Image from "next/image";
import Link from "next/link";
import { Children, useEffect, useMemo, useState, type ReactNode, isValidElement } from "react";
import { usePathname } from "next/navigation";
import { ProfilePetSwitcher } from "@/components/profile-pet-switcher";
import { TopBarNotificationsLink } from "@/components/top-bar-notifications-link";
import { IconBell, IconFile, IconHeart, IconHome, IconPin, IconUser } from "@/components/icons";
import { DEFAULT_PET_IMAGE } from "@/lib/pets/image";

const navItems = [
  { key: "home", label: "Home", href: "/home", Icon: IconHome },
  { key: "health", label: "Saude", href: "/health", Icon: IconHeart },
  { key: "location", label: "Local", href: "/location", Icon: IconPin },
  { key: "dados", label: "Dados", href: "/dados", Icon: IconFile },
  { key: "profile", label: "Perfil", href: "/profile", Icon: IconUser },
  { key: "notifications", label: "Notificacoes", href: "/notifications", Icon: IconBell },
] as const;

function isNavItemActive(pathname: string, key: (typeof navItems)[number]["key"]) {
  const p = pathname || "/";
  if (key === "profile") {
    return p.startsWith("/profile") || p.startsWith("/tag-nfc");
  }
  if (key === "notifications") {
    return p.startsWith("/notifications");
  }
  if (key === "home") {
    return p === "/home" || p === "/" || p.startsWith("/home/");
  }
  const href = navItems.find((i) => i.key === key)?.href;
  if (!href) return false;
  return p === href || p.startsWith(`${href}/`);
}

/** Blocos com `data-lyka-shell-span="full"` atravessam as duas colunas (fluxo multi-coluna). */
function shellSlotSpansFull(node: ReactNode) {
  if (!isValidElement(node)) return false;
  const props = node.props as { "data-lyka-shell-span"?: string } | null | undefined;
  return props?.["data-lyka-shell-span"] === "full";
}

export function UserAppShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const mainSlots = Children.toArray(children);
  const [headSlot, ...bodySlots] = mainSlots;

  return (
    <main className="ios-safe-top min-h-dvh px-3 py-4 pb-28 sm:px-6 md:py-6 md:pb-6 lg:px-8">
      <div className="mx-auto w-full max-w-[440px] md:max-w-[1320px]">
        <div className="md:grid md:grid-cols-12 md:items-start md:gap-x-4 lg:gap-x-6">
          <aside className="hidden md:col-span-3 md:block lg:col-span-3 xl:col-span-2">
            <nav
              className="sticky top-4 rounded-[24px] border border-zinc-200 bg-white p-3 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.45)]"
              aria-label="Menu principal"
            >
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Lyka</p>
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const active = isNavItemActive(pathname, item.key);
                  return (
                    <li key={item.key}>
                      <Link
                        prefetch
                        href={item.href}
                        className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-medium transition ${
                          active ? "bg-emerald-50 text-emerald-800" : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-800"
                        }`}
                      >
                        <item.Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div className="mx-auto w-full max-w-[440px] md:col-span-9 md:mx-0 md:max-w-none md:min-w-0 lg:col-span-9 xl:col-span-10">
            <div className="flex flex-col gap-3 md:gap-4">
              {headSlot != null ? (
                <div className="lyka-shell-slot w-full min-w-0 [&>*]:!mt-0">{headSlot}</div>
              ) : null}

              {bodySlots.length > 0 ? (
                <div className="columns-1 [column-fill:balance] md:columns-2 md:gap-x-6 lg:gap-x-8">
                  {bodySlots.map((node, index) => {
                    const full = shellSlotSpansFull(node);
                    return (
                      <div
                        key={`lyka-main-body-${index}`}
                        className={`lyka-shell-tile mb-3 w-full min-w-0 break-inside-avoid md:mb-4 [&>*]:!mt-0 ${
                          full ? "md:column-span-all" : ""
                        }`}
                      >
                        {node}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

type TopBarPetItem = {
  id: string;
  name: string;
  breed: string;
  image: string;
  canDeletePet?: boolean;
};

function TopBarUserQuickActions() {
  const pathname = usePathname();
  const [pets, setPets] = useState<TopBarPetItem[]>([]);
  const [currentPetId, setCurrentPetId] = useState("");
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);

  const isHiddenContext =
    pathname?.startsWith("/lyka-admin-x7k9m2p4q8r1") ||
    pathname?.startsWith("/vet") ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/criar-conta");

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
            pets?: TopBarPetItem[];
          };
          const list = Array.isArray(payload.pets)
            ? payload.pets.map((item) => ({
                id: item.id,
                name: item.name,
                breed: item.breed,
                image: item.image,
                canDeletePet: item.canDeletePet,
              }))
            : [];
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
  }, [isHiddenContext]);

  const currentPet = useMemo(() => {
    if (pets.length === 0) return null;
    return pets.find((item) => item.id === currentPetId) ?? pets[0];
  }, [currentPetId, pets]);

  if (isHiddenContext) return null;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <TopBarNotificationsLink />
      {loading ? (
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-zinc-200" aria-hidden />
      ) : currentPet ? (
        <ProfilePetSwitcher currentPet={currentPet} initialPets={pets} userPlan={userPlan} />
      ) : (
        <Link
          href="/profile?newPet=1"
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm"
          aria-label="Adicionar pet"
        >
          <Image src={DEFAULT_PET_IMAGE} alt="Adicionar pet" fill className="object-cover" sizes="44px" />
        </Link>
      )}
    </div>
  );
}

export function TopBarClient({
  title,
  subtitle,
  children,
  action,
  leadingAction,
  showNotifications = true,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
  action?: ReactNode | null;
  leadingAction?: ReactNode;
  showNotifications?: boolean;
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
        {action !== undefined ? action : showNotifications ? <TopBarUserQuickActions /> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
}
