import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const MODEL_DIR = join(PROJECT_ROOT, "public", "ai-model");

function loadWeightsBin() {
  const buf = readFileSync(join(MODEL_DIR, "weights.bin"));
  const f32 = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return Array.from(f32);
}

function loadModelTopology() {
  const json = JSON.parse(readFileSync(join(MODEL_DIR, "model.json"), "utf-8"));
  return json.weightsManifest[0].weights;
}

function loadNormalization() {
  return JSON.parse(readFileSync(join(MODEL_DIR, "normalization.json"), "utf-8"));
}

function reshape(flat, shape) {
  if (shape.length === 1) return flat.slice(0, shape[0]);
  const [rows, cols] = shape;
  const out = [];
  for (let r = 0; r < rows; r++) {
    out.push(flat.slice(r * cols, (r + 1) * cols));
  }
  return out;
}

function exportWeights() {
  const flat = loadWeightsBin();
  const manifest = loadModelTopology();
  const norm = loadNormalization();

  const layers = {};
  let offset = 0;
  for (const w of manifest) {
    const size = w.shape.reduce((a, b) => a * b, 1);
    const slice = flat.slice(offset, offset + size);
    offset += size;
    const tensor = reshape(slice, w.shape);
    const [layerName, kind] = w.name.split("/");
    if (!layers[layerName]) layers[layerName] = {};
    layers[layerName][kind] = tensor;
  }

  const payload = {
    version: "1.0.0",
    architecture: [
      { name: "dense_Dense1", inputs: 3, units: 16, activation: "relu" },
      { name: "dense_Dense2", inputs: 16, units: 8, activation: "relu" },
      { name: "dense_Dense3", inputs: 8, units: 1, activation: "linear" },
    ],
    layers,
    normalization: norm,
  };

  const outPath = join(__dirname, "modelWeights.js");
  const content = `// Gerado automaticamente por exportWeights.js. Não edite à mão.
// Pesos extraídos do modelo treinado em public/ai-model/.

export const MODEL_WEIGHTS = ${JSON.stringify(payload, null, 2)};
`;
  writeFileSync(outPath, content);
  console.log(`Pesos exportados para ${outPath}`);
  console.log(
    `Camadas: ${Object.keys(layers).join(", ")} | Total floats: ${flat.length}`
  );
}

exportWeights();
