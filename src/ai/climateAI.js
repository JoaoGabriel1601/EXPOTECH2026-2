import {
  AI_MAX_TARGET_TEMP,
  AI_MODEL_VERSION,
  MIN_TARGET_TEMP,
  calcTargetTemp,
} from "../constants";
import { forwardPass, getModelVersion } from "./pureInference";

let lastError = null;
let lastPrediction = null;
let lastInputs = null;
let lastInferenceTimeMs = null;
let lastUsedFallback = false;

function weightsAvailable() {
  try {
    return Boolean(getModelVersion());
  } catch {
    return false;
  }
}

export async function initClimateAI() {
  return weightsAvailable();
}

export function isAIReady() {
  return weightsAvailable();
}

function clampTarget(value) {
  return Math.min(AI_MAX_TARGET_TEMP, Math.max(MIN_TARGET_TEMP, value));
}

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function predictTargetTemp(pessoas, tempInterna, tempExterna) {
  const inputsRecord = { pessoas, tempInterna, tempExterna };

  if (pessoas <= 0) {
    lastPrediction = 0;
    lastInputs = inputsRecord;
    lastInferenceTimeMs = 0;
    lastUsedFallback = false;
    return 0;
  }

  if (!weightsAvailable()) {
    lastUsedFallback = true;
    const fallback = calcTargetTemp(pessoas, tempExterna);
    lastPrediction = fallback;
    lastInputs = inputsRecord;
    return fallback;
  }

  const start = now();
  try {
    const raw = forwardPass(pessoas, tempInterna, tempExterna);
    const clamped = clampTarget(Math.round(raw));
    lastPrediction = clamped;
    lastInputs = inputsRecord;
    lastInferenceTimeMs = now() - start;
    lastUsedFallback = false;
    return clamped;
  } catch (err) {
    lastError = err;
    lastUsedFallback = true;
    const fallback = calcTargetTemp(pessoas, tempExterna);
    lastPrediction = fallback;
    lastInputs = inputsRecord;
    return fallback;
  }
}

export function getAIDiagnostics() {
  return {
    modelLoaded: weightsAvailable(),
    modelVersion: AI_MODEL_VERSION,
    lastPrediction,
    lastInputs,
    inferenceTimeMs: lastInferenceTimeMs,
    lastUsedFallback,
    lastError: lastError ? String(lastError.message ?? lastError) : null,
  };
}

export function ruleBasedTarget(pessoas, tempExterna) {
  return calcTargetTemp(pessoas, tempExterna);
}

export function disposeClimateAI() {
  lastError = null;
  lastPrediction = null;
  lastInputs = null;
  lastInferenceTimeMs = null;
  lastUsedFallback = false;
}

export function __resetForTests() {
  disposeClimateAI();
}
