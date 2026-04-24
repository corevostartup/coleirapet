"use client";

import { useState } from "react";

type Props = {
  publicSlug: string;
};

export function PublicNfcLocationShare({ publicSlug }: Props) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function shareCurrentLocation() {
    if (busy || done) return;
    setHint(null);

    if (!navigator.geolocation) {
      setHint("Seu navegador nao suporta geolocalizacao.");
      return;
    }
    if (!window.isSecureContext) {
      setHint("Para compartilhar localizacao, abra esta pagina em HTTPS.");
      return;
    }

    setBusy(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              reject(new Error("Permissao de localizacao negada. Ative a permissao e tente novamente."));
              return;
            }
            if (error.code === error.POSITION_UNAVAILABLE) {
              reject(new Error("Nao foi possivel obter sua localizacao atual."));
              return;
            }
            if (error.code === error.TIMEOUT) {
              reject(new Error("Tempo esgotado ao tentar obter localizacao."));
              return;
            }
            reject(new Error("Falha ao capturar localizacao."));
          },
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 15000,
          },
        );
      });

      const res = await fetch("/api/public/nfc-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicSlug,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyM: position.coords.accuracy,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(payload?.error ?? "Nao foi possivel registrar sua localizacao.");
      setDone(true);
      setHint("Localizacao compartilhada com sucesso. Obrigado por ajudar.");
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Falha ao compartilhar localizacao.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-[26px] border border-zinc-200 bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
      <h2 className="text-[14px] font-semibold text-zinc-900">Acesso NFC</h2>
      <p className="mt-1 text-[12px] text-zinc-600">
        Se voce encontrou este pet, compartilhe sua localizacao atual para ajudar o tutor a identificar o ultimo ponto do acesso.
      </p>
      <button
        type="button"
        disabled={busy || done}
        onClick={() => void shareCurrentLocation()}
        className="mt-3 w-full rounded-2xl bg-emerald-600 py-3 text-[13px] font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
      >
        {busy ? "Registrando localizacao..." : done ? "Localizacao registrada" : "Aceitar e compartilhar localizacao atual"}
      </button>
      {hint ? <p className={`mt-2 text-[12px] ${done ? "text-emerald-700" : "text-rose-600"}`}>{hint}</p> : null}
    </section>
  );
}
