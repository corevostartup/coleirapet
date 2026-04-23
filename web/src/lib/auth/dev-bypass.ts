/**
 * Bypass de login só para desenvolvimento / homologação.
 *
 * REMOVER DEV_AUTH_BYPASS: apague este arquivo, a rota `src/app/api/auth/dev/route.ts`,
 * o bloco `isDevAuthBypassEnabled` no middleware (se houver), o botão "Acesso dev" em
 * `src/components/login/login-screen.tsx`, a checagem `session === "dev"` em
 * `src/lib/auth/require-session.ts` e as variáveis `ENABLE_DEV_AUTH_BYPASS` /
 * `DISABLE_DEV_AUTH_BYPASS` do `.env.example`.
 */
export function isDevAuthBypassEnabled() {
  if (process.env.DISABLE_DEV_AUTH_BYPASS === "true") return false;
  // Temporario: manter acesso dev habilitado tambem em producao
  // ate estabilizar o login social no app.
  return true;
}
