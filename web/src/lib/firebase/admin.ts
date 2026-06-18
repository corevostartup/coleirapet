import type { App } from "firebase-admin/app";
import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";

function readRequired(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
  return value;
}

function normalizePrivateKey(raw: string) {
  const withoutWrappingQuotes = raw.trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");

  return withoutWrappingQuotes
    .replace(/\\\\r\\\\n/g, "\n")
    .replace(/\\\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();
}

type ServiceAccountInput = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function parseServiceAccountFromEnv(raw: string): ServiceAccountInput {
  const normalized = raw.trim();
  if (!normalized) {
    throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON vazio.");
  }

  // Aceita JSON puro ou JSON em base64 (comum em CI/CD).
  const maybeJson = normalized.startsWith("{")
    ? normalized
    : Buffer.from(normalized, "base64").toString("utf8");

  return JSON.parse(maybeJson) as ServiceAccountInput;
}

function readFirebaseAdminCredentials() {
  const serviceAccountRaw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

  if (serviceAccountRaw) {
    let parsed: ServiceAccountInput;
    try {
      parsed = parseServiceAccountFromEnv(serviceAccountRaw);
    } catch (error) {
      throw new Error(
        `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON invalido: ${error instanceof Error ? error.message : "JSON malformado."}`,
      );
    }

    const projectId = (parsed.project_id ?? "").trim();
    const clientEmail = (parsed.client_email ?? "").trim();
    const privateKey = normalizePrivateKey(parsed.private_key ?? "");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON deve conter project_id, client_email e private_key.");
    }

    return { projectId, clientEmail, privateKey };
  }

  const projectId = readRequired("FIREBASE_ADMIN_PROJECT_ID");
  const clientEmail = readRequired("FIREBASE_ADMIN_CLIENT_EMAIL");
  const privateKey = normalizePrivateKey(readRequired("FIREBASE_ADMIN_PRIVATE_KEY"));

  if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY com formato invalido. Use a chave completa PEM com BEGIN/END e quebras de linha \\n.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

let cachedApp: App | null = null;

/** require() adiado — evita crash na carga do modulo serverless (Netlify) antes do try/catch das rotas. */
function getOrInitFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cert, getApp, getApps, initializeApp } = require("firebase-admin/app") as typeof import("firebase-admin/app");
  const { projectId, clientEmail, privateKey } = readFirebaseAdminCredentials();

  cachedApp =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });

  return cachedApp;
}

export function getFirebaseAdminAuth(): Auth {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getAuth } = require("firebase-admin/auth") as typeof import("firebase-admin/auth");
  return getAuth(getOrInitFirebaseAdminApp());
}

export function getFirebaseAdminDb(): Firestore {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFirestore } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  return getFirestore(getOrInitFirebaseAdminApp());
}

export function getFirestoreFieldValue() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FieldValue } = require("firebase-admin/firestore") as typeof import("firebase-admin/firestore");
  return FieldValue;
}
