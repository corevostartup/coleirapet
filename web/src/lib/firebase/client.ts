import { initializeApp, getApp, getApps } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

type GoogleSignInResult =
  | { type: "success"; idToken: string }
  | { type: "redirect" };

let persistenceReady: Promise<void> | null = null;

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error("Firebase nao configurado no ambiente.");
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(getFirebaseConfig());
  }
  return getApp();
}

async function ensureAuthPersistence() {
  if (persistenceReady) return persistenceReady;

  const auth = getAuth(getFirebaseApp());
  persistenceReady = setPersistence(auth, browserLocalPersistence).catch(async () => {
    await setPersistence(auth, inMemoryPersistence);
  });
  return persistenceReady;
}

function buildGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function shouldUseRedirect(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: string }).code) : "";
  return [
    "auth/popup-blocked",
    "auth/popup-closed-by-user",
    "auth/operation-not-supported-in-this-environment",
  ].includes(code);
}

export async function signInWithGoogleOnWeb(): Promise<GoogleSignInResult> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const provider = buildGoogleProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    return { type: "success", idToken };
  } catch (error) {
    if (shouldUseRedirect(error)) {
      await signInWithRedirect(auth, provider);
      return { type: "redirect" };
    }
    throw error;
  }
}

export async function consumeGoogleRedirectResult(): Promise<string | null> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const result = await getRedirectResult(auth);
  if (!result?.user) return null;
  return result.user.getIdToken();
}
