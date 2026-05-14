import type { DocumentSnapshot } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SEC,
  AUTH_USER_NAME_COOKIE,
  AUTH_USER_PHOTO_COOKIE,
  AUTH_USER_UID_COOKIE,
  USER_PROFILE_EMAIL_PLACEHOLDER,
} from "@/lib/auth/constants";
import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import { getOrCreateCurrentPet } from "@/lib/pets/current";

type Payload = {
  idToken?: string;
  provider?: "google" | "apple" | "email";
};

type VerifiedIdentity = {
  uid: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  firebaseProvider: string;
};

type UserProfileUpsertInput = {
  uid: string;
  email: string | null;
  userName: string;
  userPhotoUrl: string | null;
  provider: string;
};

const APPLE_PLACEHOLDER_USER_NAME = "User";

function isApplePrivateRelayEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().includes("privaterelay.appleid.com");
}

/**
 * Perfil exibido no app: Sign in with Apple costuma trazer nome e email de relay pouco amigaveis.
 * Novos logins Apple usam placeholders; contas existentes só trocam relay pelo rótulo, preservando dados já editados.
 */
function resolveAppleProfileFromSnapshot(
  userSnapshot: DocumentSnapshot,
  verified: VerifiedIdentity,
): { userName: string; email: string; userPhotoUrl: string | null } {
  const verifiedEmail = verified.email?.trim() ?? "";
  const verifiedName = verified.name?.trim() ?? "";
  const tokenIsRelay = isApplePrivateRelayEmail(verifiedEmail);

  if (!userSnapshot.exists) {
    return {
      userName: APPLE_PLACEHOLDER_USER_NAME,
      email: USER_PROFILE_EMAIL_PLACEHOLDER,
      userPhotoUrl: null,
    };
  }

  const raw = (userSnapshot.data() ?? {}) as { name?: unknown; email?: unknown; photoURL?: unknown };
  let name = typeof raw.name === "string" ? raw.name.trim() : "";
  let email = typeof raw.email === "string" ? raw.email.trim() : "";
  let photoURL: string | null =
    typeof raw.photoURL === "string" && raw.photoURL.trim() ? raw.photoURL.trim() : null;

  const hadRelay = isApplePrivateRelayEmail(email);
  const emailStillMatchesTokenRelay = tokenIsRelay && email === verifiedEmail;

  if (hadRelay || emailStillMatchesTokenRelay) {
    email = USER_PROFILE_EMAIL_PLACEHOLDER;
    if (!name || (verifiedName.length > 0 && name === verifiedName)) {
      name = APPLE_PLACEHOLDER_USER_NAME;
    }
  }

  if (!name) name = APPLE_PLACEHOLDER_USER_NAME;
  if (!email) email = USER_PROFILE_EMAIL_PLACEHOLDER;

  return { userName: name, email, userPhotoUrl: photoURL };
}

async function verifyIdTokenWithAdmin(idToken: string): Promise<VerifiedIdentity> {
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
  const firebaseProvider =
    (decoded.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider ?? "";

  return {
    uid: decoded.uid,
    name: typeof decoded.name === "string" ? decoded.name : null,
    email: typeof decoded.email === "string" ? decoded.email : null,
    picture: typeof decoded.picture === "string" ? decoded.picture : null,
    firebaseProvider,
  };
}

async function verifyIdTokenWithIdentityToolkit(idToken: string): Promise<VerifiedIdentity> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY ausente para fallback de validacao.");

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => null)) as
    | {
        users?: Array<{
          localId?: string;
          displayName?: string;
          email?: string;
          photoUrl?: string;
          providerUserInfo?: Array<{ providerId?: string }>;
        }>;
        error?: { message?: string };
      }
    | null;

  if (!res.ok) {
    const reason = payload?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`IdentityToolkit lookup falhou: ${reason}`);
  }

  const user = payload?.users?.[0];
  if (!user?.localId) throw new Error("IdentityToolkit nao retornou usuario para o idToken.");

  return {
    uid: user.localId,
    name: typeof user.displayName === "string" ? user.displayName : null,
    email: typeof user.email === "string" ? user.email : null,
    picture: typeof user.photoUrl === "string" ? user.photoUrl : null,
    firebaseProvider: user.providerUserInfo?.[0]?.providerId ?? "",
  };
}

async function upsertUserProfileSafe(
  input: UserProfileUpsertInput,
  preloadedSnapshot?: DocumentSnapshot,
): Promise<string | null> {
  try {
    const nowIso = new Date().toISOString();
    const userRef = getFirebaseAdminDb().collection(COLLECTION_USER).doc(input.uid);
    const userSnapshot = preloadedSnapshot ?? (await userRef.get());
    await userRef.set(
      {
        uid: input.uid,
        userId: input.uid,
        UserID: input.uid,
        email: input.email,
        name: input.userName,
        photoURL: input.userPhotoUrl,
        provider: input.provider,
        lastLoginAt: nowIso,
        ...(userSnapshot.exists ? {} : { createdAt: nowIso, CreatedAt: nowIso, plan: "free" }),
      },
      { merge: true },
    );
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Falha desconhecida ao salvar perfil.";
  }
}

export async function POST(request: Request) {
  let body: Payload;

  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  if (!body.idToken) {
    return NextResponse.json({ error: "idToken obrigatorio" }, { status: 400 });
  }

  const provider = body.provider ?? "google";

  try {
    let verified: VerifiedIdentity;
    let adminVerifyError: string | null = null;
    try {
      verified = await verifyIdTokenWithAdmin(body.idToken);
    } catch (error) {
      adminVerifyError = error instanceof Error ? error.message : "Falha desconhecida no Admin SDK.";
      verified = await verifyIdTokenWithIdentityToolkit(body.idToken);
    }

    if (provider === "google" && verified.firebaseProvider !== "google.com") {
      return NextResponse.json({ error: "Token nao pertence ao Google" }, { status: 403 });
    }
    if (provider === "apple" && verified.firebaseProvider !== "apple.com") {
      return NextResponse.json({ error: "Token nao pertence a Apple" }, { status: 403 });
    }
    if (provider === "email" && !["password", "email"].includes(verified.firebaseProvider)) {
      return NextResponse.json({ error: "Token nao pertence ao login por email" }, { status: 403 });
    }

    const userRef = getFirebaseAdminDb().collection(COLLECTION_USER).doc(verified.uid);
    const userSnapshot = await userRef.get();

    let userName: string;
    let profileEmail: string | null;
    let profilePhoto: string | null;

    if (provider === "apple") {
      const resolved = resolveAppleProfileFromSnapshot(userSnapshot, verified);
      userName = resolved.userName;
      profileEmail = resolved.email;
      profilePhoto = resolved.userPhotoUrl;
    } else {
      userName = (verified.name ?? verified.email ?? "Tutor(a)").trim();
      profileEmail = verified.email ?? null;
      profilePhoto = verified.picture ?? null;
    }

    const encodedUserName = encodeURIComponent(userName.slice(0, 80));
    const userPhotoUrlTrimmed = typeof profilePhoto === "string" ? profilePhoto.trim() : "";
    const encodedUserPhotoUrl = userPhotoUrlTrimmed ? encodeURIComponent(userPhotoUrlTrimmed.slice(0, 1024)) : "";
    const profileWriteWarning = await upsertUserProfileSafe(
      {
        uid: verified.uid,
        email: profileEmail,
        userName,
        userPhotoUrl: profilePhoto,
        provider: verified.firebaseProvider || provider,
      },
      userSnapshot,
    );
    const defaultPetProvisionWarning = await (async () => {
      try {
        await getOrCreateCurrentPet(verified.uid);
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : "Falha desconhecida ao provisionar pet padrao.";
      }
    })();

    const res = NextResponse.json({
      ok: true,
      uid: verified.uid,
      provider: verified.firebaseProvider || provider,
      ...(adminVerifyError ? { warning: `Admin verify fallback: ${adminVerifyError}` } : {}),
      ...(profileWriteWarning ? { profileSyncWarning: profileWriteWarning } : {}),
      ...(defaultPetProvisionWarning ? { petProvisionWarning: defaultPetProvisionWarning } : {}),
    });
    res.cookies.set(AUTH_SESSION_COOKIE, provider, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    });
    res.cookies.set(AUTH_USER_NAME_COOKIE, encodedUserName, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    });
    res.cookies.set(AUTH_USER_PHOTO_COOKIE, encodedUserPhotoUrl, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    });
    res.cookies.set(AUTH_USER_UID_COOKIE, encodeURIComponent(verified.uid), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    });
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao validar sessao Firebase", detail: error instanceof Error ? error.message : "" },
      { status: 401 },
    );
  }
}
