import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATASET_SIZE = 5000;
const SEED = 42;

const MIN_TARGET_TEMP = 16;
const MAX_TARGET_TEMP = 28;

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(SEED);

function gaussian(mean = 0, sd = 1) {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function baseTempByPeople(people) {
  if (people <= 0) return 0;
  if (people <= 5) return 24;
  if (people <= 15) return 22;
  if (people <= 30) return 20;
  return 18;
}

function idealTarget(people, tempInt, tempExt) {
  if (people <= 0) return 0;

  let target = baseTempByPeople(people);

  if (tempExt > 35) target -= 2;
  else if (tempExt > 30) target -= 1;

  if (people > 10) {
    const extraBodies = people - 10;
    target -= Math.min(1.5, extraBodies * 0.05);
  }

  const drift = tempInt - target;
  if (drift > 3) target -= 1;
  else if (drift > 1.5) target -= 0.5;
  else if (drift < -2) target += 0.5;

  if (tempExt < 22 && people <= 5) target += 0.5;

  target += gaussian(0, 0.35);

  target = Math.round(target);
  return Math.min(MAX_TARGET_TEMP, Math.max(MIN_TARGET_TEMP, target));
}

function sampleScenario() {
  const r = rand();
  if (r < 0.08) return { peopleMin: 0, peopleMax: 0 };
  if (r < 0.35) return { peopleMin: 1, peopleMax: 5 };
  if (r < 0.65) return { peopleMin: 6, peopleMax: 15 };
  if (r < 0.88) return { peopleMin: 16, peopleMax: 30 };
  return { peopleMin: 31, peopleMax: 50 };
}

export function generateSamples(n = DATASET_SIZE) {
  const samples = [];
  for (let i = 0; i < n; i++) {
    const { peopleMin, peopleMax } = sampleScenario();
    const people = Math.floor(rand() * (peopleMax - peopleMin + 1)) + peopleMin;

    const tempExt = 15 + rand() * 30;
    const tempInt = 15 + rand() * 25;

    const target = idealTarget(people, tempInt, tempExt);

    samples.push({
      pessoas: people,
      temp_interna: Math.round(tempInt * 10) / 10,
      temp_externa: Math.round(tempExt * 10) / 10,
      temp_alvo_ideal: target,
    });
  }
  return samples;
}

export function datasetStats(samples) {
  const fields = ["pessoas", "temp_interna", "temp_externa", "temp_alvo_ideal"];
  const stats = {};
  for (const f of fields) {
    const values = samples.map((s) => s[f]);
    stats[f] = {
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }
  return stats;
}

const isMain = process.argv[1] && process.argv[1].endsWith("generateDataset.js");
if (isMain) {
  const samples = generateSamples();
  const stats = datasetStats(samples);
  const outDir = join(__dirname, "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "dataset.json");
  writeFileSync(outPath, JSON.stringify({ samples, stats }, null, 2));
  console.log(`Gerou ${samples.length} amostras em ${outPath}`);
  console.log("Estatísticas:", stats);
}
