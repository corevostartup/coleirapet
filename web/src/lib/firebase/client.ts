import { initializeApp, getApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  getAuth,
  getRedirectResult,
  inMemoryPersistence,
  setPersistence,
  signInWithCredential,
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

/** Provider para fluxo só redirect (ex.: ASWebAuthenticationSession no iOS): evita repetição do seletor de conta. */
function buildGoogleProviderForRedirectFlow() {
  return new GoogleAuthProvider();
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

/**
 * Troca um Google ID token (vindo do SDK nativo iOS) por sessao Firebase Auth.
 * Retorna o Firebase ID token para envio ao backend.
 */
export async function signInWithGoogleNativeIdToken(googleIdToken: string): Promise<string> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const credential = GoogleAuthProvider.credential(googleIdToken);
  const result = await signInWithCredential(auth, credential);
  return result.user.getIdToken();
}

/**
 * Troca um Apple ID token (vindo do Sign in with Apple nativo iOS) por sessao Firebase Auth.
 * Retorna o Firebase ID token para envio ao backend.
 */
export async function signInWithAppleNativeIdToken(appleIdToken: string): Promise<string> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({ idToken: appleIdToken });
  const result = await signInWithCredential(auth, credential);
  return result.user.getIdToken();
}

export async function signInWithAppleOnWeb(): Promise<string> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

export async function signInWithEmailPassword(email: string, password: string): Promise<string> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  return result.user.getIdToken();
}

export async function createAccountWithEmailPassword(email: string, password: string): Promise<string> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  return result.user.getIdToken();
}

/**
 * Apenas redirect — necessário no fluxo nativo iOS (Safari da ASWebAuthenticationSession):
 * popup não é confiável e `prompt=select_account` pode gerar loop no seletor de conta.
 */
export async function signInWithGoogleRedirectOnly(): Promise<void> {
  const auth = getAuth(getFirebaseApp());
  await ensureAuthPersistence();
  const provider = buildGoogleProviderForRedirectFlow();
  await signInWithRedirect(auth, provider);
}
