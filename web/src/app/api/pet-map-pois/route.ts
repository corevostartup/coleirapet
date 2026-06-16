import { NextResponse } from "next/server";
import { searchPetMapPoisAround } from "@/lib/map/pet-map-pois";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Coordenadas invalidas." }, { status: 400 });
  }

  const pois = await searchPetMapPoisAround(lat, lng);

  return NextResponse.json(
    { pois },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
