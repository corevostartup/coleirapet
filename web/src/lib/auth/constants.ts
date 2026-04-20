/** Nome do cookie de sessão pós-login (Apple / Google / dev). */
export const AUTH_SESSION_COOKIE = "cp_session";

/** Valores aceitos pelo middleware até existir JWT/servidor de auth. */
export const AUTH_SESSION_VALUES = ["apple", "google", "dev"] as const;

export type AuthSessionValue = (typeof AUTH_SESSION_VALUES)[number];

export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;
