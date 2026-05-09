import { headers } from "next/headers";

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

/**
 * Origem absoluta do site (HTTPS em producao) para links e Open Graph.
 * Preferir `NEXT_PUBLIC_SITE_URL` no deploy (dominio canonico para WhatsApp e crawlers).
 */
export async function resolveSiteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return stripTrailingSlash(fromEnv);

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
      return stripTrailingSlash(`${proto}://${host.split(",")[0].trim()}`);
    }
  } catch {
    /* fora de request (ex.: build) */
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return stripTrailingSlash(`https://${vercelTrimHost(vercel)}`);

  return "http://localhost:3000";
}

function vercelTrimHost(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export async function absolutePublicUrl(pathname: string): Promise<string> {
  const origin = await resolveSiteOrigin();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}

/** Imagem do pet para og:image (URL absoluta; crawlers nao resolvem paths relativos). */
export async function absoluteOgImageUrl(imageSrc: string): Promise<string> {
  const s = imageSrc.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return absolutePublicUrl(s.startsWith("/") ? s : `/${s}`);
}
