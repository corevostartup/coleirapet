"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { IconBell } from "@/components/icons";
import { notifications as notificationItems } from "@/lib/mock";
import {
  ensureReadIdsInitialized,
  loadReadNotificationIds,
  subscribeNotificationReadState,
  unreadNotificationCount,
} from "@/lib/notifications-read";

function getUnreadCount(): number {
  ensureReadIdsInitialized(notificationItems);
  return unreadNotificationCount(notificationItems, loadReadNotificationIds());
}

export function TopBarNotificationsLink() {
  const unread = useSyncExternalStore(
    subscribeNotificationReadState,
    getUnreadCount,
    () => 0
  );

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
