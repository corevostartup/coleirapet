"use client";

import { useState } from "react";

type Props = {
  publicSlug: string;
};

type DeviceContext = {
  os: "ios" | "android" | "desktop";
  browser: "safari" | "chrome" | "firefox" | "edge" | "other";
};

type GeoPermissionState = "granted" | "denied" | "prompt" | "unknown";

function detectDeviceContext(): DeviceContext {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  const browser: DeviceContext["browser"] = ua.includes("edg/")
    ? "edge"
    : ua.includes("firefox/")
      ? "firefox"
      : ua.includes("chrome/") || ua.includes("crios/")
        ? "chrome"
        : ua.includes("safari/")
          ? "safari"
          : "other";

  return {
    os: isIOS ? "ios" : isAndroid ? "android" : "desktop",
    browser,
  };
}

async function getGeoPermissionState(): Promise<GeoPermissionState> {
  try {
    if (!("permissions" in navigator) || typeof navigator.permissions.query !== "function") return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (status.state === "granted" || status.state === "denied" || status.state === "prompt") return status.state;
    return "unknown";
  } catch {
    return "unknown";
  }
}

function permissionHelpText(ctx: DeviceContext) {
  if (ctx.os === "ios") {
    return "No iPhone/iPad, toque no icone Aa na barra do Safari, abra Configuracoes do Site e permita Localizacao. Depois toque em Tentar novamente.";
  }
  if (ctx.os === "android") {
    return "No Android, toque no cadeado ao lado da URL, abra Permissoes e permita Localizacao para este site. Depois toque em Tentar novamente.";
  }
  if (ctx.browser === "chrome" || ctx.browser === "edge") {
    return "No navegador, clique no cadeado da URL, permita Localizacao para este site e recarregue a pagina se necessario.";
  }
  if (ctx.browser === "firefox") {
    return "No Firefox, clique no cadeado da URL, ajuste a permissao de Localizacao e tente novamente.";
  }
  return "Permita localizacao nas configuracoes do navegador para este site e tente novamente.";
}

export function PublicNfcLocationShare({ publicSlug }: Props) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [permissionHelp, setPermissionHelp] = useState<string | null>(null);
  const [permissionStateLabel, setPermissionStateLabel] = useState<string | null>(null);

  async function shareCurrentLocation() {
    if (busy || done) return;
    setHint(null);
    setPermissionHelp(null);
    setPermissionStateLabel(null);

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
              const ctx = detectDeviceContext();
              setPermissionHelp(
                ctx.os === "ios"
                  ? `${permissionHelpText(ctx)} Se continuar negando sem perguntar, abra Ajustes > Privacidade e Seguranca > Servicos de Localizacao > Safari Websites e escolha "Perguntar".`
                  : permissionHelpText(ctx),
              );
              reject(new Error("Permissao de localizacao negada pelo navegador/dispositivo."));
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

      // No Safari iOS, chamar geolocation imediatamente no clique ajuda a preservar
      // o gesto do usuário para abrir o prompt nativo. Consultamos estado depois.
      const permissionState = await getGeoPermissionState();
      if (permissionState !== "unknown") {
        setPermissionStateLabel(`Estado da permissao: ${permissionState}.`);
      }

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
      {permissionStateLabel ? <p className="mt-2 text-[11px] text-zinc-500">{permissionStateLabel}</p> : null}
      {permissionHelp ? (
        <>
          <p className="mt-2 text-[12px] text-zinc-600">{permissionHelp}</p>
          <button
            type="button"
            disabled={busy || done}
            onClick={() => void shareCurrentLocation()}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white py-2.5 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Tentar novamente
          </button>
        </>
      ) : null}
    </section>
  );
}
