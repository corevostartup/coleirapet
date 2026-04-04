import Image from "next/image";
import { AppShell, TopBar } from "@/components/shell";
import { IconCamera, IconCollar, IconHeart, IconShield } from "@/components/icons";
import { devices, pet } from "@/lib/mock";

export default function ProfilePage() {
  return (
    <AppShell tab="profile">
      <TopBar title="Perfil do pet" subtitle="Dados gerais" />

      <section className="appear-up mt-3 overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="relative h-[220px]">
          <Image src={pet.image} alt="Foto da Luna" fill className="object-cover" sizes="(max-width: 768px) 100vw, 440px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <h2 className="text-[28px] font-semibold text-white">{pet.name}</h2>
            <p className="text-[12px] text-white/80">{pet.breed}</p>
          </div>
        </div>
      </section>

      <section className="appear-up mt-3 grid grid-cols-2 gap-2.5" style={{ animationDelay: "140ms" }}>
        <article className="elev-card rounded-2xl p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Idade</p>
          <p className="mt-2 text-[24px] font-semibold text-zinc-900">{pet.age} anos</p>
        </article>
        <article className="elev-card rounded-2xl p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Peso</p>
          <p className="mt-2 text-[24px] font-semibold text-zinc-900">{pet.weightKg} kg</p>
        </article>
        <article className="elev-card rounded-2xl p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Sexo</p>
          <p className="mt-2 text-[20px] font-semibold text-zinc-900">{pet.sex}</p>
        </article>
        <article className="elev-card rounded-2xl p-3.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Porte</p>
          <p className="mt-2 text-[20px] font-semibold text-zinc-900">{pet.size}</p>
        </article>
      </section>

      <section className="appear-up mt-3 overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "170ms" }}>
        <div className="flex items-center gap-3 p-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200">
            <Image
              src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=700&q=80"
              alt="Foto do tutor"
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Tutor</p>
            <p className="text-[15px] font-semibold text-zinc-900">Mariana Costa</p>
            <p className="text-[12px] text-zinc-500">Responsavel principal</p>
          </div>
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

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "260ms" }}>
        <h3 className="mb-3 text-[14px] font-semibold text-zinc-900">Acoes rapidas</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <button className="chip rounded-2xl px-2 py-3 text-center transition hover:bg-zinc-100">
            <IconHeart className="mx-auto h-5 w-5 text-zinc-700" />
            <span className="mt-1.5 block text-[11px] font-medium text-zinc-600">Saude</span>
          </button>
          <button className="chip rounded-2xl px-2 py-3 text-center transition hover:bg-zinc-100">
            <IconCollar className="mx-auto h-5 w-5 text-zinc-700" />
            <span className="mt-1.5 block text-[11px] font-medium text-zinc-600">Coleira</span>
          </button>
          <button className="chip rounded-2xl px-2 py-3 text-center transition hover:bg-zinc-100">
            <IconCamera className="mx-auto h-5 w-5 text-zinc-700" />
            <span className="mt-1.5 block text-[11px] font-medium text-zinc-600">Camera</span>
          </button>
        </div>
      </section>
    </AppShell>
  );
}