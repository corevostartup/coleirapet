"use client";

import { useState } from "react";

type VeterinarianData = {
  crmv: string;
  specialty: string;
  validationStatus: string;
  bio: string;
};

type Props = {
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialBirthDate: string;
  initialUserType: "Tutor" | "vet";
  initialVeterinarian: VeterinarianData | null;
};

type SaveState = "idle" | "saving" | "success" | "error";

/** Novo cadastro como veterinario desativado na UI; utilizadores ja `vet` mantem a opcao ativa. */
const CAN_SELECT_VETERINARIAN_USER_TYPE = (initialUserType: "Tutor" | "vet") => initialUserType === "vet";

export function ProfileUserDetailsEditor({
  initialName,
  initialEmail,
  initialPhone,
  initialBirthDate,
  initialUserType,
  initialVeterinarian,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [birthDate, setBirthDate] = useState(initialBirthDate);
  const [userType, setUserType] = useState<"Tutor" | "vet">(initialUserType);
  const [crmv, setCrmv] = useState(initialVeterinarian?.crmv ?? "");
  const [specialty, setSpecialty] = useState(initialVeterinarian?.specialty ?? "");
  const [validationStatus, setValidationStatus] = useState(initialVeterinarian?.validationStatus ?? "Pendente");
  const [bio, setBio] = useState(initialVeterinarian?.bio ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/users/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          birthDate: birthDate.trim(),
          userType,
          veterinarian:
            userType === "vet"
              ? {
                  crmv: crmv.trim(),
                  specialty: specialty.trim(),
                  bio: bio.trim(),
                }
              : undefined,
        }),
      });

      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        user?: {
          name?: string;
          email?: string;
          phone?: string;
          birthDate?: string;
          userType?: "Tutor" | "vet";
        };
        veterinarian?: {
          crmv?: string;
          specialty?: string;
          validationStatus?: string;
          bio?: string;
        } | null;
      } | null;

      if (!res.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar dados do usuario.");
      }

      setName(payload?.user?.name?.trim() || name.trim());
      setEmail(payload?.user?.email?.trim() || email.trim());
      setPhone(payload?.user?.phone?.trim() || phone.trim());
      setBirthDate(payload?.user?.birthDate?.trim() || birthDate.trim());
      setUserType(payload?.user?.userType === "vet" ? "vet" : "Tutor");
      setCrmv(payload?.veterinarian?.crmv?.trim() || crmv.trim());
      setSpecialty(payload?.veterinarian?.specialty?.trim() || specialty.trim());
      setValidationStatus(payload?.veterinarian?.validationStatus?.trim() || validationStatus);
      setBio(payload?.veterinarian?.bio?.trim() || bio.trim());

      setSaveState("success");
      setTimeout(() => {
        setSaveState("idle");
        setIsEditing(false);
      }, 1300);
    } catch (error) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar dados do usuario.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="appear-up mt-3 rounded-[26px] bg-white p-4 shadow-[0_16px_28px_-22px_rgba(10,16,13,0.35)]"
      style={{ animationDelay: "190ms" }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-zinc-900">Dados do Usuario</h3>
          <p className="text-[11px] text-zinc-500">Nome, contato e perfil de acesso</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsEditing((value) => !value);
            setSaveState("idle");
            setErrorMessage(null);
          }}
          className="rounded-xl bg-zinc-100 px-3 py-1.5 text-[12px] font-semibold text-zinc-700 transition hover:bg-zinc-200"
        >
          {isEditing ? "Cancelar" : "Editar"}
        </button>
      </div>

      <div className="space-y-2">
        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Nome</p>
          {isEditing ? (
            <input
              type="text"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
              placeholder="Nome completo"
            />
          ) : (
            <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{name.trim() || "Nao informado"}</p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Email</p>
          {isEditing ? (
            <input
              type="email"
              maxLength={160}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
              placeholder="seu@email.com"
            />
          ) : (
            <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{email.trim() || "Nao informado"}</p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Telefone</p>
          {isEditing ? (
            <input
              type="text"
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
              placeholder="(11) 99999-9999"
            />
          ) : (
            <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{phone.trim() || "Nao informado"}</p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Data de nascimento</p>
          {isEditing ? (
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
            />
          ) : (
            <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{birthDate.trim() || "Nao informado"}</p>
          )}
        </article>

        <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Tipo de usuario</p>
          {isEditing ? (
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUserType("Tutor")}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                    userType === "Tutor" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  Tutor
                </button>
                <button
                  type="button"
                  disabled={!CAN_SELECT_VETERINARIAN_USER_TYPE(initialUserType)}
                  title={
                    CAN_SELECT_VETERINARIAN_USER_TYPE(initialUserType)
                      ? undefined
                      : "Cadastro como veterinario temporariamente indisponivel."
                  }
                  onClick={() => {
                    if (!CAN_SELECT_VETERINARIAN_USER_TYPE(initialUserType)) return;
                    setUserType("vet");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                    userType === "vet" ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  Veterinário
                </button>
              </div>
              {!CAN_SELECT_VETERINARIAN_USER_TYPE(initialUserType) ? (
                <p className="text-[11px] leading-snug text-zinc-500">
                  Cadastro como veterinario esta momentaneamente indisponivel.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{userType === "vet" ? "Veterinário" : "Tutor"}</p>
          )}
        </article>

        {userType === "vet" ? (
          <>
            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">CRMV</p>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={40}
                  value={crmv}
                  onChange={(event) => setCrmv(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                  placeholder="Numero do registro"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{crmv.trim() || "Nao informado"}</p>
              )}
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Especialidade</p>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={80}
                  value={specialty}
                  onChange={(event) => setSpecialty(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-[14px] font-medium text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                  placeholder="Ex.: Clinica de pequenos animais"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{specialty.trim() || "Nao informado"}</p>
              )}
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Status validacao</p>
              <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{validationStatus || "Pendente"}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Campo definido pelo sistema.</p>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Bio</p>
              {isEditing ? (
                <textarea
                  maxLength={500}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="Resumo profissional"
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[13px] text-zinc-900 outline-none ring-emerald-200 transition focus:ring"
                />
              ) : (
                <p className="mt-0.5 text-[14px] font-medium text-zinc-800">{bio.trim() || "Nao informado"}</p>
              )}
            </article>

          </>
        ) : null}
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
    </form>
  );
}
