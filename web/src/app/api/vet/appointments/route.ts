import { NextResponse } from "next/server";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";
import {
  advanceVetAppointment,
  createTriageAppointment,
  formatAppointmentWhen,
  listVetAppointments,
  loadPetForTriage,
  type TriageUrgency,
  TRIAGE_URGENCY_LEVELS,
} from "@/lib/veterinarians/appointments";
import { requireVetAuthContext } from "@/lib/veterinarians/auth";
import { finishActiveConsultation, pushRecentConsultation } from "@/lib/veterinarians/pet-session";

function toApiAppointment(record: Awaited<ReturnType<typeof listVetAppointments>>[number]) {
  return {
    ...record,
    when: formatAppointmentWhen(record.triagedAt),
    whenLabel: formatAppointmentWhen(record.startedAt ?? record.triagedAt),
    summary: record.chiefComplaint || record.symptoms || "Triagem registrada",
  };
}

export async function GET() {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  try {
    const appointments = await listVetAppointments(auth.uid);
    return NextResponse.json({ appointments: appointments.map(toApiAppointment) });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar atendimentos",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: {
    petId?: string;
    chiefComplaint?: string;
    symptoms?: string;
    symptomDuration?: string;
    urgency?: string;
    temperature?: string;
    additionalNotes?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  const chiefComplaint = typeof body.chiefComplaint === "string" ? body.chiefComplaint.trim() : "";
  if (!petId) return NextResponse.json({ error: "PetId invalido" }, { status: 400 });
  if (!chiefComplaint) return NextResponse.json({ error: "Informe a queixa principal." }, { status: 400 });

  const urgencyRaw = typeof body.urgency === "string" ? body.urgency.trim() : "Rotina";
  const urgency = (TRIAGE_URGENCY_LEVELS as readonly string[]).includes(urgencyRaw)
    ? (urgencyRaw as TriageUrgency)
    : "Rotina";

  try {
    const petDoc = await loadPetForTriage(petId);
    if (!petDoc) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

    const tutor = await getOrCreateCurrentUserProfile(petDoc.ownerId);
    const tutorName = tutor.name?.trim() || tutor.email?.trim() || "Tutor(a)";

    const appointment = await createTriageAppointment(
      auth.uid,
      { name: auth.name, crmv: auth.crmv },
      {
        petId,
        chiefComplaint,
        symptoms: body.symptoms,
        symptomDuration: body.symptomDuration,
        urgency,
        temperature: body.temperature,
        additionalNotes: body.additionalNotes,
      },
      {
        id: petDoc.id,
        name: petDoc.name,
        petIdentity: petDoc.petIdentity,
        tutorName,
      },
    );

    return NextResponse.json({ ok: true, appointment: toApiAppointment(appointment) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao registrar triagem.";
    const status = message.includes("fila") ? 409 : 500;
    return NextResponse.json(
      {
        error: "Falha ao registrar triagem",
        detail: message,
      },
      { status },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireVetAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: { id?: string };
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const appointmentId = typeof body.id === "string" ? body.id.trim() : "";
  if (!appointmentId) return NextResponse.json({ error: "Id invalido" }, { status: 400 });

  try {
    const updated = await advanceVetAppointment(auth.uid, appointmentId);

    if (updated.status === "Em atendimento") {
      await pushRecentConsultation(auth.uid, updated.petId);
    }

    if (updated.status === "Finalizado") {
      try {
        await finishActiveConsultation(auth.uid, updated.petId);
      } catch {
        // pet pode nao estar ativo na sessao; fila segue finalizada
      }
    }

    return NextResponse.json({ ok: true, appointment: toApiAppointment(updated) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao atualizar atendimento.";
    return NextResponse.json(
      {
        error: "Falha ao atualizar atendimento",
        detail: message,
      },
      { status: 400 },
    );
  }
}
