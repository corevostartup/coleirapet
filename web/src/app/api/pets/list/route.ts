import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { COLLECTION_PETS, COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getPetAccessById } from "@/lib/pets/access";
import { createOwnedPet, listOwnedPets, setCurrentPet } from "@/lib/pets/current";
import { getOrCreateCurrentUserProfile } from "@/lib/users/current";

type SwitchPetPayload = {
  petId?: string;
};

async function deleteCollectionTree(collectionRef: FirebaseFirestore.CollectionReference): Promise<void> {
  const snapshot = await collectionRef.get();
  for (const doc of snapshot.docs) {
    await deleteDocTree(doc.ref);
  }
}

async function deleteDocTree(docRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const subcollections = await docRef.listCollections();
  for (const subcollection of subcollections) {
    await deleteCollectionTree(subcollection);
  }
  await docRef.delete();
}

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

export async function GET() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const data = await listOwnedPets(auth.uid);
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: SwitchPetPayload;
  try {
    body = (await request.json()) as SwitchPetPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  if (!petId) return NextResponse.json({ error: "Pet invalido" }, { status: 400 });

  const pet = await setCurrentPet(auth.uid, petId);
  if (!pet) return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });

  const data = await listOwnedPets(auth.uid);
  return NextResponse.json({ ok: true, ...data });
}

export async function POST() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const user = await getOrCreateCurrentUserProfile(auth.uid);
  if (user.plan !== "pro") {
    return NextResponse.json(
      {
        error: "Plano Free permite apenas 1 pet. Assine o Premium para liberar pets ilimitados.",
        requiresUpgrade: true,
      },
      { status: 403 },
    );
  }

  await createOwnedPet(auth.uid);
  const data = await listOwnedPets(auth.uid);
  return NextResponse.json({ ok: true, ...data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  let body: SwitchPetPayload;
  try {
    body = (await request.json()) as SwitchPetPayload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const petId = typeof body.petId === "string" ? body.petId.trim() : "";
  if (!petId) return NextResponse.json({ error: "Pet invalido" }, { status: 400 });

  const db = getFirebaseAdminDb();
  const petAccess = await getPetAccessById(auth.uid, petId);
  if (!petAccess) {
    return NextResponse.json({ error: "Pet nao encontrado" }, { status: 404 });
  }
  if (!petAccess.access.canDeletePet) {
    return NextResponse.json({ error: "Tutor secundario nao pode excluir pet." }, { status: 403 });
  }

  const petRef = db.collection(COLLECTION_PETS).doc(petId);

  await deleteDocTree(petRef);

  const userRef = db.collection(COLLECTION_USER).doc(auth.uid);
  const userSnap = await userRef.get();
  const defaultPetId = typeof userSnap.data()?.defaultPetId === "string" ? userSnap.data()?.defaultPetId : "";
  if (defaultPetId === petId) {
    await userRef.set({ defaultPetId: "" }, { merge: true });
  }

  const data = await listOwnedPets(auth.uid);
  return NextResponse.json({ ok: true, ...data });
}
