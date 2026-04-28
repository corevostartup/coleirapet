import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, AUTH_USER_UID_COOKIE } from "@/lib/auth/constants";
import { parseAuthSessionCookie, parseAuthUserUidCookie } from "@/lib/auth/session";
import { getImgBbServerApiKey } from "@/lib/imgbb/server-api-key";
import { getOrCreateCurrentPet, invalidateCurrentPetCache } from "@/lib/pets/current";
import { getPetImageOrDefault } from "@/lib/pets/image";

const MAX_UPLOAD_SIZE_BYTES = 32 * 1024 * 1024;

async function requireAuthContext() {
  const jar = await cookies();
  const session = parseAuthSessionCookie(jar.get(AUTH_SESSION_COOKIE)?.value);
  const uid = parseAuthUserUidCookie(jar.get(AUTH_USER_UID_COOKIE)?.value);
  if (!session || !uid) return null;
  return { uid };
}

async function uploadToImgBb(file: File) {
  const apiKey = getImgBbServerApiKey();
  if (!apiKey) {
    throw new Error(
      "ImgBB nao configurado: defina IMGBB_API_KEY no .env.local (desenvolvimento) ou nas variaveis de ambiente do hospedeiro (producao). Veja web/.env.example.",
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const body = new FormData();
  body.set("image", base64);
  body.set("name", file.name || `pet-${Date.now()}`);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    body,
  });
  const payload = (await response.json().catch(() => null)) as
    | {
        success?: boolean;
        status?: number;
        error?: { message?: string };
        data?: {
          url?: string;
          delete_url?: string;
        };
      }
    | null;

  if (!response.ok || !payload?.success || !payload?.data?.url) {
    const hint =
      typeof payload?.error?.message === "string" && payload.error.message.trim()
        ? ` (${payload.error.message.trim()})`
        : "";
    throw new Error(`Falha ao enviar imagem para o ImgBB.${hint}`);
  }

  return {
    url: payload.data.url,
    deleteUrl: payload.data.delete_url ?? "",
  };
}

export async function POST(request: Request) {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const image = formData?.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Arquivo de imagem invalido" }, { status: 400 });
  }

  if (!image.type.startsWith("image/")) {
    return NextResponse.json({ error: "Apenas arquivos de imagem sao permitidos" }, { status: 400 });
  }
  if (image.size <= 0 || image.size > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json({ error: "Imagem deve ter ate 32MB" }, { status: 400 });
  }

  try {
    const uploaded = await uploadToImgBb(image);
    const { petRef } = await getOrCreateCurrentPet(auth.uid);
    await petRef.set(
      {
        image: uploaded.url,
        imageDeleteUrl: uploaded.deleteUrl,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    invalidateCurrentPetCache(auth.uid);

    return NextResponse.json({ ok: true, image: getPetImageOrDefault(uploaded.url) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar upload da imagem.";
    const status = message.includes("ImgBB nao configurado") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  const auth = await requireAuthContext();
  if (!auth) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const { petRef } = await getOrCreateCurrentPet(auth.uid);
  await petRef.set(
    {
      image: "",
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
  invalidateCurrentPetCache(auth.uid);

  return NextResponse.json({ ok: true, image: getPetImageOrDefault("") });
}
