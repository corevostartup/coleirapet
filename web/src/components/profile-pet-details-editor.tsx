"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IconShare } from "@/components/icons";
import { getPetImageOrDefault } from "@/lib/pets/image";
import { PET_PROFILE_PHOTO_INPUT_ID } from "@/lib/pets/profile-photo-input-id";

type Props = {
  petName: string;
  petIdentity: string;
  petBreed: string;
  petImage: string;
  /** URL absoluta da pagina publica do pet; ausente em modo demo / sem conta. */
  sharePublicUrl?: string | null;
  initialAge: number | null;
  initialWeightKg: number | null;
  initialSex: string | null;
  initialSize: string | null;
  initialEmergencyContact: string | null;
  initialBreed: string | null;
  initialColor: string | null;
  initialMicrochipId: string | null;
  initialNotes: string | null;
  initialPublicFields?: {
    name: boolean;
    breed: boolean;
    color: boolean;
    emergencyContact: boolean;
    microchipId: boolean;
    notes: boolean;
  };
};

type SaveState = "idle" | "saving" | "success" | "error";
type PhotoState = "idle" | "uploading" | "error";

const DEFAULT_PUBLIC_FIELDS = {
  name: true,
  breed: false,
  color: false,
  emergencyContact: true,
  microchipId: false,
  notes: false,
} as const;

function formatWeight(value: number | null) {
  if (value === null) return "Nao informado";
  return `${value.toFixed(1)} kg`;
}

export function ProfilePetDetailsEditor({
  petName,
  petIdentity,
  petBreed,
  petImage,
  initialAge,
  initialWeightKg,
  initialSex,
  initialSize,
  initialEmergencyContact,
  initialBreed,
  initialColor,
  initialMicrochipId,
  initialNotes,
  initialPublicFields,
  sharePublicUrl = null,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(petName ?? "");
  const [photoUrl, setPhotoUrl] = useState(getPetImageOrDefault(petImage));
  const [photoState, setPhotoState] = useState<PhotoState>("idle");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(initialAge);
  const [weightKg, setWeightKg] = useState<number | null>(initialWeightKg);
  const [sex, setSex] = useState(initialSex ?? "");
  const [size, setSize] = useState(initialSize ?? "");
  const [emergencyContact, setEmergencyContact] = useState(initialEmergencyContact ?? "");
  const [breed, setBreed] = useState(initialBreed ?? petBreed ?? "");
  const [color, setColor] = useState(initialColor ?? "");
  const [microchipId, setMicrochipId] = useState(initialMicrochipId ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [publicFields, setPublicFields] = useState({
    name: initialPublicFields?.name ?? DEFAULT_PUBLIC_FIELDS.name,
    breed: initialPublicFields?.breed ?? DEFAULT_PUBLIC_FIELDS.breed,
    color: initialPublicFields?.color ?? DEFAULT_PUBLIC_FIELDS.color,
    emergencyContact: initialPublicFields?.emergencyContact ?? DEFAULT_PUBLIC_FIELDS.emergencyContact,
    microchipId: initialPublicFields?.microchipId ?? DEFAULT_PUBLIC_FIELDS.microchipId,
    notes: initialPublicFields?.notes ?? DEFAULT_PUBLIC_FIELDS.notes,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identityCopied, setIdentityCopied] = useState(false);
  const identityCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareCopiedHint, setShareCopiedHint] = useState(false);
  const shareHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canCopyPetIdentity =
    Boolean(petIdentity?.trim()) && petIdentity.trim() !== "Nao disponivel";

  useEffect(() => {
    return () => {
      if (identityCopyTimerRef.current) clearTimeout(identityCopyTimerRef.current);
      if (shareHintTimerRef.current) clearTimeout(shareHintTimerRef.current);
    };
  }, []);

  async function copyPetIdentity() {
    if (!canCopyPetIdentity) return;
    const text = petIdentity.trim();
    try {
      await navigator.clipboard.writeText(text);
      setIdentityCopied(true);
      if (identityCopyTimerRef.current) clearTimeout(identityCopyTimerRef.current);
      identityCopyTimerRef.current = setTimeout(() => {
        setIdentityCopied(false);
        identityCopyTimerRef.current = null;
      }, 1600);
    } catch {
      /* clipboard pode falhar em contexto inseguro */
    }
  }

  async function sharePublicProfile() {
    if (!sharePublicUrl?.trim()) return;
    const display = (name.trim() || petName).trim() || "Pet";
    const idRaw = petIdentity?.trim() ?? "";
    const idLine = idRaw && idRaw !== "Nao disponivel" ? `ID: ${idRaw}` : "";
    const url = sharePublicUrl.trim();
    const textLines = [display];
    if (idLine) textLines.push(idLine);
    textLines.push("", url);
    const text = textLines.join("\n");
    const title = `Perfil de ${display}`;

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareCopiedHint(true);
      if (shareHintTimerRef.current) clearTimeout(shareHintTimerRef.current);
      shareHintTimerRef.current = setTimeout(() => {
        setShareCopiedHint(false);
        shareHintTimerRef.current = null;
      }, 2000);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const payload = {
        age: age ?? undefined,
        weightKg: weightKg ?? undefined,
        name: name.trim(),
        sex: sex.trim(),
        size: size.trim(),
        emergencyContact: emergencyContact.trim(),
        breed: breed.trim(),
        color: color.trim(),
        microchipId: microchipId.trim(),
        notes: notes.trim(),
        publicFields,
      };

      const res = await fetch("/api/pets/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao salvar dados do pet.");
      }

      setSaveState("success");
      setTimeout(() => {
        setSaveState("idle");
        setIsEditing(false);
      }, 1300);
    } catch (error) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar dados do pet.");
    }
  }

  async function handleChoosePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setPhotoState("uploading");
    setPhotoError(null);

    try {
      const formData = new FormData();
      formData.set("image", file);
      const res = await fetch("/api/pets/current/photo", {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json().catch(() => null)) as
        | {
            error?: string;
            image?: string;
          }
        | null;
      if (!res.ok) throw new Error(payload?.error ?? "Falha ao enviar foto do pet.");
      setPhotoUrl(getPetImageOrDefault(payload?.image ?? ""));
      setPhotoState("idle");
    } catch (error) {
      setPhotoState("error");
      setPhotoError(error instanceof Error ? error.message : "Falha ao enviar foto do pet.");
    }
  }

  const isPhotoBusy = photoState === "uploading";

  return (
    <>
      <section className="appear-up mt-3 overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]" style={{ animationDelay: "80ms" }}>
        <div className="relative h-[220px]">
          <Image src={photoUrl} alt={`Foto da ${name || petName}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 440px" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <h2 className="text-[28px] font-semibold text-white">{name.trim() || "Pet"}</h2>
            <p className="text-[12px] text-white/80">{petBreed}</p>
          </div>
          <div className="absolute bottom-4 right-4 flex max-w-[calc(100%-2rem)] flex-wrap items-center justify-end gap-2">
            <input
              ref={fileInputRef}
              id={PET_PROFILE_PHOTO_INPUT_ID}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChoosePhoto}
            />
            {sharePublicUrl ? (
              <button
                type="button"
                onClick={() => void sharePublicProfile()}
                className="flex items-center gap-1.5 rounded-xl bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 shadow-sm transition hover:bg-white"
                aria-label="Compartilhar perfil publico do pet"
              >
                <IconShare className="h-4 w-4 shrink-0" />
                {shareCopiedHint ? "Copiado!" : "Compartilhar"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={isPhotoBusy}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-white/92 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {photoState === "uploading" ? "Enviando..." : "Editar"}
            </button>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="appear-up mt-3 space-y-3" style={{ animationDelay: "140ms" }}>
        <section className="grid grid-cols-2 gap-2.5">
          <article className="elev-card col-span-2 rounded-2xl p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Identidade do pet</p>
            <button
              type="button"
              onClick={() => void copyPetIdentity()}
              disabled={!canCopyPetIdentity}
              title={canCopyPetIdentity ? "Toque para copiar o ID" : undefined}
              className={`mt-1.5 w-full rounded-xl px-1 py-1 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80 focus-visible:ring-offset-2 ${
                canCopyPetIdentity
                  ? "cursor-pointer active:bg-zinc-100/80 hover:bg-zinc-50"
                  : "cursor-default opacity-80"
              } disabled:cursor-not-allowed`}
            >
              <span
                className={`block text-[16px] font-semibold tracking-[0.08em] ${
                  identityCopied ? "text-emerald-600" : "text-zinc-900"
                }`}
              >
                {identityCopied ? "Copiado" : petIdentity}
              </span>
            </button>
          </article>
          <article className="elev-card rounded-2xl p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Idade</p>
            {isEditing ? (
              <input
                type="number"
                min={0}
                max={40}
                step={1}
                value={age ?? ""}
                onChange={(event) => setAge(event.target.value === "" ? null : Number(event.target.value))}
                placeholder="Idade"
                className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[16px] font-semibold text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
              />
            ) : (
              <p className="mt-2 text-[24px] font-semibold text-zinc-900">{age === null ? "Nao informado" : `${age} anos`}</p>
            )}
          </article>
          <article className="elev-card rounded-2xl p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Peso</p>
            {isEditing ? (
              <input
                type="number"
                min={0.1}
                max={130}
                step={0.1}
                value={weightKg ?? ""}
                onChange={(event) => setWeightKg(event.target.value === "" ? null : Number(event.target.value))}
                placeholder="Peso (kg)"
                className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[16px] font-semibold text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
              />
            ) : (
              <p className="mt-2 text-[24px] font-semibold text-zinc-900">{formatWeight(weightKg)}</p>
            )}
          </article>
          <article className="elev-card rounded-2xl p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Sexo</p>
            {isEditing ? (
              <input
                type="text"
                maxLength={20}
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                placeholder="Sexo"
                className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[16px] font-semibold text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
              />
            ) : (
              <p className="mt-2 text-[20px] font-semibold text-zinc-900">{sex.trim() || "Nao informado"}</p>
            )}
          </article>
          <article className="elev-card rounded-2xl p-3.5">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Porte</p>
            {isEditing ? (
              <input
                type="text"
                maxLength={20}
                value={size}
                onChange={(event) => setSize(event.target.value)}
                placeholder="Porte"
                className="mt-2 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-[16px] font-semibold text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
              />
            ) : (
              <p className="mt-2 text-[20px] font-semibold text-zinc-900">{size.trim() || "Nao informado"}</p>
            )}
          </article>
        </section>

        <section className="rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[14px] font-semibold text-zinc-900">Dados complementares</h3>
            <button
              type="button"
              onClick={() => {
                setIsEditing((value) => !value);
                setSaveState("idle");
                setErrorMessage(null);
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              {isEditing ? "Cancelar" : "Editar"}
            </button>
          </div>
          {photoError ? <p className="mb-2 text-[12px] font-medium text-red-600">{photoError}</p> : null}
          <div className="space-y-2">
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Nome</p>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setPublicFields((value) => ({ ...value, name: !value.name }))}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    publicFields.name ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {publicFields.name ? "Publico" : "Privado"}
                </button>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={50}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome"
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{name.trim() || "Nao informado"}</p>
              )}
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Raca</p>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setPublicFields((value) => ({ ...value, breed: !value.breed }))}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    publicFields.breed ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {publicFields.breed ? "Publico" : "Privado"}
                </button>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={50}
                  value={breed}
                  onChange={(event) => setBreed(event.target.value)}
                  placeholder="Raca"
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{breed.trim() || "Nao informado"}</p>
              )}
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Cor</p>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setPublicFields((value) => ({ ...value, color: !value.color }))}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    publicFields.color ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {publicFields.color ? "Publico" : "Privado"}
                </button>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={30}
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  placeholder="Cor"
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{color.trim() || "Nao informado"}</p>
              )}
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Contato de emergencia</p>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setPublicFields((value) => ({ ...value, emergencyContact: !value.emergencyContact }))}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    publicFields.emergencyContact ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {publicFields.emergencyContact ? "Publico" : "Privado"}
                </button>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={40}
                  value={emergencyContact}
                  onChange={(event) => setEmergencyContact(event.target.value)}
                  placeholder="Contato de emergencia"
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{emergencyContact.trim() || "Nao informado"}</p>
              )}
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Microchip</p>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setPublicFields((value) => ({ ...value, microchipId: !value.microchipId }))}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    publicFields.microchipId ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {publicFields.microchipId ? "Publico" : "Privado"}
                </button>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={40}
                  value={microchipId}
                  onChange={(event) => setMicrochipId(event.target.value)}
                  placeholder="ID do microchip"
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{microchipId.trim() || "Nao informado"}</p>
              )}
            </article>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-wide text-zinc-500">Observações</p>
                <button
                  type="button"
                  disabled={!isEditing}
                  onClick={() => setPublicFields((value) => ({ ...value, notes: !value.notes }))}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    publicFields.notes ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {publicFields.notes ? "Publico" : "Privado"}
                </button>
              </div>
              {isEditing ? (
                <textarea
                  maxLength={280}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Outros dados importantes do pet"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[13px] text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{notes.trim() || "Nao informado"}</p>
              )}
            </article>
          </div>
          {isEditing ? (
            <div className="mt-3 rounded-[20px] bg-white p-3 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]">
              <button
                type="submit"
                disabled={saveState === "saving"}
                className="h-10 w-full rounded-xl bg-emerald-600 text-[13px] font-semibold text-white transition enabled:hover:bg-emerald-700 disabled:opacity-70"
              >
                {saveState === "saving" ? "Salvando..." : "Salvar"}
              </button>
              {saveState === "success" ? <p className="mt-2 text-[12px] font-medium text-emerald-700">Dados salvos com sucesso.</p> : null}
              {saveState === "error" && errorMessage ? <p className="mt-2 text-[12px] font-medium text-red-600">{errorMessage}</p> : null}
            </div>
          ) : null}
        </section>
      </form>
    </>
  );
}
