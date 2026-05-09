import { NextResponse } from "next/server";
import {
  createCarouselProduct,
  deleteCarouselProduct,
  listCarouselProductsFromDb,
  updateCarouselProduct,
} from "@/lib/carousel-products";

export async function GET() {
  try {
    const products = await listCarouselProductsFromDb();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao carregar produtos",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      image?: string;
      ctaLabel?: string;
      ctaHref?: string;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const ctaLabel = typeof body.ctaLabel === "string" ? body.ctaLabel.trim() : "";
    const ctaHref = typeof body.ctaHref === "string" ? body.ctaHref.trim() : "";

    if (title.length < 2) return NextResponse.json({ error: "Titulo invalido" }, { status: 400 });
    if (description.length < 2) return NextResponse.json({ error: "Descricao invalida" }, { status: 400 });
    if (!image) return NextResponse.json({ error: "Imagem (URL ou caminho) obrigatoria" }, { status: 400 });
    if (!ctaLabel) return NextResponse.json({ error: "Texto do botao obrigatorio" }, { status: 400 });
    if (!ctaHref) return NextResponse.json({ error: "Link do botao obrigatorio" }, { status: 400 });

    const product = await createCarouselProduct({
      title,
      description,
      image,
      ctaLabel,
      ctaHref,
    });

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao criar produto",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      description?: string;
      image?: string;
      ctaLabel?: string;
      ctaHref?: string;
      sortOrder?: number;
    };

    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) return NextResponse.json({ error: "Id invalido" }, { status: 400 });

    const product = await updateCarouselProduct({
      id,
      title: body.title,
      description: body.description,
      image: body.image,
      ctaLabel: body.ctaLabel,
      ctaHref: body.ctaHref,
      sortOrder: body.sortOrder,
    });

    if (!product) return NextResponse.json({ error: "Produto nao encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao atualizar produto",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim() ?? "";
    if (!id) return NextResponse.json({ error: "Id obrigatorio" }, { status: 400 });

    const ok = await deleteCarouselProduct(id);
    if (!ok) return NextResponse.json({ error: "Produto nao encontrado" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Falha ao remover produto",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
