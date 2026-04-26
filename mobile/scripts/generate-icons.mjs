import sharp from "sharp";
import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "..", "assets");
const PNG_SOURCE = resolve(ASSETS, "logo.png");
const SVG_SOURCE = resolve(ASSETS, "logo.svg");

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function loadSource() {
  if (await fileExists(PNG_SOURCE)) {
    console.log("→ usando assets/logo.png como fonte (recomendado)");
    return { buffer: await readFile(PNG_SOURCE), isSvg: false };
  }
  if (await fileExists(SVG_SOURCE)) {
    console.log("→ usando assets/logo.svg (placeholder vetorial)");
    console.log("  Dica: salve seu PNG original como assets/logo.png para fidelidade total.\n");
    return { buffer: await readFile(SVG_SOURCE), isSvg: true };
  }
  throw new Error("Nenhum logo encontrado em assets/logo.png nem assets/logo.svg");
}

const targets = [
  { name: "icon.png", size: 1024, background: "#0a0e15" },
  { name: "adaptive-icon.png", size: 1024, background: "#0a0e15" },
  { name: "favicon.png", size: 48, background: "#0a0e15" },
  { name: "notification-icon.png", size: 96, background: { r: 0, g: 0, b: 0, alpha: 0 } },
];

async function main() {
  const { buffer, isSvg } = await loadSource();
  const sharpOpts = isSvg ? { density: 384 } : {};

  for (const t of targets) {
    const out = resolve(ASSETS, t.name);
    await sharp(buffer, sharpOpts)
      .resize(t.size, t.size, { fit: "contain", background: t.background })
      .png()
      .toFile(out);
    console.log(`✓ ${t.name} (${t.size}x${t.size})`);
  }

  // Splash: same logo centered on a 1242x2436 dark canvas
  const splashOut = resolve(ASSETS, "splash.png");
  const logoSized = await sharp(buffer, sharpOpts)
    .resize(720, 720, { fit: "contain", background: { r: 10, g: 14, b: 21, alpha: 1 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 1242,
      height: 2436,
      channels: 4,
      background: "#0a0e15",
    },
  })
    .composite([{ input: logoSized, gravity: "center" }])
    .png()
    .toFile(splashOut);
  console.log("✓ splash.png (1242x2436)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
