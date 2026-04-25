/**
 * Gera PNG com alpha a partir de JPEG (fundo escuro sólido).
 * Remove só o preto/cinza de fundo; preserva pelo escuro, sombras e interior do capacete
 * (usa croma: píxeis "coloridos" escuros mantêm opacidade total).
 * Uso: node scripts/transparency-about-mascot.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const source = path.join(projectRoot, "assets", "about-mascot-source.jpg");
const outPath = path.join(projectRoot, "public", "img", "about-app-mascot.png");

/** Só puro "fundo" — tudo o que for mais claro fica a ser tratado abaixo */
const PURE_DARK = 10;
/** Teto da banda de suavização para cinzas de anti-alias (fundo JPEG) */
const SOFT_MAX = 34;
/** Croma: se max - min excede isto, considera conteúdo (não mexe na opacidade além de opaco) */
const CHROMA_KEEPS_OPAQUE = 18;
/** Só aplica suavização em píxeis aprox. neutros (banda de compressão do fundo) */
const CHROMA_NEUTRAL = 10;

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {number} alpha 0–255
 */
function alphaForPixel(r, g, b) {
  const minv = Math.min(r, g, b);
  const maxv = Math.max(r, g, b);
  const chroma = maxv - minv;

  if (chroma >= CHROMA_KEEPS_OPAQUE) {
    return 255;
  }
  if (maxv <= PURE_DARK) {
    return 0;
  }
  if (maxv > SOFT_MAX) {
    return 255;
  }
  if (chroma > CHROMA_NEUTRAL) {
    return 255;
  }
  // Cinza: transição suave (só borda do fundo, não tira detalhe interno)
  const t = (maxv - PURE_DARK) / (SOFT_MAX - PURE_DARK);
  return Math.max(0, Math.min(255, Math.round(255 * t)));
}

async function main() {
  if (!fs.existsSync(source)) {
    console.error("Falta o ficheiro fonte:", source);
    process.exit(1);
  }
  const image = sharp(source);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error(`Canais inesperado: ${channels}, esperado 4 (RGBA)`);
  }
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < out.length; i += 4) {
    out[i + 3] = alphaForPixel(out[i], out[i + 1], out[i + 2]);
  }
  await sharp(Buffer.from(out), { raw: { width, height, channels: 4 } })
    // palette:true (ex.: com effort) quantiza o alpha e borda; truecolor+alpha suaviza a borda
    .png({ compressionLevel: 9, palette: false })
    .toFile(outPath);
  console.log("Gravado:", outPath, `${width}x${height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
