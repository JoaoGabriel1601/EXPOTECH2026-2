// Verifica se os arquivos de lógica pura compartilhados entre a web (src/) e o
// app mobile (mobile/src/) continuam idênticos. Como o mobile usa um bundler
// próprio (Metro/Expo) que não resolve arquivos fora de mobile/, esses módulos
// são mantidos como cópias. Este script garante que as cópias não divirjam.
//
// Uso: npm run check:sync   (sai com código 1 se houver divergência)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Pares [web, mobile] que devem ser byte-a-byte idênticos.
const PAIRS = [
  ["src/constants/index.js", "mobile/src/constants/index.js"],
  ["src/utils/mockData.js", "mobile/src/utils/mockData.js"],
  ["src/ai/pureInference.js", "mobile/src/ai/pureInference.js"],
  ["src/ai/modelWeights.js", "mobile/src/ai/modelWeights.js"],
  ["src/ai/climateAI.js", "mobile/src/ai/climateAI.js"],
];

// Normaliza fins de linha para comparar a lógica, não CRLF vs LF.
const norm = (s) => s.replace(/\r\n/g, "\n");

let drift = 0;
for (const [web, mobile] of PAIRS) {
  const a = norm(readFileSync(join(ROOT, web), "utf-8"));
  const b = norm(readFileSync(join(ROOT, mobile), "utf-8"));
  if (a === b) {
    console.log(`  ok    ${web}  ==  ${mobile}`);
  } else {
    drift++;
    console.error(`  DRIFT ${web}  !=  ${mobile}`);
  }
}

if (drift > 0) {
  console.error(
    `\n${drift} arquivo(s) compartilhado(s) divergiram entre web e mobile. ` +
      `Sincronize as cópias antes de continuar.`
  );
  process.exit(1);
}
console.log("\nTodos os arquivos compartilhados estão sincronizados.");
