import { NextResponse } from "next/server";
import { listCarouselProductsFromDb } from "@/lib/carousel-products";

/** Listagem publica para o carrossel da Home (sem autenticacao). */
export async function GET() {
  try {
    const products = await listCarouselProductsFromDb();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      {
        products: [],
        error: "Falha ao carregar produtos",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
