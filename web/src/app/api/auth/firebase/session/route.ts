import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_MAX_AGE_SEC,
  AUTH_USER_NAME_COOKIE,
  AUTH_USER_PHOTO_COOKIE,
  AUTH_USER_UID_COOKIE,
} from "@/lib/auth/constants";
import { COLLECTION_USER } from "@/lib/firebase/collections";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

type Payload = {
  idToken?: string;
  provider?: "google" | "apple";
};

type VerifiedIdentity = {
  uid: string;
  name: string | null;
  email: string | null;
  picture: string | null;
  firebaseProvider: string;
};

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

    const userName = (verified.name ?? verified.email ?? "Tutor(a)").trim();
    const encodedUserName = encodeURIComponent(userName.slice(0, 80));
    const userPhotoUrl = typeof verified.picture === "string" ? verified.picture.trim() : "";
    const encodedUserPhotoUrl = userPhotoUrl ? encodeURIComponent(userPhotoUrl.slice(0, 1024)) : "";
    const nowIso = new Date().toISOString();
    const userRef = getFirebaseAdminDb().collection(COLLECTION_USER).doc(verified.uid);
    const userSnapshot = await userRef.get();

    await userRef.set(
      {
        uid: verified.uid,
        userId: verified.uid,
        UserID: verified.uid,
        email: verified.email ?? null,
        name: userName,
        photoURL: verified.picture ?? null,
        provider: verified.firebaseProvider || provider,
        lastLoginAt: nowIso,
        ...(userSnapshot.exists ? {} : { createdAt: nowIso, CreatedAt: nowIso }),
      },
      { merge: true },
    );

    const res = NextResponse.json({
      ok: true,
      uid: verified.uid,
      provider: verified.firebaseProvider || provider,
      ...(adminVerifyError ? { warning: `Admin verify fallback: ${adminVerifyError}` } : {}),
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
