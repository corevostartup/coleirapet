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
    const decoded = await getFirebaseAdminAuth().verifyIdToken(body.idToken);
    const firebaseProvider =
      (decoded.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider ?? "";

    if (provider === "google" && firebaseProvider !== "google.com") {
      return NextResponse.json({ error: "Token nao pertence ao Google" }, { status: 403 });
    }

    const userName = (decoded.name ?? decoded.email ?? "Tutor(a)").trim();
    const encodedUserName = encodeURIComponent(userName.slice(0, 80));
    const userPhotoUrl = typeof decoded.picture === "string" ? decoded.picture.trim() : "";
    const encodedUserPhotoUrl = userPhotoUrl ? encodeURIComponent(userPhotoUrl.slice(0, 1024)) : "";
    const nowIso = new Date().toISOString();
    const userRef = getFirebaseAdminDb().collection(COLLECTION_USER).doc(decoded.uid);
    const userSnapshot = await userRef.get();

    await userRef.set(
      {
        uid: decoded.uid,
        userId: decoded.uid,
        UserID: decoded.uid,
        email: decoded.email ?? null,
        name: userName,
        photoURL: decoded.picture ?? null,
        provider: firebaseProvider || provider,
        lastLoginAt: nowIso,
        ...(userSnapshot.exists ? {} : { createdAt: nowIso, CreatedAt: nowIso }),
      },
      { merge: true },
    );

    const res = NextResponse.json({ ok: true, uid: decoded.uid, provider: firebaseProvider || provider });
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
    res.cookies.set(AUTH_USER_UID_COOKIE, encodeURIComponent(decoded.uid), {
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
