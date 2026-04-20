import Image from "next/image";
import { AppShell, TopBar } from "@/components/shell";
import { IconCollar, IconPin, IconShield } from "@/components/icons";
import { devices, location } from "@/lib/mock";

export default function LocationPage() {
  return (
    <AppShell tab="location">
      <TopBar title="Localizacao" subtitle="Rastreamento inteligente" />

      <section className="appear-up mt-3 overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="relative h-[190px] p-4">
          <Image
            src="/img/mapa.png"
            alt="Mapa da localizacao"
            fill
            className="object-cover saturate-75 brightness-110 contrast-95"
            sizes="(max-width: 768px) 100vw, 440px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent" />
          <div className="relative rounded-2xl border border-zinc-200 bg-white/85 p-3 backdrop-blur">
            <div className="flex items-start gap-2">
              <IconPin className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-[13px] font-semibold text-zinc-900">{location.address}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">{location.lastUpdate}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "140ms" }}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Status da coleira</h3>
          <IconCollar className="h-5 w-5 text-zinc-600" />
        </div>
        <div className="space-y-2 text-[12px] text-zinc-700">
          <p>Distancia atual: {location.distance}</p>
          <p>Bateria: {location.battery}%</p>
          <p>Zona segura principal: {location.safeZone}</p>
        </div>
      </section>

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "200ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Dispositivos conectados</h3>
          <IconShield className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="space-y-2">
          {devices.map((device) => (
            <article key={device.name} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-zinc-800">{device.name}</p>
                <p className="text-[11px] text-zinc-500">{device.battery}</p>
              </div>
              <p className="mt-0.5 text-[11px] text-emerald-600">{device.status}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}