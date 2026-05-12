import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as tf from "@tensorflow/tfjs-node";
import { generateSamples } from "./generateDataset.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_PATH = join(__dirname, "data", "dataset.json");
const OUT_DIR = join(PROJECT_ROOT, "public", "ai-model");

const FEATURES = ["pessoas", "temp_interna", "temp_externa"];
const TARGET = "temp_alvo_ideal";

const EPOCHS = 200;
const BATCH_SIZE = 64;
const VAL_SPLIT = 0.2;
const LEARNING_RATE = 0.005;

function loadDataset() {
  if (existsSync(DATA_PATH)) {
    const raw = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
    return raw.samples;
  }
  return generateSamples();
}

function computeMinMax(samples) {
  const stats = {};
  for (const field of [...FEATURES, TARGET]) {
    const values = samples.map((s) => s[field]);
    stats[field] = {
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
  return stats;
}

function normalize(value, { min, max }) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function toTensors(samples, stats) {
  const xs = samples.map((s) =>
    FEATURES.map((f) => normalize(s[f], stats[f]))
  );
  const ys = samples.map((s) => [normalize(s[TARGET], stats[TARGET])]);
  return {
    xs: tf.tensor2d(xs),
    ys: tf.tensor2d(ys),
  };
}

function buildModel() {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [FEATURES.length],
      units: 16,
      activation: "relu",
      kernelInitializer: "heNormal",
    })
  );
  model.add(
    tf.layers.dense({
      units: 8,
      activation: "relu",
      kernelInitializer: "heNormal",
    })
  );
  model.add(tf.layers.dense({ units: 1, activation: "linear" }));
  model.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: "meanSquaredError",
    metrics: ["mae"],
  });
  return model;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function saveArtifacts(model, stats) {
  mkdirSync(OUT_DIR, { recursive: true });
  const tmpUrl = `file://${OUT_DIR}`;
  await model.save(tmpUrl);

  const normalization = {
    features: FEATURES,
    target: TARGET,
    stats,
  };
  writeFileSync(
    join(OUT_DIR, "normalization.json"),
    JSON.stringify(normalization, null, 2)
  );
}

async function main() {
  console.log("Carregando dataset...");
  const samples = shuffle(loadDataset());
  console.log(`Total de amostras: ${samples.length}`);

  const stats = computeMinMax(samples);
  console.log("Min/Max por feature:", stats);

  const { xs, ys } = toTensors(samples, stats);
  const model = buildModel();
  model.summary();

  console.log(`\nTreinando por ${EPOCHS} epochs...`);
  const history = await model.fit(xs, ys, {
    epochs: EPOCHS,
    batchSize: BATCH_SIZE,
    validationSplit: VAL_SPLIT,
    shuffle: true,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 20 === 0 || epoch === EPOCHS - 1) {
          console.log(
            `  epoch ${String(epoch + 1).padStart(3)} — loss: ${logs.loss.toFixed(5)} val_loss: ${logs.val_loss.toFixed(5)} mae: ${logs.mae.toFixed(5)}`
          );
        }
      },
    },
  });

  const finalLoss = history.history.loss[history.history.loss.length - 1];
  const finalValLoss = history.history.val_loss[history.history.val_loss.length - 1];
  console.log(`\nLoss final: ${finalLoss.toFixed(5)} | Val loss final: ${finalValLoss.toFixed(5)}`);

  const sampleInputs = [
    { pessoas: 0, temp_interna: 25, temp_externa: 28 },
    { pessoas: 3, temp_interna: 26, temp_externa: 28 },
    { pessoas: 10, temp_interna: 27, temp_externa: 32 },
    { pessoas: 25, temp_interna: 28, temp_externa: 36 },
    { pessoas: 45, temp_interna: 30, temp_externa: 40 },
  ];
  console.log("\nSanidade (predições vs. regra ideal):");
  for (const inp of sampleInputs) {
    const normalized = FEATURES.map((f) => normalize(inp[f], stats[f]));
    const t = tf.tensor2d([normalized]);
    const out = model.predict(t);
    const normalizedOut = (await out.data())[0];
    const targetStats = stats[TARGET];
    const denorm = normalizedOut * (targetStats.max - targetStats.min) + targetStats.min;
    const clamped = Math.round(Math.min(28, Math.max(0, denorm)));
    console.log(
      `  pessoas=${inp.pessoas} ti=${inp.temp_interna} te=${inp.temp_externa} → IA=${clamped}°C (raw=${denorm.toFixed(2)})`
    );
    t.dispose();
    out.dispose();
  }

  console.log("\nSalvando modelo em", OUT_DIR);
  await saveArtifacts(model, stats);

  xs.dispose();
  ys.dispose();
  console.log("Concluído.");
}

const isMain = process.argv[1] && process.argv[1].endsWith("trainModel.js");
if (isMain) {
  main().catch((err) => {
    console.error("Erro no treino:", err);
    process.exit(1);
  });
}
