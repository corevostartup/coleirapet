import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ProfilePetDetailsEditor } from "@/components/profile-pet-details-editor";
import { ProfilePetSwitcher } from "@/components/profile-pet-switcher";
import { ProfileUserDetailsEditor } from "@/components/profile-user-details-editor";
import { SignOutButton } from "@/components/sign-out-button";
import { AppShell, TopBar } from "@/components/shell";
import { IconCamera, IconCollar, IconHeart, IconShield } from "@/components/icons";
import { AUTH_USER_NAME_COOKIE, AUTH_USER_PHOTO_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthUserNameCookie, parseAuthUserPhotoCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { getOrCreateCurrentPet, listOwnedPets } from "@/lib/pets/current";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import { getCurrentVeterinarianProfile } from "@/lib/veterinarians/current";
import { devices, pet } from "@/lib/mock";

const NFC_PAIRED_COOKIE = "cp_nfc_paired";

const SIMULATED_PETS = [
  {
    id: "demo-max",
    name: "Max",
    breed: "Border Collie",
    image: "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=900&q=80",
    simulated: true,
  },
  {
    id: "demo-nina",
    name: "Nina",
    breed: "Shih Tzu",
    image: "https://images.unsplash.com/photo-1544568100-847a948585b9?auto=format&fit=crop&w=900&q=80",
    simulated: true,
  },
  {
    id: "demo-thor",
    name: "Thor",
    breed: "Labrador",
    image: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?auto=format&fit=crop&w=900&q=80",
    simulated: true,
  },
] as const;

export default async function ProfilePage() {
  const jar = await cookies();
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  const isNfcPaired = jar.get(NFC_PAIRED_COOKIE)?.value === "1";
  const tutorName = parseAuthUserNameCookie(jar.get(AUTH_USER_NAME_COOKIE)?.value) ?? "Tutor(a)";
  const tutorPhoto =
    parseAuthUserPhotoCookie(jar.get(AUTH_USER_PHOTO_COOKIE)?.value) ??
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=700&q=80";
  let currentPet = null;
  let petList = null;
  let currentUser = null;
  let currentVeterinarian = null;

  if (uid) {
    try {
      currentPet = (await getOrCreateCurrentPet(uid)).pet;
    } catch {
      currentPet = null;
    }
    try {
      petList = await listOwnedPets(uid);
    } catch {
      petList = null;
    }
    try {
      currentUser = await getOrCreateCurrentUserProfile(uid, { fallbackName: tutorName });
    } catch {
      currentUser = null;
    }
    try {
      currentVeterinarian = await getCurrentVeterinarianProfile(uid);
    } catch {
      currentVeterinarian = null;
    }
  }
  const petData = currentPet
    ? {
        name: currentPet.name,
        breed: currentPet.breed,
        image: currentPet.image,
        age: currentPet.age,
        weightKg: currentPet.weightKg,
        sex: currentPet.sex,
        size: currentPet.size,
        emergencyContact: currentPet.emergencyContact,
        color: currentPet.color,
        microchipId: currentPet.microchipId,
        notes: currentPet.notes,
        publicFields: currentPet.publicFields ?? {
          name: true,
          breed: false,
          color: false,
          emergencyContact: true,
          microchipId: false,
          notes: false,
        },
      }
    : {
        name: pet.name,
        breed: pet.breed,
        image: pet.image,
        age: pet.age,
        weightKg: pet.weightKg,
        sex: pet.sex,
        size: pet.size,
        emergencyContact: "(11) 98888-1234",
        color: "Dourado",
        microchipId: null,
        notes: null,
        publicFields: {
          name: true,
          breed: false,
          color: false,
          emergencyContact: true,
          microchipId: false,
          notes: false,
        },
      };
  const profileDevices = devices.map((device) => ({
    ...device,
    status: device.name === "Tag NFC" && isNfcPaired ? "Conectado" : "Desconectado",
  }));

  return (
    <AppShell tab="profile">
      <TopBar
        title="Perfil do pet"
        subtitle="Perfil"
        action={
          currentPet && petList ? (
            <ProfilePetSwitcher
              currentPet={{
                id: currentPet.id,
                name: currentPet.name,
                breed: currentPet.breed,
                image: currentPet.image,
              }}
              initialPets={petList.pets.map((item) => ({
                id: item.id,
                name: item.name,
                breed: item.breed,
                image: item.image,
              })).concat(
                SIMULATED_PETS.filter((simulated) => !petList.pets.some((item) => item.id === simulated.id)),
              )}
            />
          ) : undefined
        }
      />

      <ProfilePetDetailsEditor
        petName={petData.name}
        petBreed={petData.breed}
        petImage={petData.image}
        initialAge={petData.age}
        initialWeightKg={petData.weightKg}
        initialSex={petData.sex}
        initialSize={petData.size}
        initialEmergencyContact={petData.emergencyContact}
        initialBreed={petData.breed}
        initialColor={petData.color}
        initialMicrochipId={petData.microchipId}
        initialNotes={petData.notes}
        initialPublicFields={petData.publicFields}
      />

      <section className="appear-up mt-3 overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "170ms" }}>
        <div className="flex items-center gap-3 p-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-zinc-200">
            <Image
              src={tutorPhoto}
              alt="Foto do tutor"
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Tutor</p>
            <p className="text-[15px] font-semibold text-zinc-900">{tutorName}</p>
            <p className="text-[12px] text-zinc-500">Responsavel principal</p>
          </div>
        </div>
      </section>

      <ProfileUserDetailsEditor
        initialName={currentUser?.name ?? tutorName}
        initialEmail={currentUser?.email ?? ""}
        initialPhone={currentUser?.phone ?? ""}
        initialBirthDate={currentUser?.birthDate ?? ""}
        initialUserType={currentUser?.userType ?? "Tutor"}
        initialVeterinarian={currentVeterinarian}
      />

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "200ms" }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-zinc-900">Dispositivos conectados</h3>
          <IconShield className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="space-y-2">
          {profileDevices.map((device) => {
            const connected = device.status === "Conectado";
            return (
              <article
                key={device.name}
                className={`rounded-2xl border px-3 py-2.5 ${
                  connected ? "border-zinc-200 bg-zinc-50" : "border-zinc-200/90 bg-zinc-50/80 opacity-95"
                }`}
              >
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium text-zinc-800">{device.name}</p>
                <p className="text-[11px] text-zinc-500">{device.battery}</p>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className={`text-[11px] ${connected ? "text-emerald-600" : "text-zinc-500"}`}>{device.status}</p>
                {device.name === "Tag NFC" ? (
                  <Link
                    href="/tag-nfc"
                    className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Gerenciar
                  </Link>
                ) : null}
              </div>
              </article>
            );
          })}
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

      <section className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "320ms" }}>
        <h3 className="mb-3 text-[14px] font-semibold text-zinc-900">Conta</h3>
        <SignOutButton />
      </section>
    </AppShell>
  );
}