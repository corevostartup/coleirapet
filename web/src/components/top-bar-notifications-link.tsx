"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell } from "@/components/icons";

export function TopBarNotificationsLink() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadUnread() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        const payload = (await res.json().catch(() => null)) as { unreadCount?: number } | null;
        if (!cancelled && res.ok) {
          setUnread(typeof payload?.unreadCount === "number" ? payload.unreadCount : 0);
        }
      } catch {
        if (!cancelled) setUnread(0);
      }
    }

    void loadUnread();
    const id = window.setInterval(() => {
      void loadUnread();
    }, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <Link
      prefetch
      href="/notifications"
      className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition hover:text-zinc-900"
      aria-label={unread > 0 ? `Notificacoes, ${unread} nao lidas` : "Notificacoes"}
    >
      <IconBell className="h-5 w-5" />
      {unread > 0 ? (
        <span
          className="pulse-soft absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}
