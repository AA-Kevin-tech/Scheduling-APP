import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
const bg = "#0c4a6e";

async function makePng(size: number, filename: string) {
  const fontSize = Math.round(size * 0.42);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-weight="700" font-size="${fontSize}">P</text>
</svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(join(outDir, filename), buf);
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  await makePng(192, "icon-192.png");
  await makePng(512, "icon-512.png");
  await makePng(180, "apple-touch-icon.png");
  console.log("Wrote PWA icons to public/icons/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
