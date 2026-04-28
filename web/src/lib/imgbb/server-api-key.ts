/**
 * Chave da API ImgBB apenas no servidor (nunca prefixo NEXT_PUBLIC_*).
 * Documentação: https://api.imgbb.com/
 *
 * Aceita aliases por compatibilidade com nomes que provedores gravam diferente.
 */
export function getImgBbServerApiKey(): string | undefined {
  const raw =
    process.env.IMGBB_API_KEY ??
    process.env.IMGBB_API_key ??
    process.env.IMGBB_KEY;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}
