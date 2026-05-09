"use client";

import Link from "next/link";
import { IconCamera, IconCollar, IconHeart } from "@/components/icons";
import { PET_PROFILE_PHOTO_INPUT_ID } from "@/lib/pets/profile-photo-input-id";

export function ProfileQuickActions() {
  function openPetPhotoPicker() {
    const input = document.getElementById(PET_PROFILE_PHOTO_INPUT_ID) as HTMLInputElement | null;
    input?.click();
  }

  return (
    <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "260ms" }}>
      <h3 className="mb-3 text-[14px] font-semibold text-zinc-900">Acoes rapidas</h3>
      <div className="grid grid-cols-3 gap-2.5">
        <Link href="/health" className="chip rounded-2xl px-2 py-3 text-center transition hover:bg-zinc-100">
          <IconHeart className="mx-auto h-5 w-5 text-zinc-700" />
          <span className="mt-1.5 block text-[11px] font-medium text-zinc-600">Saude</span>
        </Link>
        <Link href="/home" className="chip rounded-2xl px-2 py-3 text-center transition hover:bg-zinc-100">
          <IconCollar className="mx-auto h-5 w-5 text-zinc-700" />
          <span className="mt-1.5 block text-[11px] font-medium text-zinc-600">Lyka</span>
        </Link>
        <button
          type="button"
          onClick={openPetPhotoPicker}
          className="chip rounded-2xl px-2 py-3 text-center transition hover:bg-zinc-100"
          aria-label="Tirar ou escolher foto do pet"
        >
          <IconCamera className="mx-auto h-5 w-5 text-zinc-700" />
          <span className="mt-1.5 block text-[11px] font-medium text-zinc-600">Camera</span>
        </button>
      </div>
    </section>
  );
}
