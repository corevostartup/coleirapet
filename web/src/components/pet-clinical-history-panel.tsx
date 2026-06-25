"use client";

import { useCallback, useEffect, useState } from "react";
import { IconFile } from "@/components/icons";
import { petMetricsQuery, useSelectedPet } from "@/lib/pets/use-selected-pet";

const PET_DATA_UPDATED_EVENT = "lyka-pet-data-updated";
const CURRENT_PET_CHANGED_EVENT = "lyka-current-pet-changed";

type HistoryItem = {
  id: string;
  kind: "clinical" | "vaccine" | "medication";
  kindLabel: string;
  title: string;
  detail: string;
  prescribedByName: string;
  prescribedByCrmv: string;
  veterinarianLabel: string;
  when: string;
};

export function PetClinicalHistoryPanel({
  animationDelay = "180ms",
  initialPetId,
  initialPetName,
}: {
  animationDelay?: string;
  initialPetId?: string;
  initialPetName?: string;
}) {
  const { petId, petName } = useSelectedPet({ petId: initialPetId, petName: initialPetName });
  const displayPetName = petName || initialPetName || "pet";
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const loadHistory = useCallback(async (activePetId: string, active: { current: boolean }) => {
    if (!activePetId) {
      if (active.current) {
        setHistory([]);
        setLoading(false);
      }
      return;
    }

    if (active.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const res = await fetch(`/api/pets/clinical-history${petMetricsQuery(activePetId)}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await res.json()) as { error?: string; history?: HistoryItem[] };
      if (!res.ok) throw new Error(payload.error ?? "Falha ao carregar historico do pet.");
      if (active.current) setHistory(payload.history ?? []);
    } catch (err) {
      if (active.current) {
        setHistory([]);
        setError(err instanceof Error ? err.message : "Falha ao carregar historico do pet.");
      }
    } finally {
      if (active.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!petId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const active = { current: true };
    void loadHistory(petId, active);
    return () => {
      active.current = false;
    };
  }, [petId, reloadToken, loadHistory]);

  useEffect(() => {
    function onRefresh() {
      setReloadToken((value) => value + 1);
    }
    window.addEventListener(PET_DATA_UPDATED_EVENT, onRefresh);
    window.addEventListener(CURRENT_PET_CHANGED_EVENT, onRefresh);
    return () => {
      window.removeEventListener(PET_DATA_UPDATED_EVENT, onRefresh);
      window.removeEventListener(CURRENT_PET_CHANGED_EVENT, onRefresh);
    };
  }, []);

  return (
    <section
      className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
      style={{ animationDelay }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-zinc-900">Historico do pet</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
            Timeline de prontuario, vacinas e medicacoes de {displayPetName}.
          </p>
        </div>
        <IconFile className="h-5 w-5 shrink-0 text-zinc-600" aria-hidden />
      </div>

      {loading ? <p className="text-[12px] text-zinc-500">Carregando historico...</p> : null}
      {error ? <p className="text-[12px] text-rose-700">{error}</p> : null}

      {!loading && !error ? (
        <div className="space-y-2">
          {history.map((item) => (
            <article key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{item.kindLabel}</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-zinc-800">{item.title}</p>
                </div>
                <p className="shrink-0 text-[10px] text-zinc-500">{item.when}</p>
              </div>
              {item.detail ? <p className="mt-1 text-[11px] leading-snug text-zinc-700">{item.detail}</p> : null}
              <p className="mt-1 text-[10px] text-zinc-500">
                {item.kind === "clinical" ? "Registrado por" : "Prescrito por"}{" "}
                {item.veterinarianLabel || `${item.prescribedByName} · CRMV ${item.prescribedByCrmv}`}
              </p>
            </article>
          ))}
          {history.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-[12px] text-zinc-500">
              Nenhum registro clinico para este pet ainda.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
