/**
 * Envolve uma Promise com um tempo limite. Se estourar, rejeita com um erro
 * 503 (DATABASE_TIMEOUT) — usado para não deixar a API "pendurada" quando a
 * dependência (Firebase) demora a responder.
 */
export function withTimeout(promise, ms = 5000, label = "operação") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Tempo de resposta excedido (${label}, ${ms}ms).`);
      err.status = 503;
      err.code = "DATABASE_TIMEOUT";
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
