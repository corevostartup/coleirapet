"use client";

import Image from "next/image";
import Link from "next/link";
import { toBlob } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import { VaccineDetailsModal } from "@/components/vaccine-details-modal";
import { IconPill, IconShare } from "@/components/icons";
import { getPetImageOrDefault } from "@/lib/pets/image";
import { petMetricsQuery } from "@/lib/pets/use-selected-pet";
import type { VaccineItem } from "@/lib/vaccines/vaccine-item";

type Props = {
  currentPetId: string;
  initialPets: Array<{ id: string; name: string; breed: string; image: string }>;
  petName: string;
  petBreed: string;
  petImage: string;
  petIdentity: string;
  petAge: number | null;
  petWeightKg: number | null;
  tutorName: string;
  userPlan: "free" | "pro";
};

export function VaccinationWalletContent({
  currentPetId,
  initialPets,
  petName,
  petBreed,
  petImage,
  petIdentity,
  petAge,
  petWeightKg,
  tutorName,
  userPlan,
}: Props) {
  const walletRef = useRef<HTMLElement | null>(null);
  const [vaccines, setVaccines] = useState<VaccineItem[]>([]);
  const [detailVaccine, setDetailVaccine] = useState<VaccineItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState(currentPetId || initialPets[0]?.id || "");

  useEffect(() => {
    setSelectedPetId(currentPetId || initialPets[0]?.id || "");
  }, [currentPetId, initialPets]);

  useEffect(() => {
    if (!selectedPetId) {
      setVaccines([]);
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/vaccines${petMetricsQuery(selectedPetId)}`, { method: "GET", cache: "no-store" });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "Falha ao carregar vacinas.");
        }
        const data = (await res.json()) as { vaccines?: VaccineItem[] };
        if (!active) return;
        setVaccines(data.vaccines ?? []);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Falha ao carregar vacinas.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedPetId]);

  useEffect(() => {
    function onRefresh() {
      if (!selectedPetId) return;
      void (async () => {
        try {
          const res = await fetch(`/api/vaccines${petMetricsQuery(selectedPetId)}`, { method: "GET", cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as { vaccines?: VaccineItem[] };
          setVaccines(data.vaccines ?? []);
        } catch {
          // ignora falha silenciosa no refresh
        }
      })();
    }
    window.addEventListener("lyka-pet-data-updated", onRefresh);
    return () => window.removeEventListener("lyka-pet-data-updated", onRefresh);
  }, [selectedPetId]);

  const applied = vaccines
    .filter((v) => v.status === "applied")
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const pending = vaccines
    .filter((v) => v.status === "pending")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  const ageLabel = petAge === null ? "Idade nao informada" : `${petAge} ${petAge === 1 ? "ano" : "anos"}`;
  const weightLabel =
    petWeightKg === null ? "Peso nao informado" : `${petWeightKg.toFixed(1).replace(/\.0$/, "")} kg`;

  async function shareWalletImage() {
    if (!walletRef.current || shareBusy) return;
    setShareBusy(true);
    setShareHint(null);
    try {
      const blob = await toBlob(walletRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      if (!blob) throw new Error("Nao foi possivel gerar a imagem da carteira.");

      const file = new File([blob], `carteira-vacinacao-${petName.replace(/\s+/g, "-").toLowerCase() || "pet"}.png`, {
        type: "image/png",
      });

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        const canShareFiles = typeof navigator.canShare === "function" ? navigator.canShare({ files: [file] }) : true;
        if (canShareFiles) {
          await navigator.share({
            title: `Carteira de vacinacao - ${petName}`,
            text: "Carteira de vacinacao completa",
            files: [file],
          });
          return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carteira-vacinacao-${petName.replace(/\s+/g, "-").toLowerCase() || "pet"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShareHint("Imagem gerada. Download iniciado.");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setShareHint("Nao foi possivel compartilhar a carteira.");
    } finally {
      setShareBusy(false);
    }
  }

  return (
    <div className="appear-up mt-3" style={{ animationDelay: "80ms" }}>
      <article ref={walletRef} className="relative overflow-hidden rounded-[28px] border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 via-white to-zinc-50/80 shadow-[0_22px_48px_-30px_rgba(12,18,15,0.55)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500" aria-hidden />

        <div className="p-4 pt-3.5">
          <div className="mb-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void shareWalletImage()}
              disabled={shareBusy}
              aria-label={shareBusy ? "Gerando imagem para compartilhar" : "Compartilhar carteira de vacinacao"}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconShare className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {shareHint ? <p className="mb-2 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[11px] text-zinc-600">{shareHint}</p> : null}

          {!loading && !error && pending.length > 0 ? (
            <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-amber-950">Possui vacinas pendentes</p>
                <p className="mt-0.5 text-[11px] leading-snug text-amber-900/90">
                  {pending.length === 1
                    ? "1 vacina aguardando aplicacao ou confirmacao."
                    : `${pending.length} vacinas aguardando aplicacao ou confirmacao.`}
                  {pending.length <= 3 ? (
                    <span className="mt-1 block truncate text-[10px] text-amber-800/80">
                      {pending.map((v) => v.name).join(" · ")}
                    </span>
                  ) : null}
                </p>
              </div>
              <Link
                href="/dados"
                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-[11px] font-semibold text-amber-950 transition hover:bg-amber-100/80"
              >
                Ver vacinas
              </Link>
            </div>
          ) : null}

          <div className="flex items-start gap-3">
            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border border-emerald-200/80 bg-zinc-100 shadow-sm ring-2 ring-white">
              <Image src={petImage} alt={`Foto de ${petName}`} fill className="object-cover" sizes="72px" unoptimized />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700/90">Carteira de vacinacao</p>
              <h2 className="mt-0.5 truncate text-[18px] font-bold leading-tight text-zinc-900">{petName}</h2>
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-zinc-600">{petBreed || "Raca nao informada"}</p>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">Idade</dt>
              <dd className="mt-0.5 text-[12px] font-medium text-zinc-800">{ageLabel}</dd>
            </div>
            <div>
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">Peso</dt>
              <dd className="mt-0.5 text-[12px] font-medium text-zinc-800">{weightLabel}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[9px] font-semibold uppercase tracking-wide text-zinc-400">ID do pet</dt>
              <dd className="mt-0.5 font-mono text-[12px] font-semibold tracking-wide text-zinc-800">{petIdentity}</dd>
            </div>
          </dl>

          <div className="mt-3 rounded-2xl border border-emerald-100/90 bg-emerald-50/50 px-3 py-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-800/80">Tutor(a) principal</p>
            <p className="mt-0.5 text-[14px] font-semibold text-emerald-950">{tutorName}</p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <IconPill className="h-4 w-4 text-emerald-600" aria-hidden />
                <h3 className="text-[13px] font-semibold text-zinc-900">Vacinas aplicadas</h3>
              </div>
              {!loading && !error ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">{applied.length}</span>
              ) : null}
            </div>

            {loading ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 px-3 py-4 text-center text-[12px] text-zinc-500">
                Carregando vacinas...
              </p>
            ) : error ? (
              <p className="rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-3 text-[12px] text-rose-700">{error}</p>
            ) : applied.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] leading-relaxed text-zinc-500">
                Nenhuma vacina com status <strong className="text-zinc-700">Aplicada</strong> ainda. Cadastre em Registros Médicos e marque como
                aplicada para aparecer aqui.
              </p>
            ) : (
              <ul className="space-y-2">
                {applied.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setDetailVaccine(v)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white px-3 py-2.5 text-left shadow-[0_8px_20px_-18px_rgba(15,23,42,0.12)] transition hover:border-emerald-200 hover:bg-emerald-50/30 active:scale-[0.99]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                          aria-hidden
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-zinc-900">{v.name}</p>
                          {v.veterinarian.trim() ? (
                            <p className="truncate text-[10px] text-zinc-500">Prof.: {v.veterinarian}</p>
                          ) : null}
                        </div>
                      </div>
                      <p className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-500">{v.dateLabel}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 text-center text-[10px] leading-snug text-zinc-400">
            Documento informativo para organizacao do tutor — confirme sempre com seu veterinario.
          </p>
        </div>
      </article>

      <VaccineDetailsModal
        vaccine={detailVaccine}
        petId={selectedPetId}
        open={detailVaccine !== null}
        onClose={() => setDetailVaccine(null)}
        onUpdated={(v) => {
          setVaccines((current) => current.map((item) => (item.id === v.id ? v : item)));
          setDetailVaccine(v);
        }}
      />

      {userPlan === "free" ? (
        <article className="mt-3 overflow-hidden rounded-[24px] border border-emerald-200 shadow-[0_16px_28px_-22px_rgba(16,94,62,0.28)]">
          <div className="relative min-h-[210px]">
            <Image
              src="/img/premium-space-dog.png"
              alt="Mascote Premium Lyka"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/15" />
            <div className="relative flex min-h-[210px] flex-col justify-end gap-2 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-100">Conta Free</p>
              <h3 className="max-w-[240px] text-[17px] font-semibold leading-tight text-white">Assine o plano Premium</h3>
              <p className="max-w-[280px] text-[12px] leading-relaxed text-emerald-50/90">
                Mais pets, histórico completo e recursos exclusivos para cuidar melhor do seu pet.
              </p>
              <button
                type="button"
                className="mt-1 w-full rounded-2xl border border-white/30 bg-white/90 px-3 py-2.5 text-[13px] font-semibold text-emerald-900 backdrop-blur-sm transition hover:bg-white"
              >
                Assinar Premium
              </button>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
