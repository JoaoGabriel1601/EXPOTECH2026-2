import sharp from "sharp";
import { readFile, access } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(__dirname, "..", "assets");
const PNG_SOURCE = resolve(ASSETS, "logo.png");
const SVG_SOURCE = resolve(ASSETS, "logo.svg");

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const BG_DARK = "#0a0e15";

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
    console.log(
      "  Dica: salve seu PNG original como assets/logo.png para fidelidade total.\n"
    );
    return { buffer: await readFile(SVG_SOURCE), isSvg: true };
  }
  throw new Error(
    "Nenhum logo encontrado em assets/logo.png nem assets/logo.svg"
  );
}

// Renderiza o logo em um quadrado de tamanho `inner`, centralizado em uma
// canvas de tamanho `canvas`, com o fundo solicitado.
async function paddedLogo({ buffer, sharpOpts, canvas, inner, background }) {
  const logo = await sharp(buffer, sharpOpts)
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  const { buffer, isSvg } = await loadSource();
  const sharpOpts = isSvg ? { density: 384 } : {};

  // icon.png — usado no iOS e em Androids antigos. Damos um respiro de ~12%
  // pra logo não encostar nas bordas após a máscara arredondada do iOS.
  await sharp(
    await paddedLogo({
      buffer,
      sharpOpts,
      canvas: 1024,
      inner: 900,
      background: BG_DARK,
    })
  ).toFile(resolve(ASSETS, "icon.png"));
  console.log("✓ icon.png (1024x1024, logo 900px)");

  // adaptive-icon.png — foreground do adaptive icon Android. O launcher mascara
  // com círculo/squircle e o safe zone é o anel interno (~66% do canvas, ou
  // ~676px num canvas 1024). Logo deve caber dentro com folga e o fundo precisa
  // ser TRANSPARENTE (a cor de fundo vem de app.json adaptiveIcon.backgroundColor).
  await sharp(
    await paddedLogo({
      buffer,
      sharpOpts,
      canvas: 1024,
      inner: 660,
      background: TRANSPARENT,
    })
  ).toFile(resolve(ASSETS, "adaptive-icon.png"));
  console.log(
    "✓ adaptive-icon.png (1024x1024, logo 660px no safe zone, fundo transparente)"
  );

  // favicon — pequeno, fundo escuro
  await sharp(
    await paddedLogo({
      buffer,
      sharpOpts,
      canvas: 48,
      inner: 44,
      background: BG_DARK,
    })
  ).toFile(resolve(ASSETS, "favicon.png"));
  console.log("✓ favicon.png (48x48)");

  // notification-icon — Android exige sólido branco com fundo transparente.
  // Aqui mantemos o logo colorido com fundo transparente; o Android pode
  // dessaturar, mas funciona como fallback.
  await sharp(
    await paddedLogo({
      buffer,
      sharpOpts,
      canvas: 96,
      inner: 80,
      background: TRANSPARENT,
    })
  ).toFile(resolve(ASSETS, "notification-icon.png"));
  console.log("✓ notification-icon.png (96x96)");

  // splash — logo centralizado num canvas portrait 1242×2436. Tamanho de
  // exibição final é controlado por expo-splash-screen.imageWidth no app.json.
  const splashLogo = await paddedLogo({
    buffer,
    sharpOpts,
    canvas: 720,
    inner: 600,
    background: TRANSPARENT,
  });
  await sharp({
    create: {
      width: 1242,
      height: 2436,
      channels: 4,
      background: BG_DARK,
    },
  })
    .composite([{ input: splashLogo, gravity: "center" }])
    .png()
    .toFile(resolve(ASSETS, "splash.png"));
  console.log("✓ splash.png (1242x2436)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
