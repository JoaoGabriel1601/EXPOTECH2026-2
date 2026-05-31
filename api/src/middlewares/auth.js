import { getFirebaseAuth } from "../config/firebase.js";

/**
 * Exige um ID token (JWT) válido do Firebase Authentication.
 *
 * O Admin SDK (`verifyIdToken`) valida assinatura, expiração, emissor (iss) e
 * audiência (aud) automaticamente. Em sucesso, popula `req.user` com uid/email.
 *
 * Mitiga OWASP API2:2023 (Broken Authentication). As rotas que escrevem estado
 * (PUT/PATCH/POST/DELETE) usam este middleware; as de leitura ficam públicas.
 */
export async function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return next(unauthorized("Token ausente. Envie 'Authorization: Bearer <id_token>'."));
  }

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(match[1]);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    return next();
  } catch (e) {
    if (e.status === 503) return next(e); // Firebase indisponível
    return next(unauthorized("Token inválido ou expirado."));
  }
}

function unauthorized(message) {
  const err = new Error(message);
  err.status = 401;
  err.code = "UNAUTHORIZED";
  // Boa prática: indicar o esquema esperado.
  err.headers = { "WWW-Authenticate": 'Bearer realm="ClimaControl API"' };
  return err;
}
