import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

function parseCoord(raw: string | null, min: number, max: number) {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function compactAddressFromNominatim(payload: { address?: Record<string, unknown> }) {
  const address = payload.address ?? {};
  const road = pickFirstText(address.road, address.pedestrian, address.footway, address.path, address.cycleway);
  const number = pickFirstText(address.house_number);
  const suburb = pickFirstText(address.suburb, address.neighbourhood, address.quarter);
  const city = pickFirstText(address.city, address.town, address.village, address.municipality);

  const streetLine = pickFirstText(road && number ? `${road}, ${number}` : "", road);
  return [streetLine, suburb, city].filter(Boolean).join(" · ");
}

export async function GET(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const url = new URL(request.url);
  const lat = parseCoord(url.searchParams.get("lat"), -90, 90);
  const lng = parseCoord(url.searchParams.get("lng"), -180, 180);
  if (lat === null || lng === null) {
    return NextResponse.json({ error: "Coordenadas invalidas" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "ColeiraPet/1.0 (support@coleirapet.app)",
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) {
      return NextResponse.json({ error: "Falha ao obter endereco" }, { status: 502 });
    }
    const payload = (await response.json()) as { address?: Record<string, unknown> };
    const compactAddress = compactAddressFromNominatim(payload);
    const address = compactAddress;
    if (!address) {
      return NextResponse.json({ error: "Endereco nao encontrado" }, { status: 404 });
    }
    return NextResponse.json({ address });
  } catch {
    return NextResponse.json({ error: "Falha ao obter endereco" }, { status: 502 });
  }
}
