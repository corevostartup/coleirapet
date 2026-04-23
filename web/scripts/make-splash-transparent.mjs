/**
 * Converte arte com fundo preto solto em PNG RGBA (flood-fill a partir das bordas).
 * Uso: node scripts/make-splash-transparent.mjs <entrada> <saida.png>
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const TH = 42;

function idx(x, y, w) {
  return (y * w + x) * 4;
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    console.error("Uso: node scripts/make-splash-transparent.mjs <entrada> <saida.png>");
    process.exit(1);
  }

  const buf = fs.readFileSync(input);
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = new Uint8Array(data);

  function darkAt(i) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    return r < TH && g < TH && b < TH;
  }

  const outside = new Uint8Array(w * h);
  const queue = [];

  function tryPush(x, y) {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const pi = y * w + x;
    if (outside[pi]) return;
    const i = idx(x, y, w);
    if (!darkAt(i)) return;
    outside[pi] = 1;
    queue.push(pi);
  }

  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  while (queue.length) {
    const pi = queue.pop();
    const x = pi % w;
    const y = Math.floor(pi / w);
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  for (let pi = 0; pi < w * h; pi++) {
    if (!outside[pi]) continue;
    const i = pi * 4;
    px[i + 3] = 0;
  }

  await sharp(px, { raw: { width: w, height: h, channels: 4 } }).png({ compressionLevel: 9 }).toFile(output);

  console.log("OK:", path.resolve(output), `${w}x${h}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
