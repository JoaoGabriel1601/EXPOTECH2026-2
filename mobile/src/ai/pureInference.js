import { MODEL_WEIGHTS } from "./modelWeights.js";

function relu(x) {
  return x > 0 ? x : 0;
}

function denseForward(input, kernel, bias, activation) {
  const units = bias.length;
  const out = new Array(units);
  for (let j = 0; j < units; j++) {
    let sum = bias[j];
    for (let i = 0; i < input.length; i++) {
      sum += input[i] * kernel[i][j];
    }
    out[j] = activation === "relu" ? relu(sum) : sum;
  }
  return out;
}

function normalize(value, { min, max }) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function denormalize(value, { min, max }) {
  return value * (max - min) + min;
}

export function forwardPass(pessoas, tempInterna, tempExterna) {
  const { layers, architecture, normalization } = MODEL_WEIGHTS;
  const { stats, features, target } = normalization;
  const inputs = {
    pessoas,
    temp_interna: tempInterna,
    temp_externa: tempExterna,
  };

  let x = features.map((f) => normalize(inputs[f], stats[f]));
  for (const layer of architecture) {
    const w = layers[layer.name];
    x = denseForward(x, w.kernel, w.bias, layer.activation);
  }

  return denormalize(x[0], stats[target]);
}

export function getNormalization() {
  return MODEL_WEIGHTS.normalization;
}

export function getModelVersion() {
  return MODEL_WEIGHTS.version;
}
