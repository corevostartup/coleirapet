import Link from "next/link";
import { LegalContent } from "@/components/legal/legal-content";
import { resolveLegalBackHref } from "@/lib/legal/back-href";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Privacidade · Lyka",
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const raw = sp?.from;
  const from = Array.isArray(raw) ? raw[0] : raw;
  const backHref = resolveLegalBackHref(typeof from === "string" ? from : null);

  return (
    <main className="ios-safe-top flex min-h-screen px-3 py-8 pb-14 sm:px-6">
      <div className="mx-auto w-full max-w-[520px]">
        <section className="glass-card rounded-[28px] px-5 py-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h1 className="text-[20px] font-semibold tracking-tight text-zinc-900">Politica de Privacidade</h1>
            <Link
              href={backHref}
              className="rounded-xl bg-zinc-100 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-200"
            >
              Voltar
            </Link>
          </div>
          <LegalContent type="privacy" />
        </section>
      </div>
    </main>
  );
}
