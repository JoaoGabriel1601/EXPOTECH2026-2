/**
 * Middleware de validação baseado em schemas Zod.
 * Valida body / query / params e, em caso de erro, devolve 400 com a lista
 * de campos inválidos. O resultado já parseado substitui o original (com
 * defaults aplicados).
 *
 * Uso: router.patch("/", validate({ body: patchControleSchema }), controller)
 */
export function validate(schemas) {
  return (req, _res, next) => {
    try {
      for (const key of ["body", "query", "params"]) {
        if (schemas[key]) {
          const result = schemas[key].safeParse(req[key]);
          if (!result.success) {
            const err = new Error("Dados de entrada inválidos.");
            err.status = 400;
            err.code = "VALIDATION_ERROR";
            err.details = result.error.issues.map((i) => ({
              campo: i.path.join(".") || key,
              mensagem: i.message,
            }));
            return next(err);
          }
          // query/params são getters somente-leitura no Express 5; reatribui com cuidado.
          if (key === "body") req.body = result.data;
          else req.validated = { ...(req.validated || {}), [key]: result.data };
        }
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}
