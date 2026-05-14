/** Nome do cookie de sessão pós-login (Apple / Google / Email / dev). */
export const AUTH_SESSION_COOKIE = "cp_session";
export const AUTH_USER_NAME_COOKIE = "cp_user_name";
export const AUTH_USER_PHOTO_COOKIE = "cp_user_photo";
export const AUTH_USER_UID_COOKIE = "cp_user_uid";

/** Valores aceitos pelo middleware até existir JWT/servidor de auth. */
export const AUTH_SESSION_VALUES = ["apple", "google", "email", "dev"] as const;

export type AuthSessionValue = (typeof AUTH_SESSION_VALUES)[number];

export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Rótulo de email no perfil após Sign in with Apple (até o tutor informar um email real). */
export const USER_PROFILE_EMAIL_PLACEHOLDER = "Não Informado";
