/**
 * Encaixa fotos retrato atrás da moldura Dia das Mães (imagem com “buraco” preto).
 * Pixels escuros (~preto da moldura) tornam-se transparentes; decoração cobre por cima.
 *
 * Fotos típicas 768×1024 + moldura 682×1024: `cover` com âncora `north-west` recorta só a
 * lateral direita, priorizando o texto “MAMÃE…” à esquerda.
 *
 * Uso (a partir da pasta web):
 *   node scripts/compose-mothers-day-frame.mjs
 *
 * Variáveis opcionais:
 *   FRAME=caminho/moldura.ext
 *   PHOTOS_GLOB='/pasta/PHOTO*.png'   (prioritário quando definido)
 *   PHOTOS_DIR=/pasta                 (lista PHOTO-*.{jpg,jpeg,png})
 *   OUT=reldir/sob/web                (destino relativamente a web/, default public/img/mothers-day-composites)
 *   BLACK_MAX=12                      (0–255, quanto mais alto, mais “cinza-preto” vira transparente)
 */
import fs from "node:fs";
import { globSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "..");

const DEFAULT_FRAME = path.join(
  process.env.HOME ?? "",
  ".cursor/projects/Users-Cassio-Documents-Xcode-Projects-Lyka/assets/ChatGPT_Image_13_de_mai._de_2026__14_38_53-6d5b3482-c27f-4467-a2ca-ea46812ad140.png",
);

const FRAME = process.env.FRAME || DEFAULT_FRAME;
const OUT_DIR = path.resolve(webRoot, process.env.OUT || "public/img/mothers-day-composites");

/** RGB máximo tratado como buraco (JPEG perto do preto). */
const BLACK_MAX = Number(process.env.BLACK_MAX ?? "12");

async function jpegMaskToFrameRgba(framePath, blackMax) {
  const { data, info } = await sharp(framePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error("Esperado RGBA ao processar moldura.");
  const { width: w, height: h } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (Math.max(r, g, b) <= blackMax) {
      out[i + 3] = 0;
    } else {
      out[i + 3] = 255;
    }
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

function defaultPhotosDir() {
  return path.join(
    process.env.HOME ?? "",
    ".cursor/projects/Users-Cassio-Documents-Xcode-Projects-Lyka/assets",
  );
}

function collectPhotoPaths() {
  if (process.env.PHOTOS_GLOB?.trim()) {
    return [...new Set(globSync(process.env.PHOTOS_GLOB.trim()))].sort();
  }

  const dir = (process.env.PHOTOS_DIR || defaultPhotosDir()).trim();
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => /^PHOTO-/i.test(f) && /\.(jpe?g|png)$/i.test(f))
    .map((f) => path.join(dir, f))
    .sort();
}

async function composeOne(photoPath, frameOverlayPng, fw, fh) {
  const base = await sharp(photoPath).resize(fw, fh, { fit: "cover", position: "northwest" }).toBuffer();

  return sharp(base).composite([{ input: frameOverlayPng, top: 0, left: 0 }]).png({ compressionLevel: 9 }).toBuffer();
}

async function main() {
  if (!fs.existsSync(FRAME)) {
    console.error("Moldura não encontrada:", FRAME);
    console.error("Defina FRAME=/caminho/para/arquivo ou instale os assets neste caminho.");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const frameOverlayPng = await jpegMaskToFrameRgba(FRAME, BLACK_MAX);
  const meta = await sharp(FRAME).metadata();
  if (!meta.width || !meta.height) throw new Error("Metadados inválidos da moldura.");
  const { width: fw, height: fh } = meta;

  const photos = collectPhotoPaths();
  if (!photos.length) {
    console.error("Nenhuma foto. Use PHOTOS_GLOB='/pasta/PHOTO-*' ou PHOTOS_DIR com ficheiros PHOTO-*.jpg");
    process.exit(1);
  }

  console.log("Moldura:", FRAME, `${fw}×${fh}`, "| BLACK_MAX=", BLACK_MAX);
  console.log("Saída:", OUT_DIR);
  console.log("Fotos:", photos.length);

  for (const photoPath of photos) {
    const baseName = path.basename(photoPath, path.extname(photoPath)).replace(/\s+/g, "-");
    const outPath = path.join(OUT_DIR, `${baseName}-moldura-dia-maes.png`);
    const buf = await composeOne(photoPath, frameOverlayPng, fw, fh);
    fs.writeFileSync(outPath, buf);
    console.log(" ✓", outPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
